// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, Clock, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';

const API_BASE_URL = getApiBaseUrl();

function formatDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return 'TBD';
  return d.toLocaleString();
}

export default function LiveEvents() {
  const navigate = useNavigate();

  const { data: liveEvents = [], isLoading } = useQuery({
    queryKey: ['publicLiveEvents'],
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/live-events/public`);
      const data = await resp.json().catch(() => []);
      if (!resp.ok) throw new Error(data?.error || 'Failed to load live events');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Live Events</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-40 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : liveEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-fuchsia-100 flex items-center justify-center mx-auto mb-4">
              <Radio className="w-8 h-8 text-fuchsia-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No Live Events Right Now</h2>
            <p className="text-slate-500">Check back later for upcoming or active streams.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {liveEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all"
                onClick={() => navigate(createPageUrl('LiveEventDetail') + '?id=' + event.id)}
              >
                {event.thumbnail_url ? (
                  <img src={event.thumbnail_url} alt={event.title} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-fuchsia-100 to-violet-100 flex items-center justify-center">
                    <Radio className="w-14 h-14 text-fuchsia-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{event.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      event.status === 'live'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{event.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(event.scheduled_at || event.starts_at)}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      event.access_type === 'paid' ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {event.access_type === 'paid' ? <DollarSign className="w-3.5 h-3.5" /> : null}
                      {event.access_type === 'paid' ? `$${Number(event.price_usd || 0).toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
