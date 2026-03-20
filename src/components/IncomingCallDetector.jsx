// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';

export default function IncomingCallDetector({ user }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [handledCallIds, setHandledCallIds] = useState(new Set());
  const acceptedCallIdRef = useRef(null); // Track which call was accepted to prevent signal deletion
  const ringAudioRef = useRef(null);
  const navigate = useNavigate();
  const userEmail = user?.email;

  // Create ring audio on mount
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.loop = true;
    audio.volume = 1.0;
    ringAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Play/stop ring based on dialog open state
  useEffect(() => {
    if (isOpen && ringAudioRef.current) {
      ringAudioRef.current.play().catch(() => {});
    } else if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current.currentTime = 0;
    }
  }, [isOpen]);

  console.log('[IncomingCallDetector] Rendering with userEmail:', userEmail);

  // Poll for incoming call signals
  const { data: incomingSignals = [] } = useQuery({
    queryKey: ['incomingCalls', userEmail],
    queryFn: async () => {
      console.log('📱 [IncomingCallDetector] Polling for incoming calls...');
      if (!userEmail) return [];
      try {
        const signals = await base44.entities.VideoSignal.filter({
          to_email: userEmail,
          signal_type: 'offer'
        });
        console.log(`   Found ${signals.length} offer signal(s)`);
        if (signals.length > 0) {
          console.log('   Signals:', signals.map(s => ({
            id: s.id.substring(0, 8),
            from: s.from_email,
            callId: s.call_id
          })));
        }
        return signals;
      } catch (error) {
        console.error('❌ [IncomingCallDetector] Error checking for incoming calls:', error);
        return [];
      }
    },
    enabled: !!userEmail,
    refetchInterval: 1000, // Check every second
  });

  useEffect(() => {
    console.log('📱 [IncomingCallDetector] Signal state changed');
    
    // Only show notification if there are new unhandled signals
    if (incomingSignals.length > 0 && !incomingCall) {
      const now = Date.now();
      const MAX_SIGNAL_AGE_MS = 60000; // 60 seconds - ignore stale offers

      // Get the most recent call that hasn't been handled yet and isn't stale
      const unhandledCalls = incomingSignals.filter(call => {
        if (handledCallIds.has(call.id)) return false;
        // Ignore stale signals older than 60 seconds to prevent ghost notifications
        const signalAge = now - new Date(call.created_date).getTime();
        if (signalAge > MAX_SIGNAL_AGE_MS) {
          console.log(`   🗑️ Ignoring stale signal (${Math.round(signalAge / 1000)}s old):`, call.id.substring(0, 8));
          // Clean up the stale signal from DB
          base44.entities.VideoSignal.delete(call.id).catch(() => {});
          return false;
        }
        return true;
      });
      
      console.log(`   Total signals: ${incomingSignals.length}, Unhandled: ${unhandledCalls.length}, Handled: ${handledCallIds.size}`);
      
      if (unhandledCalls.length > 0) {
        const latestCall = unhandledCalls[unhandledCalls.length - 1];
        
        console.log('📞 [IncomingCallDetector] NEW INCOMING CALL DETECTED!');
        console.log('   From:', latestCall.from_email);
        console.log('   Call ID:', latestCall.call_id);
        console.log('   Signal ID:', latestCall.id.substring(0, 8));
        setIncomingCall(latestCall);
        setIsOpen(true);
      }
    }
  }, [incomingSignals, incomingCall, handledCallIds]);

  const handleAcceptCall = async () => {
    if (incomingCall) {
      console.log('✅ [IncomingCallDetector] ACCEPT button clicked');
      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
      console.log('   From:', incomingCall.from_email);
      console.log('   Call ID:', incomingCall.call_id);
      console.log('   Navigating to VideoCall page...');

      // Save the offer SDP data before deleting the signal
      const offerSignalData = incomingCall.signal_data;

      // Mark call as accepted so handleDialogOpenChange knows NOT to delete the signal
      acceptedCallIdRef.current = incomingCall.id;
      // Mark this call as handled to prevent re-showing
      setHandledCallIds(prev => new Set([...prev, incomingCall.id]));

      // Delete the offer signal from DB immediately to prevent stale ghost notifications
      try {
        await base44.entities.VideoSignal.delete(incomingCall.id);
        console.log('   ✅ Offer signal deleted from DB');
      } catch (err) {
        console.log('   ⚠️ Could not delete offer signal:', err.message);
      }

      setIsOpen(false);
      // Navigate to video call page, passing offer SDP via location state
      navigate(`/VideoCall?user=${incomingCall.from_email}&callId=${incomingCall.call_id}&isReceiver=true`, {
        state: { offerSignalData }
      });
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      try {
        console.log('❌ [IncomingCallDetector] DECLINE button clicked');
        // Stop ring sound
        if (ringAudioRef.current) {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        }
        console.log('   From:', incomingCall.from_email);
        console.log('   Call ID:', incomingCall.call_id);
        console.log('   Signal ID:', incomingCall.id.substring(0, 8));
        // Mark this call as handled immediately to prevent re-showing
        setHandledCallIds(prev => new Set([...prev, incomingCall.id]));
        
        // Delete the offer signal to clean up
        try {
          console.log('   Deleting offer signal from DB...');
          await base44.entities.VideoSignal.delete(incomingCall.id);
          console.log('   ✅ Offer signal deleted');
        } catch (err) {
          console.log('   Signal already deleted or error:', err.message);
        }
        // Send decline signal
        console.log('   Sending decline signal...');
        await base44.entities.VideoSignal.create({
          call_id: incomingCall.call_id,
          from_email: userEmail,
          to_email: incomingCall.from_email,
          signal_type: 'decline',
          signal_data: JSON.stringify({})
        });
        console.log('   ✅ Decline signal sent');
      } catch (error) {
        console.error('❌ [IncomingCallDetector] Error declining call:', error);
      }
      setIncomingCall(null);
      setIsOpen(false);
    }
  };

  // Dialog close handler - don't delete signals here, only in handleDeclineCall
  const handleDialogOpenChange = async (open) => {
    if (!open && incomingCall) {
      console.log('🔔 [IncomingCallDetector] Dialog closed');
      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
      console.log('   Call from:', incomingCall.from_email);
      console.log('   Note: Signal will be deleted only if user explicitly declined');
      // Clear the accepted ref
      acceptedCallIdRef.current = null;
      setIncomingCall(null);
    }
    setIsOpen(open);
  };

  if (!userEmail || !incomingCall) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 z-[9999]">
        <AlertDialogTitle className="text-white flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-500 animate-pulse" />
          Incoming Video Call
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-300 text-base">
          {incomingCall.from_email} is calling you. Do you want to accept?
        </AlertDialogDescription>
        <div className="flex gap-4 justify-center mt-6">
          <AlertDialogCancel 
            onClick={handleDeclineCall}
            className="bg-red-600 hover:bg-red-700 text-white border-0 flex items-center justify-center gap-2 px-6 py-2 m-0"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleAcceptCall}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 px-6 py-2"
          >
            <Phone className="w-4 h-4" />
            Accept
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
