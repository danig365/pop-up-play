// @ts-nocheck
import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    if (!eventId || !user?.email || !watchSession?.embed_url || !sessionId || joinSentRef.current) return;

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

    // Initial join
    postPresence('join');

    // Heartbeat while watching
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
  }, [eventId, user?.email, watchSession?.embed_url, sessionId]);

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
        ) : watchError || !watchSession?.embed_url ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Radio className="w-12 h-12 text-fuchsia-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Start Stream</h2>
            <p className="text-slate-500 mb-6">{error?.message || 'You may not have access to this stream yet.'}</p>
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
