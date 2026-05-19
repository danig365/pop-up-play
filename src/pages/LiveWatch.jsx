// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Radio, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';
import { Room, RoomEvent } from 'livekit-client';

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function LiveWatch() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const eventId = params.get('id');
  const joinSentRef = useRef(false);
  const roomRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const videoTrackRef = useRef(null);
  const audioTrackRef = useRef(null);

  const [connectionState, setConnectionState] = useState('disconnected');
  const [playbackError, setPlaybackError] = useState('');
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  const sessionId = useMemo(() => {
    if (!eventId) return '';
    const key = `live_presence_session_${eventId}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, created);
    return created;
  }, [eventId]);

  const { data: user = null, isLoading: userLoading } = useQuery({
    queryKey: ['liveWatchUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const {
    data: watchSession = null,
    isLoading: watchLoading,
    isError: watchError,
    error,
  } = useQuery({
    queryKey: ['liveWatchSession', eventId, user?.email],
    enabled: !!eventId && !!user?.email,
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/live-events/${eventId}/watch-session`, {
        headers: getAuthHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to start watch session');
      return data;
    },
    refetchInterval: 30000,
  });

  const detachTracks = useCallback(() => {
    if (videoTrackRef.current && videoRef.current) {
      try {
        videoTrackRef.current.detach(videoRef.current);
      } catch {
        // ignore detach errors
      }
    }
    if (audioTrackRef.current && audioRef.current) {
      try {
        audioTrackRef.current.detach(audioRef.current);
      } catch {
        // ignore detach errors
      }
    }
    videoTrackRef.current = null;
    audioTrackRef.current = null;
    setHasVideoTrack(false);
  }, []);

  const attachTrack = useCallback((track) => {
    if (!track) return;

    if (track.kind === 'video' && videoRef.current) {
      if (videoTrackRef.current && videoTrackRef.current !== track) {
        try {
          videoTrackRef.current.detach(videoRef.current);
        } catch {
          // ignore detach errors
        }
      }
      track.attach(videoRef.current);
      videoTrackRef.current = track;
      setHasVideoTrack(true);
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      videoRef.current.controls = false;
      return;
    }

    if (track.kind === 'audio' && audioRef.current) {
      if (audioTrackRef.current && audioTrackRef.current !== track) {
        try {
          audioTrackRef.current.detach(audioRef.current);
        } catch {
          // ignore detach errors
        }
      }
      track.attach(audioRef.current);
      audioTrackRef.current = track;
      audioRef.current.autoplay = true;
      audioRef.current.controls = false;
      audioRef.current.muted = audioMuted;
    }
  }, [audioMuted]);

  const syncExistingTracks = useCallback((room) => {
    if (!room) return;

    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication?.track) {
          attachTrack(publication.track);
        }
      });
    });
  }, [attachTrack]);

  const disconnectRoom = useCallback(async (quiet = false) => {
    const room = roomRef.current;
    roomRef.current = null;

    try {
      if (room) {
        await room.disconnect();
      }
    } catch {
      // ignore disconnect errors
    } finally {
      detachTracks();
      setConnectionState('disconnected');
      setNeedsAudioUnlock(false);
      setAudioMuted(false);
      if (!quiet) {
        setPlaybackError('');
      }
    }
  }, [detachTracks]);

  useEffect(() => {
    if (!eventId || !user?.email || !watchSession?.livekit_token || !sessionId || joinSentRef.current) return;

    joinSentRef.current = true;

    const postPresence = (path, keepalive = false) => fetch(
      `${API_BASE_URL}/live-events/${eventId}/presence/${path}`,
      {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sessionId }),
        keepalive,
      }
    ).catch(() => null);

    postPresence('join');

    const heartbeat = setInterval(() => {
      postPresence('heartbeat');
    }, 15000);

    const onUnload = () => {
      postPresence('leave', true);
    };

    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', onUnload);
      postPresence('leave', true);
      joinSentRef.current = false;
    };
  }, [eventId, user?.email, watchSession?.livekit_token, sessionId]);

  useEffect(() => {
    let active = true;
    const retryRef = { count: 0 };

      const connectRoom = async () => {
      if (!watchSession?.livekit_token || !watchSession?.livekit_url || !watchSession?.room_name) {
        return;
      }

      await disconnectRoom(true);
      setConnectionState('connecting');
      setPlaybackError('');

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (active) {
          setConnectionState(String(state || 'unknown'));
          // if reconnected after retries, reset retry count
          if (String(state) === 'connected') {
            retryRef.count = 0;
          }
          if (String(state) === 'reconnecting') {
            retryRef.count = (retryRef.count || 0) + 1;
            setConnectionState(`reconnecting (${retryRef.count})`);
          }
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (active) {
          attachTrack(track);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (!active || !track) return;
        if (track.kind === 'video' && videoTrackRef.current === track) {
          detachTracks();
        }
        if (track.kind === 'audio' && audioTrackRef.current === track) {
          detachTracks();
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (active) {
          detachTracks();
          setConnectionState('disconnected');
          setAudioMuted(false);
        }
      });

      roomRef.current = room;

      // retry loop for transient failures
      let attempts = 0;
      const maxAttempts = Number(process.env.REACT_APP_LIVEKIT_VIEWER_CONNECT_RETRIES || 5);
      let lastErr = null;
      while (attempts < maxAttempts && active) {
        attempts += 1;
        try {
          await room.connect(watchSession.livekit_url, watchSession.livekit_token);
          syncExistingTracks(room);
          try {
            await room.startAudio();
            setNeedsAudioUnlock(false);
          } catch {
            setNeedsAudioUnlock(true);
          }
          if (active) {
            setConnectionState('connected');
          }
          lastErr = null;
          break;
        } catch (connectError) {
          lastErr = connectError;
          const backoff = Math.min(8000, 300 * attempts);
          setConnectionState(`connect-failed (attempt ${attempts})`);
          // small delay before retry
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      if (lastErr && active) {
        setPlaybackError(lastErr?.message || 'Unable to connect to the livestream.');
        setConnectionState('disconnected');
      }
    };

    connectRoom();

    return () => {
      active = false;
      disconnectRoom(true);
    };
  }, [attachTrack, disconnectRoom, syncExistingTracks, watchSession?.livekit_token, watchSession?.livekit_url, watchSession?.room_name]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-slate-500 mb-4">No live event selected.</p>
          <Link to={createPageUrl('LiveEvents')}>
            <Button variant="outline" className="rounded-xl">Back to Live Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Radio className="w-10 h-10 text-fuchsia-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Login Required</h2>
          <p className="text-slate-500 mb-6">Please sign in to watch this live stream.</p>
          <Button className="rounded-xl" onClick={() => base44.auth.redirectToLogin()}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  const hasLiveKitSession = Boolean(watchSession?.livekit_token && watchSession?.livekit_url && watchSession?.room_name);
  const isLiveKitError = watchError || (watchSession && !hasLiveKitSession && !watchSession?.embed_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('LiveEventDetail') + `?id=${eventId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Live Watch</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {watchLoading ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
          </div>
        ) : hasLiveKitSession ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{watchSession.title || 'Live Stream'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Status: {watchSession.status} • Room: {watchSession.room_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connection</p>
                <p className="text-sm font-semibold capitalize text-slate-900">{connectionState}</p>
              </div>
            </div>

            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-contain bg-black"
                autoPlay
                playsInline
              />
              <audio ref={audioRef} className="hidden" autoPlay />
              {!hasVideoTrack && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                  <div className="text-center px-6">
                    <Radio className="w-12 h-12 mx-auto mb-4 text-fuchsia-300" />
                    <p className="text-lg font-semibold">Waiting for the broadcaster to go live...</p>
                    <p className="text-sm text-white/70 mt-2">The player will attach as soon as the LiveKit stream publishes video.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {needsAudioUnlock ? 'Tap the button below to enable audio playback in this browser.' : 'Audio and video will stay connected while you remain on this page.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {needsAudioUnlock && (
                  <Button
                    type="button"
                    className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                    onClick={async () => {
                      try {
                        await roomRef.current?.startAudio();
                        setNeedsAudioUnlock(false);
                      } catch {
                        setNeedsAudioUnlock(true);
                      }
                    }}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Enable Audio
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    const nextMuted = !audioMuted;
                    audio.muted = nextMuted;
                    setAudioMuted(nextMuted);
                  }}
                >
                  {audioMuted ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                  {audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                </Button>
              </div>
            </div>
          </div>
        ) : isLiveKitError || watchError || !watchSession?.embed_url ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Start Stream</h2>
            <p className="text-slate-500 mb-6">{playbackError || error?.message || 'You may not have access to this stream yet.'}</p>
            <div className="flex items-center justify-center gap-2">
              <Link to={createPageUrl('LiveEventDetail') + `?id=${eventId}`}>
                <Button className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                  Back to Event
                </Button>
              </Link>
              <Link to={createPageUrl('LiveEvents')}>
                <Button variant="outline" className="rounded-xl">Browse Live Events</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{watchSession.title || 'Live Stream'}</h2>
              <p className="text-sm text-slate-500 mt-1">Status: {watchSession.status}</p>
            </div>

            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                title={`Live stream - ${watchSession.title || 'Live Event'}`}
                src={watchSession.embed_url}
                className="absolute top-0 left-0 w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
