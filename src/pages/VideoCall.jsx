// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function VideoCall() {
  const [user, setUser] = useState(null);
  const [otherUserEmail, setOtherUserEmail] = useState(null);
  const [callId, setCallId] = useState(null);
  const [isReceiver, setIsReceiver] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, calling, connecting, connected, ended
  const [backUrl, setBackUrl] = useState(createPageUrl('Home'));
  const [peerConnectionReady, setPeerConnectionReady] = useState(false); // Track if peer connection is fully set up

  const location = useLocation();
  const offerFromStateRef = useRef(location.state?.offerSignalData || null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null); // Persist remote stream for reconnection
  const ringingAudioRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]); // Queue ICE candidates until remote description is set
  const remoteDescriptionSetRef = useRef(false); // Track if remote description has been set
  const processedSignalsRef = useRef(new Set()); // Track processed signal IDs to avoid duplicates
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const callIdParam = params.get('callId');
    const isReceiverParam = params.get('isReceiver');
    const fromParam = params.get('from');
    
    setOtherUserEmail(userParam);
    setIsReceiver(isReceiverParam === 'true');
    
    // If callId is provided (receiver accepting a call), use it
    // Otherwise, generate a new one (caller initiating a call)
    if (callIdParam) {
      setCallId(callIdParam);
    } else {
      setCallId(`call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
    
    // Set back URL based on where the call was initiated
    if (fromParam === 'onlinemembers') {
      setBackUrl(createPageUrl('OnlineMembers'));
    } else {
      setBackUrl(createPageUrl('Home'));
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: otherProfile } = useQuery({
    queryKey: ['otherProfile', otherUserEmail],
    queryFn: async () => {
      if (!otherUserEmail) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: otherUserEmail });
      return profiles[0] || null;
    },
    enabled: !!otherUserEmail
  });

  // Poll for signals
  const { data: signals = [] } = useQuery({
    queryKey: ['videoSignals', callId, user?.email],
    queryFn: async () => {
      if (!callId || !user?.email) return [];
      try {
        const allSignals = await base44.entities.VideoSignal.filter({
          to_email: user.email,
          call_id: callId
        }, '-created_date');
        if (allSignals.length > 0) {
          console.log(`📨 [VideoCall] Signal polling found ${allSignals.length} signal(s):`, allSignals.map(s => ({
            id: s.id.substring(0, 8),
            type: s.signal_type,
            from: s.from_email
          })));
        }
        return allSignals;
      } catch (err) {
        console.error('❌ [VideoCall] Error polling for signals:', err);
        return [];
      }
    },
    enabled: !!callId && !!user?.email && callStatus !== 'ended',
    refetchInterval: 1000
  });

  const sendSignalMutation = useMutation({
    mutationFn: async ({ signal_type, signal_data }) => {
      return base44.entities.VideoSignal.create({
        from_email: user.email,
        to_email: otherUserEmail,
        signal_type,
        signal_data: JSON.stringify(signal_data),
        call_id: callId
      });
    }
  });

  const deleteSignalMutation = useMutation({
    mutationFn: async (signalId) => {
      return base44.entities.VideoSignal.delete(signalId);
    }
  });

  // Initialize WebRTC
  useEffect(() => {
    if (!user?.email || !otherUserEmail || !callId) return;

    const initWebRTC = async () => {
      try {
        console.log('🎥 [VideoCall] WebRTC Initialization Starting');
        console.log('   User:', user.email);
        console.log('   Other User:', otherUserEmail);
        console.log('   Call ID:', callId);
        console.log('   Is Receiver:', isReceiver);
        console.log('   Role:', isReceiver ? '📞 RECEIVER' : '☎️ CALLER');

        // Check if browser supports WebRTC
        if (!window.RTCPeerConnection) {
          throw new Error('WebRTC not supported in this browser');
        }

        // Get user media
        console.log('🎤 [VideoCall] Requesting camera/microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('✅ [VideoCall] Camera/Microphone access granted');
        console.log('   Video tracks:', stream.getVideoTracks().length);
        console.log('   Audio tracks:', stream.getAudioTracks().length);

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        console.log('🔗 [VideoCall] Creating RTCPeerConnection...');
        const config = {
          iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }]

        };
        const pc = new RTCPeerConnection(config);
        peerConnectionRef.current = pc;
        console.log('✅ [VideoCall] RTCPeerConnection created');

        // Add local stream tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
          console.log(`   Added ${track.kind} track to peer connection`);
        });

        // Monitor connection state changes
        pc.onconnectionstatechange = () => {
          console.log('🔄 [VideoCall] Connection State Changed:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setIsConnecting(false);
            setCallStatus('connected');
            console.log('✅ [VideoCall] Call Status: CONNECTED (via connectionstatechange)');
            // Stop ringing sound when connected
            if (ringingAudioRef.current) {
              ringingAudioRef.current.pause();
              ringingAudioRef.current.currentTime = 0;
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.log('❌ [VideoCall] Connection failed or disconnected');
            toast.error('Connection failed. Please try again.');
            setCallStatus('ended');
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log('❄️ [VideoCall] ICE Connection State Changed:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnecting(false);
            setCallStatus('connected');
            console.log('✅ [VideoCall] Call Status: CONNECTED (via ICE)');
            // Stop ringing sound when connected
            if (ringingAudioRef.current) {
              ringingAudioRef.current.pause();
              ringingAudioRef.current.currentTime = 0;
            }
          } else if (pc.iceConnectionState === 'failed') {
            console.log('❌ [VideoCall] ICE Connection failed');
            toast.error('Connection failed. Network issue detected.');
            setCallStatus('ended');
          }
        };

        pc.onsignalingstatechange = () => {
          console.log('📡 [VideoCall] Signaling State Changed:', pc.signalingState);
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log('📹 [VideoCall] Remote track received!');
          console.log('   Track kind:', event.track.kind);
          console.log('   Streams count:', event.streams.length);
          
          if (event.streams[0]) {
            // Always save remote stream to ref for reconnection
            remoteStreamRef.current = event.streams[0];
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            setIsConnecting(false);
            setCallStatus('connected');
            console.log('✅ [VideoCall] Call Status: CONNECTED');
            
            // Stop ringing sound when connected
            if (ringingAudioRef.current) {
              ringingAudioRef.current.pause();
              ringingAudioRef.current.currentTime = 0;
            }
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('❄️ [VideoCall] ICE Candidate gathered:', {
              protocol: event.candidate.protocol,
              address: event.candidate.candidate.split(' ')[4],
              priority: event.candidate.priority
            });
            sendSignalMutation.mutate({
              signal_type: 'ice-candidate',
              signal_data: event.candidate
            });
          } else {
            console.log('❄️ [VideoCall] ICE Candidate gathering completed');
          }
        };

        // Only create and send offer if this is the CALLER
        // If this is a RECEIVER, they will receive the offer and send an answer
        if (!isReceiver) {
          console.log('☎️ [VideoCall] CALLER MODE: Creating and sending OFFER...');
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('📤 [VideoCall] Sending OFFER signal', {
              callId: callId,
              type: 'offer',
              sdpLength: offer.sdp.length
            });
            await sendSignalMutation.mutateAsync({
              signal_type: 'offer',
              signal_data: offer
            });
            console.log('✅ [VideoCall] OFFER signal successfully sent to database');

            setCallStatus('calling');
            setIsConnecting(false);
            console.log('☎️ [VideoCall] Call Status: CALLING (waiting for answer)');
          } catch (err) {
            console.error('❌ [VideoCall] ERROR creating/sending OFFER:', err);
            console.error('   Error message:', err.message);
            console.error('   Error stack:', err.stack);
            setCallStatus('ended');
          }
          
          // Play ringing sound only for caller
          if (ringingAudioRef.current) {
            ringingAudioRef.current.play().catch(err => console.log('Audio play failed:', err));
          }
        } else {
          // Receiver mode
          if (offerFromStateRef.current) {
            // Process offer immediately from state (passed by IncomingCallDetector)
            console.log('📞 [VideoCall] RECEIVER MODE: Processing offer from state...');
            try {
              const offerData = JSON.parse(offerFromStateRef.current);
              await pc.setRemoteDescription(new RTCSessionDescription(offerData));
              remoteDescriptionSetRef.current = true;
              console.log('   ✅ Remote description set from state offer');

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log('   📤 Sending ANSWER signal');
              await sendSignalMutation.mutateAsync({
                signal_type: 'answer',
                signal_data: answer
              });
              console.log('   ✅ ANSWER sent successfully');
              setCallStatus('connecting');
              setIsConnecting(true);
            } catch (err) {
              console.error('❌ [VideoCall] Error processing offer from state:', err);
              // Fall back to waiting for signal polling
              setIsConnecting(true);
              setCallStatus('connecting');
            }
          } else {
            // No offer in state, wait for signal polling
            console.log('📞 [VideoCall] RECEIVER MODE: Waiting for incoming OFFER...');
            setIsConnecting(true);
            setCallStatus('connecting');
          }
          // Play ringing sound for receiver while connecting
          if (ringingAudioRef.current) {
            ringingAudioRef.current.play().catch(err => console.log('Audio play failed:', err));
          }
        }
        
        // Mark peer connection as ready for signal processing
        setPeerConnectionReady(true);
        console.log('✅ [VideoCall] Peer connection setup complete, ready for signals');
      } catch (error) {
        console.error('❌ [VideoCall] Error initializing WebRTC:', error);
        const errorMsg = error?.message || 'Failed to access camera/microphone';
        console.error('   Error Details:', errorMsg);
        toast.error(errorMsg);
        setCallStatus('ended');
      }
    };

    // Reset refs for new call
    remoteDescriptionSetRef.current = false;
    pendingIceCandidatesRef.current = [];
    processedSignalsRef.current = new Set();
    
    initWebRTC();

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Clean up ALL signals for this call from the database (fire and forget)
      if (callId) {
        base44.entities.VideoSignal.filter({ call_id: callId })
          .then(signals => {
            signals.forEach(signal => {
              base44.entities.VideoSignal.delete(signal.id).catch(() => {});
            });
          })
          .catch(() => {});
      }
      // Reset refs and state on cleanup
      remoteDescriptionSetRef.current = false;
      pendingIceCandidatesRef.current = [];
      processedSignalsRef.current = new Set();
      remoteStreamRef.current = null;
      setPeerConnectionReady(false);
    };
  }, [user?.email, otherUserEmail, callId]);

  // Reconnect streams to video elements when video elements become available
  // (handles race condition where getUserMedia/ontrack fire before otherProfile loads and video elements render)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [otherProfile]);

  // Handle incoming signals
  useEffect(() => {
    console.log(`📊 [VideoCall] Signal handling effect triggered`, {
      signalsLength: signals.length,
      hasPeerConnection: !!peerConnectionRef.current,
      peerConnectionReady: peerConnectionReady,
      callStatus: callStatus
    });
    
    // Wait for peer connection to be fully initialized
    if (!signals.length || !peerConnectionRef.current || !peerConnectionReady) {
      if (signals.length === 0) {
        console.log('   ⏳ Waiting for signals... (0 signals found)');
      } else if (!peerConnectionReady) {
        console.log('   ⏳ Peer connection not ready yet, waiting...');
      }
      return;
    }

    console.log(`📨 [VideoCall] Received ${signals.length} signal(s)`, signals.map(s => ({
      id: s.id.substring(0, 8),
      type: s.signal_type,
      from: s.from_email,
      to: s.to_email,
      callId: s.call_id
    })));

    const processSignals = async () => {
      // Sort signals to process offer/answer first, then ICE candidates
      const sortedSignals = [...signals].sort((a, b) => {
        const priority = { 'offer': 0, 'answer': 1, 'ice-candidate': 2, 'end-call': 3, 'decline': 3 };
        return (priority[a.signal_type] || 99) - (priority[b.signal_type] || 99);
      });
      
      for (const signal of sortedSignals) {
        // Skip already processed signals
        if (processedSignalsRef.current.has(signal.id)) {
          console.log(`   ⏭️ Skipping already processed signal: ${signal.id.substring(0, 8)}`);
          continue;
        }
        
        // Mark signal as being processed
        processedSignalsRef.current.add(signal.id);
        
        try {
          const data = JSON.parse(signal.signal_data);

          if (signal.signal_type === 'answer') {
            console.log('📥 [VideoCall] ANSWER received from peer');
            console.log('   Setting remote description...');
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
            remoteDescriptionSetRef.current = true;
            console.log('   ✅ Remote description set');
            
            // Process any pending ICE candidates
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`   🧊 Processing ${pendingIceCandidatesRef.current.length} queued ICE candidates...`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log('   ✅ Queued ICE Candidate added');
                } catch (iceErr) {
                  console.log('   ⚠️ Failed to add queued ICE candidate:', iceErr.message);
                }
              }
              pendingIceCandidatesRef.current = [];
            }
            
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
              console.log('   ✅ Signal deleted from DB');
            } catch (deleteErr) {
              console.log('   ⚠️ Could not delete signal (may already be deleted):', deleteErr.message);
            }
          } else if (signal.signal_type === 'offer') {
            // Skip if we've already set remote description (we've already processed an offer)
            if (remoteDescriptionSetRef.current) {
              console.log('📥 [VideoCall] OFFER received but remote description already set - skipping');
              try {
                await deleteSignalMutation.mutateAsync(signal.id);
              } catch (deleteErr) {
                console.log('   ⚠️ Could not delete signal:', deleteErr.message);
              }
              continue;
            }
            
            console.log('📥 [VideoCall] OFFER received from peer');
            console.log('   Current signaling state:', peerConnectionRef.current.signalingState);
            console.log('   Setting remote description...');
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
            remoteDescriptionSetRef.current = true;
            console.log('   ✅ Remote description set');
            console.log('   New signaling state:', peerConnectionRef.current.signalingState);
            
            // Process any pending ICE candidates BEFORE creating answer
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`   🧊 Processing ${pendingIceCandidatesRef.current.length} queued ICE candidates...`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log('   ✅ Queued ICE Candidate added');
                } catch (iceErr) {
                  console.log('   ⚠️ Failed to add queued ICE candidate:', iceErr.message);
                }
              }
              pendingIceCandidatesRef.current = [];
            }
            
            console.log('   Creating ANSWER...');
            try {
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              console.log('   📤 Sending ANSWER signal');
              await sendSignalMutation.mutateAsync({
                signal_type: 'answer',
                signal_data: answer
              });
              console.log('   ✅ ANSWER sent successfully');
            } catch (answerErr) {
              console.error('   ❌ ERROR creating/sending ANSWER:', answerErr);
              console.error('      Error message:', answerErr.message);
              console.error('      Error stack:', answerErr.stack);
            }
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
              console.log('   ✅ Signal deleted from DB');
            } catch (deleteErr) {
              console.log('   ⚠️ Could not delete signal (may already be deleted):', deleteErr.message);
            }
          } else if (signal.signal_type === 'ice-candidate') {
            // Queue ICE candidates if remote description not yet set
            if (!remoteDescriptionSetRef.current) {
              console.log('❄️ [VideoCall] ICE Candidate received (QUEUED - waiting for remote description)', {
                protocol: data.protocol,
                address: data.candidate?.split(' ')[4] || 'unknown'
              });
              pendingIceCandidatesRef.current.push(data);
              // Still delete from DB to prevent re-processing
              try {
                await deleteSignalMutation.mutateAsync(signal.id);
              } catch (deleteErr) {
                console.log('   ⚠️ Could not delete signal:', deleteErr.message);
              }
              continue;
            }
            
            console.log('❄️ [VideoCall] ICE Candidate received', {
              protocol: data.protocol,
              address: data.candidate?.split(' ')[4] || 'unknown'
            });
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data));
              console.log('   ✅ ICE Candidate added');
            } catch (iceErr) {
              console.log('   ⚠️ Failed to add ICE candidate:', iceErr.message);
            }
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch (deleteErr) {
              console.log('   ⚠️ Could not delete signal:', deleteErr.message);
            }
          } else if (signal.signal_type === 'end-call') {
            console.log('🔴 [VideoCall] END-CALL signal received');
            setCallStatus('ended');
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch (deleteErr) {
              console.log('   ⚠️ Could not delete signal:', deleteErr.message);
            }
          } else if (signal.signal_type === 'decline') {
            console.log('❌ [VideoCall] DECLINE signal received');
            toast.error('Call declined');
            setCallStatus('ended');
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch (deleteErr) {
              console.log('   ⚠️ Could not delete signal:', deleteErr.message);
            }
          }
        } catch (error) {
          console.error('❌ [VideoCall] Error processing signal:', error);
          console.error('   Signal details:', {
            type: signal.signal_type,
            from: signal.from_email,
            callId: signal.call_id
          });
        }
      }
    };

    processSignals();
  }, [signals, peerConnectionReady]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`🎥 [VideoCall] Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 [VideoCall] Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const endCall = async () => {
    console.log('📞 [VideoCall] Ending call...');
    await sendSignalMutation.mutateAsync({
      signal_type: 'end-call',
      signal_data: {}
    });
    console.log('📤 [VideoCall] END-CALL signal sent');
    setCallStatus('ended');
    
    // Stop ringing sound
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }
    
    // Comprehensive cleanup: Delete ALL signals for this call to prevent stale notifications
    try {
      const allCallSignals = await base44.entities.VideoSignal.filter({
        call_id: callId
      });
      console.log(`🧹 [VideoCall] Cleaning up ${allCallSignals.length} signal(s) for call ${callId}`);
      for (const signal of allCallSignals) {
        try {
          await base44.entities.VideoSignal.delete(signal.id);
        } catch (err) {
          console.log('Failed to delete signal:', err.message);
        }
      }
    } catch (err) {
      console.log('Error cleaning up call signals:', err.message);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  if (!user || !otherProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Ringing Sound */}
      <audio ref={ringingAudioRef} loop>
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>
      
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={backUrl}>
              <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-slate-700">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <img
                src={otherProfile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                alt={otherProfile.display_name}
                className="w-10 h-10 rounded-full border-2 border-violet-400" />

              <div>
                <h2 className="text-white font-semibold">{otherProfile.display_name}</h2>
                <p className="text-xs text-slate-400">
                  {callStatus === 'initializing' && 'Initializing...'}
                  {callStatus === 'calling' && 'Calling...'}
                  {callStatus === 'connected' && 'Connected'}
                  {callStatus === 'ended' && 'Call Ended'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Video Container */}
      <main className="flex-1 relative overflow-hidden">
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover" />


        {/* Connection Status Overlay */}
        {isConnecting &&
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Connecting...</p>
            </div>
          </div>
        }

        {/* Call Ended Overlay */}
        {callStatus === 'ended' &&
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <PhoneOff className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">Call Ended</h3>
              <Link to={backUrl}>
                <Button className="bg-purple-700 text-[#ffffff] mt-4 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-violet-700">
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        }

        {/* Local Video (Picture-in-Picture) */}
        <motion.div
          className="absolute top-4 right-4 w-32 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover" />

          {!isVideoEnabled &&
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white" />
            </div>
          }
        </motion.div>

        {/* Controls */}
        {callStatus !== 'ended' &&
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <motion.div
            className="bg-slate-800/90 backdrop-blur-lg rounded-full p-4 flex items-center gap-4 shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}>

              <Button
              size="icon"
              onClick={toggleAudio}
              className={`rounded-full w-14 h-14 ${
              isAudioEnabled ?
              'bg-slate-700 hover:bg-slate-600' :
              'bg-red-500 hover:bg-red-600'}`
              }>

                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
              size="icon"
              onClick={endCall}
              className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600">

                <PhoneOff className="w-6 h-6" />
              </Button>

              <Button
              size="icon"
              onClick={toggleVideo}
              className={`rounded-full w-14 h-14 ${
              isVideoEnabled ?
              'bg-slate-700 hover:bg-slate-600' :
              'bg-red-500 hover:bg-red-600'}`
              }>

                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
            </motion.div>
          </div>
        }
      </main>
    </div>);

}