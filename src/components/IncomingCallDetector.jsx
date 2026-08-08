// @ts-nocheck
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { subscribeToVideoSignals, useVideoSignalSocketConnected } from '@/lib/videoSignalSocket';

export default function IncomingCallDetector({ user, isCallActive = false }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [handledCallIds, setHandledCallIds] = useState(new Set());
  const [pushedSignals, setPushedSignals] = useState([]);
  const acceptedCallIdRef = useRef(null); // Track which call was accepted to prevent signal deletion
  const ringAudioRef = useRef(null);
  const navigate = useNavigate();
  const socketConnected = useVideoSignalSocketConnected();

  // When navigating to VideoCall page, close any open dialog so it doesn't show on top of the call UI
  useEffect(() => {
    if (isCallActive && isOpen) {
      setIsOpen(false);
      setIncomingCall(null);
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    }
  }, [isCallActive]);
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

  // Poll for incoming call signals
  const { data: incomingSignals = [] } = useQuery({
    queryKey: ['incomingCalls', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      try {
        const signals = await base44.entities.VideoSignal.filter({
          to_email: userEmail,
          signal_type: 'offer'
        });
        return signals;
      } catch (error) {
        console.error('❌ [IncomingCallDetector] Error checking for incoming calls:', error);
        return [];
      }
    },
    // Paused while a call is already active (VideoCall.jsx runs its own
    // poll for the current call) or while the WS socket is connected — the
    // socket delivers offers instantly (see subscribeToVideoSignals below),
    // so this poll becomes a fallback for whenever it isn't connected
    // rather than the primary mechanism.
    enabled: !!userEmail && !isCallActive && !socketConnected,
    refetchInterval: 1000, // Check every second
  });

  // Real-time push path — see src/lib/videoSignalSocket.js. Feeds the exact
  // same detection effect below as the REST poll; only the source differs.
  useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = subscribeToVideoSignals((msg) => {
      const signal = msg?.type === 'video_signal' ? msg.signal : null;
      if (!signal || signal.signal_type !== 'offer' || signal.to_email !== userEmail) return;
      setPushedSignals(prev => prev.some(s => s.id === signal.id) ? prev : [...prev, signal]);
    });
    return unsubscribe;
  }, [userEmail]);

  // Memoized so this only changes reference when its actual contents
  // change — an inline array literal here would give the effect below a
  // "new" array on every render and re-run it constantly.
  const allSignals = useMemo(() => {
    if (!incomingSignals.length && !pushedSignals.length) return incomingSignals;
    return [...incomingSignals, ...pushedSignals.filter(p => !incomingSignals.some(s => s.id === p.id))];
  }, [incomingSignals, pushedSignals]);

  useEffect(() => {
    // Only show notification if there are new unhandled signals
    if (allSignals.length > 0 && !incomingCall) {
      const now = Date.now();
      const MAX_SIGNAL_AGE_MS = 60000; // 60 seconds - ignore stale offers

      // Get the most recent call that hasn't been handled yet and isn't stale
      const unhandledCalls = allSignals.filter(call => {
        if (handledCallIds.has(call.id)) return false;
        // Ignore stale signals older than 60 seconds to prevent ghost notifications
        const signalAge = now - new Date(call.created_date).getTime();
        if (signalAge > MAX_SIGNAL_AGE_MS) {
          // Clean up the stale signal from DB
          base44.entities.VideoSignal.delete(call.id).catch(() => {});
          return false;
        }
        return true;
      });

      if (unhandledCalls.length > 0) {
        const latestCall = unhandledCalls[unhandledCalls.length - 1];

        // Don't open the dialog if the user is already on an active call
        if (isCallActive) {
          return;
        }
        setIncomingCall(latestCall);
        setIsOpen(true);
      }
    }
  }, [allSignals, incomingCall, handledCallIds]);

  const handleAcceptCall = async () => {
    if (incomingCall) {
      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }

      // Save the offer SDP data before deleting the signal
      const offerSignalData = incomingCall.signal_data;

      // Mark call as accepted so handleDialogOpenChange knows NOT to delete the signal
      acceptedCallIdRef.current = incomingCall.id;
      // Mark this call as handled to prevent re-showing
      setHandledCallIds(prev => new Set([...prev, incomingCall.id]));

      // Delete the offer signal from DB immediately to prevent stale ghost notifications
      try {
        await base44.entities.VideoSignal.delete(incomingCall.id);
      } catch {
        // Already deleted — fine.
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
        // Stop ring sound
        if (ringAudioRef.current) {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        }
        // Mark this call as handled immediately to prevent re-showing
        setHandledCallIds(prev => new Set([...prev, incomingCall.id]));

        // Delete the offer signal to clean up
        try {
          await base44.entities.VideoSignal.delete(incomingCall.id);
        } catch {
          // Already deleted — fine.
        }
        // Send decline signal
        await base44.entities.VideoSignal.create({
          call_id: incomingCall.call_id,
          from_email: userEmail,
          to_email: incomingCall.from_email,
          signal_type: 'decline',
          signal_data: JSON.stringify({})
        });
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
      // Stop ring sound
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
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
