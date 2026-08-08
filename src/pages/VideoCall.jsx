// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { subscribeToVideoSignals, useVideoSignalSocketConnected } from '@/lib/videoSignalSocket';
import { getApiBaseUrl } from '@/lib/apiUrl';

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function VideoCall() {
  const [user, setUser] = useState(null);
  const [otherUserEmail, setOtherUserEmail] = useState(null);
  const [callId, setCallId] = useState(null);
  const [isReceiver, setIsReceiver] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState('user');
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, calling, connecting, connected, ended
  const [backUrl, setBackUrl] = useState(createPageUrl('Home'));
  const [peerConnectionReady, setPeerConnectionReady] = useState(false); // Track if peer connection is fully set up

  const location = useLocation();
  const navigate = useNavigate();
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
    const returnToParam = params.get('returnTo');
    const backToParam = params.get('backTo');

    setOtherUserEmail(userParam);
    setIsReceiver(isReceiverParam === 'true');

    const resolveProfileReturnUrl = (rawValue) => {
      if (!rawValue) return null;
      try {
        const decodedValue = decodeURIComponent(rawValue);
        return decodedValue.startsWith('/Profile') ? decodedValue : null;
      } catch {
        return null;
      }
    };

    // If callId is provided (receiver accepting a call), use it
    // Otherwise, generate a new one (caller initiating a call)
    if (callIdParam) {
      setCallId(callIdParam);
    } else {
      setCallId(`call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }

    // Set back URL based on where the call was initiated
    // returnTo = the Profile URL — always go back to Profile after video verify
    const profileReturnUrl = resolveProfileReturnUrl(returnToParam);
    if (fromParam === 'profile' && profileReturnUrl) {
      setBackUrl(profileReturnUrl);
    } else if (fromParam === 'onlinemembers') {
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

  const socketConnected = useVideoSignalSocketConnected();

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
        return allSignals;
      } catch (err) {
        console.error('❌ [VideoCall] Error polling for signals:', err);
        return [];
      }
    },
    // Falls back to polling only while the real-time socket isn't
    // connected — see the WS subscription and socketConnected below.
    enabled: !!callId && !!user?.email && callStatus !== 'ended' && !socketConnected,
    refetchInterval: 1000
  });

  // Real-time push path — see src/lib/videoSignalSocket.js. Every signal
  // type for this call (offer/answer/ice-candidate/end-call/decline) can
  // arrive this way; the processing effect below treats it identically to
  // a polled signal.
  const [pushedSignals, setPushedSignals] = useState([]);
  useEffect(() => {
    if (!callId || !user?.email) return;
    const unsubscribe = subscribeToVideoSignals((msg) => {
      const signal = msg?.type === 'video_signal' ? msg.signal : null;
      if (!signal || signal.call_id !== callId || signal.to_email !== user.email) return;
      setPushedSignals(prev => prev.some(s => s.id === signal.id) ? prev : [...prev, signal]);
    });
    return unsubscribe;
  }, [callId, user?.email]);

  // Memoized so polled + pushed signals only produce a new array reference
  // when their actual contents change (an inline literal here would re-run
  // the processing effect below on every render).
  const combinedSignals = useMemo(() => {
    if (!signals.length && !pushedSignals.length) return signals;
    return [...signals, ...pushedSignals.filter(p => !signals.some(s => s.id === p.id))];
  }, [signals, pushedSignals]);

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
        // Check if browser supports WebRTC
        if (!window.RTCPeerConnection) {
          throw new Error('WebRTC not supported in this browser');
        }

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: cameraFacingMode } },
          audio: true
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];

        // TURN relay for restrictive/carrier NATs where STUN alone can't
        // connect — short-lived credentials fetched fresh per call rather
        // than a static one baked into this bundle. If unreachable, the
        // call still proceeds STUN-only exactly as it did before this.
        try {
          const turnRes = await fetch(`${API_BASE_URL}/turn-credentials`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          const turnData = await turnRes.json();
          if (Array.isArray(turnData?.urls) && turnData.urls.length > 0) {
            iceServers.push({ urls: turnData.urls, username: turnData.username, credential: turnData.credential });
          }
        } catch (turnErr) {
          console.warn('⚠️ [VideoCall] TURN credentials unavailable, continuing STUN-only:', turnErr.message);
        }

        const config = { iceServers };
        const pc = new RTCPeerConnection(config);
        peerConnectionRef.current = pc;

        // Add local stream tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Monitor connection state changes
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setIsConnecting(false);
            setCallStatus('connected');
            // Stop ringing sound when connected
            if (ringingAudioRef.current) {
              ringingAudioRef.current.pause();
              ringingAudioRef.current.currentTime = 0;
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            toast.error('Connection failed. Please try again.');
            setCallStatus('ended');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setIsConnecting(false);
            setCallStatus('connected');
            // Stop ringing sound when connected
            if (ringingAudioRef.current) {
              ringingAudioRef.current.pause();
              ringingAudioRef.current.currentTime = 0;
            }
          } else if (pc.iceConnectionState === 'failed') {
            toast.error('Connection failed. Network issue detected.');
            setCallStatus('ended');
          }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
          if (event.streams[0]) {
            // Always save remote stream to ref for reconnection
            remoteStreamRef.current = event.streams[0];
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            setIsConnecting(false);
            setCallStatus('connected');

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
            sendSignalMutation.mutate({
              signal_type: 'ice-candidate',
              signal_data: event.candidate
            });
          }
        };

        // Only create and send offer if this is the CALLER
        // If this is a RECEIVER, they will receive the offer and send an answer
        if (!isReceiver) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignalMutation.mutateAsync({
              signal_type: 'offer',
              signal_data: offer
            });

            setCallStatus('calling');
            setIsConnecting(false);
          } catch (err) {
            console.error('❌ [VideoCall] ERROR creating/sending OFFER:', err);
            setCallStatus('ended');
          }

          // Play ringing sound only for caller
          if (ringingAudioRef.current) {
            ringingAudioRef.current.play().catch(() => {});
          }
        } else {
          // Receiver mode
          if (offerFromStateRef.current) {
            // Process offer immediately from state (passed by IncomingCallDetector)
            try {
              const offerData = JSON.parse(offerFromStateRef.current);
              await pc.setRemoteDescription(new RTCSessionDescription(offerData));
              remoteDescriptionSetRef.current = true;

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignalMutation.mutateAsync({
                signal_type: 'answer',
                signal_data: answer
              });
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
            setIsConnecting(true);
            setCallStatus('connecting');
          }
          // Play ringing sound for receiver while connecting
          if (ringingAudioRef.current) {
            ringingAudioRef.current.play().catch(() => {});
          }
        }

        // Mark peer connection as ready for signal processing
        setPeerConnectionReady(true);
      } catch (error) {
        console.error('❌ [VideoCall] Error initializing WebRTC:', error);
        const errorMsg = error?.message || 'Failed to access camera/microphone';
        toast.error(errorMsg);
        setCallStatus('ended');
      }
    };

    // Reset refs for new call
    remoteDescriptionSetRef.current = false;
    pendingIceCandidatesRef.current = [];
    processedSignalsRef.current = new Set();
    setPushedSignals([]);

    initWebRTC();

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Clean up only signals addressed TO the current user — preserves end-call signals in transit
      if (callId && user?.email) {
        base44.entities.VideoSignal.filter({ call_id: callId, to_email: user.email })
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
      setPushedSignals([]);
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
    // Wait for peer connection to be fully initialized
    if (!combinedSignals.length || !peerConnectionRef.current || !peerConnectionReady) {
      return;
    }

    const processSignals = async () => {
      // Sort signals to process offer/answer first, then ICE candidates
      const sortedSignals = [...combinedSignals].sort((a, b) => {
        const priority = { 'offer': 0, 'answer': 1, 'ice-candidate': 2, 'end-call': 3, 'decline': 3 };
        return (priority[a.signal_type] || 99) - (priority[b.signal_type] || 99);
      });

      for (const signal of sortedSignals) {
        // Skip already processed signals
        if (processedSignalsRef.current.has(signal.id)) {
          continue;
        }

        // Mark signal as being processed
        processedSignalsRef.current.add(signal.id);

        try {
          const data = JSON.parse(signal.signal_data);

          if (signal.signal_type === 'answer') {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
            remoteDescriptionSetRef.current = true;

            // Process any pending ICE candidates
            if (pendingIceCandidatesRef.current.length > 0) {
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {
                  // Candidate no longer valid for the negotiated connection — safe to skip.
                }
              }
              pendingIceCandidatesRef.current = [];
            }

            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch {
              // Already deleted by the other side's processing — fine.
            }
          } else if (signal.signal_type === 'offer') {
            // Skip if we've already set remote description (we've already processed an offer)
            if (remoteDescriptionSetRef.current) {
              try {
                await deleteSignalMutation.mutateAsync(signal.id);
              } catch {
                // Already deleted — fine.
              }
              continue;
            }

            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
            remoteDescriptionSetRef.current = true;

            // Process any pending ICE candidates BEFORE creating answer
            if (pendingIceCandidatesRef.current.length > 0) {
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {
                  // Candidate no longer valid for the negotiated connection — safe to skip.
                }
              }
              pendingIceCandidatesRef.current = [];
            }

            try {
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              await sendSignalMutation.mutateAsync({
                signal_type: 'answer',
                signal_data: answer
              });
            } catch (answerErr) {
              console.error('   ❌ ERROR creating/sending ANSWER:', answerErr);
            }
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch {
              // Already deleted — fine.
            }
          } else if (signal.signal_type === 'ice-candidate') {
            // Queue ICE candidates if remote description not yet set
            if (!remoteDescriptionSetRef.current) {
              pendingIceCandidatesRef.current.push(data);
              // Still delete from DB to prevent re-processing
              try {
                await deleteSignalMutation.mutateAsync(signal.id);
              } catch {
                // Already deleted — fine.
              }
              continue;
            }

            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data));
            } catch {
              // Candidate no longer valid for the negotiated connection — safe to skip.
            }
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch {
              // Already deleted — fine.
            }
          } else if (signal.signal_type === 'end-call') {
            setCallStatus('ended');
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch {
              // Already deleted — fine.
            }
          } else if (signal.signal_type === 'decline') {
            toast.error('Call declined');
            setCallStatus('ended');
            try {
              await deleteSignalMutation.mutateAsync(signal.id);
            } catch {
              // Already deleted — fine.
            }
          }
        } catch (error) {
          console.error('❌ [VideoCall] Error processing signal:', error);
        }
      }
    };

    processSignals();
  }, [combinedSignals, peerConnectionReady]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const switchCameraFacingMode = async () => {
    if (!localStreamRef.current) return;

    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode } }
      });
      const newVideoTrack = cameraStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No camera track available');
      }

      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      const currentStream = localStreamRef.current;
      const oldVideoTrack = currentStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        currentStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      currentStream.addTrack(newVideoTrack);
      localStreamRef.current = currentStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream;
      }

      setCameraFacingMode(nextFacingMode);
      toast.success(nextFacingMode === 'environment' ? 'Rear camera selected' : 'Front camera selected');
    } catch (error) {
      console.error('❌ [VideoCall] Camera switch failed:', error);
      toast.error(error?.message || 'Unable to switch camera');
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    await sendSignalMutation.mutateAsync({
      signal_type: 'end-call',
      signal_data: {}
    });
    setCallStatus('ended');

    // Stop ringing sound
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    // Only delete signals addressed TO the current user — do NOT delete the end-call
    // signal sent to the other party, as they may not have polled yet.
    try {
      const myReceivedSignals = await base44.entities.VideoSignal.filter({
        call_id: callId,
        to_email: user.email
      });
      for (const signal of myReceivedSignals) {
        try {
          await base44.entities.VideoSignal.delete(signal.id);
        } catch {
          // Already deleted — fine.
        }
      }
    } catch (err) {
      console.warn('Error cleaning up call signals:', err.message);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const handleGoBack = () => {
    navigate(backUrl, { replace: true });
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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-slate-700"
              onClick={handleGoBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src={otherProfile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                alt={otherProfile.display_name}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`; }}
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
              <Button
                onClick={handleGoBack}
                className="bg-purple-700 text-[#ffffff] mt-4 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-violet-700"
              >
                Go Back
              </Button>
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
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} />

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
              size="icon"              onClick={switchCameraFacingMode}
              disabled={!localStreamRef.current}
              className="rounded-full w-14 h-14 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <RotateCcw className="w-6 h-6" />
              </Button>

              <Button
              size="icon"              onClick={endCall}
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
