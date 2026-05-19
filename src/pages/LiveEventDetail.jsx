// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Radio, User, DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const API_BASE_URL = getApiBaseUrl();

function formatDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return 'TBD';
  return d.toLocaleString();
}

export default function LiveEventDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const captureHandledRef = useRef(false);
  const params = new URLSearchParams(location.search);
  const eventId = params.get('id');

  const { data: user = null } = useQuery({
    queryKey: ['liveEventDetailUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const { data: event = null, isLoading, isError } = useQuery({
    queryKey: ['publicLiveEventDetail', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/live-events/public/${eventId}`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to load live event');
      return data;
    },
  });

  const getAuthHeaders = (extra = {}) => {
    const token = localStorage.getItem('popup_auth_token');
    return {
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const { data: accessState = null } = useQuery({
    queryKey: ['liveEventAccess', eventId, user?.email],
    enabled: !!eventId && !!user?.email,
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/live-events/${eventId}/access`, {
        headers: getAuthHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to verify access');
      return data;
    },
    refetchInterval: 30000,
  });

  const createLiveOrderMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/paypal/create-live-order`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ eventId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to create live access order');
      return data;
    },
    onError: (error) => toast.error(error?.message || 'Unable to start PayPal checkout'),
  });

  const captureLiveOrderMutation = useMutation({
    mutationFn: async ({ orderID }) => {
      const resp = await fetch(`${API_BASE_URL}/paypal/capture-live-order`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ eventId, orderID }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to confirm payment');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['liveEventAccess', eventId, user?.email] });
      toast.success('Payment confirmed. You now have access to this event.');
    },
    onError: (error) => toast.error(error?.message || 'Payment confirmation failed'),
  });

  useEffect(() => {
    if (!eventId || !user?.email || captureHandledRef.current) return;

    const urlParams = new URLSearchParams(location.search);
    const payment = urlParams.get('payment');
    const token = urlParams.get('token');

    if (payment === 'cancelled') {
      captureHandledRef.current = true;
      toast.error('PayPal payment was cancelled.');
      navigate(createPageUrl('LiveEventDetail') + `?id=${eventId}`, { replace: true });
      return;
    }

    if (payment === 'success' && token) {
      captureHandledRef.current = true;
      captureLiveOrderMutation.mutate(
        { orderID: token },
        {
          onSettled: () => {
            navigate(createPageUrl('LiveEventDetail') + `?id=${eventId}`, { replace: true });
          },
        }
      );
    }
  }, [location.search, navigate, eventId, user?.email]);

  const startCheckout = async () => {
    if (!user?.email) {
      base44.auth.redirectToLogin();
      return;
    }

    try {
      const order = await createLiveOrderMutation.mutateAsync();
      if (!order?.approvalUrl) {
        throw new Error('PayPal approval link is unavailable. Please try again.');
      }
      window.location.assign(order.approvalUrl);
    } catch (error) {
      toast.error(error?.message || 'Unable to start checkout');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('LiveEvents')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Live Event Detail</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
            <div className="h-56 bg-slate-200" />
            <div className="p-6 space-y-3">
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ) : isError || !event ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <Radio className="w-12 h-12 text-fuchsia-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Live Event Not Found</h2>
            <p className="text-slate-500 mb-6">This live event may have been removed.</p>
            <Link to={createPageUrl('LiveEvents')}>
              <Button variant="outline" className="rounded-xl">Back to Live Events</Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {event.thumbnail_url ? (
              <img src={event.thumbnail_url} alt={event.title} className="w-full max-h-72 object-cover" />
            ) : (
              <div className="w-full h-44 bg-gradient-to-br from-fuchsia-100 to-violet-100 flex items-center justify-center">
                <Radio className="w-16 h-16 text-fuchsia-300" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{event.title}</h2>
                <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                  event.status === 'live' ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-700'
                }`}>
                  {event.status}
                </span>
              </div>

              {event.description ? (
                <p className="text-slate-600 leading-relaxed mb-5">{event.description}</p>
              ) : null}

              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-fuchsia-500 flex-shrink-0" />
                  <span>Scheduled: {formatDate(event.scheduled_at || event.starts_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-fuchsia-500 flex-shrink-0" />
                  <span>
                    Access: {event.access_type === 'paid' ? `$${Number(event.price_usd || 0).toFixed(2)} (paid)` : 'Free'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-fuchsia-500 flex-shrink-0" />
                  <span>Host: {event.host_display_name || event.host_email}</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                {!user ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700">Log in to unlock this live event.</p>
                    <Button className="rounded-xl" onClick={() => base44.auth.redirectToLogin()}>
                      Login to Continue
                    </Button>
                  </div>
                ) : event.access_type === 'free' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-emerald-700 font-semibold">This is a free event. Access is unlocked.</p>
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => navigate(createPageUrl('LiveWatch') + `?id=${eventId}`)}
                    >
                      Watch Now
                    </Button>
                  </div>
                ) : accessState?.hasAccess ? (
                  <div className="space-y-2">
                    <p className="text-sm text-emerald-700 font-semibold">You already purchased access for this event.</p>
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => navigate(createPageUrl('LiveWatch') + `?id=${eventId}`)}
                    >
                      Watch Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700">Purchase required to watch this stream.</p>
                    <Button
                      className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                      disabled={createLiveOrderMutation.isPending || captureLiveOrderMutation.isPending}
                      onClick={startCheckout}
                    >
                      {createLiveOrderMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting PayPal...
                        </>
                      ) : (
                        `Buy Access - $${Number(event.price_usd || 0).toFixed(2)}`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
