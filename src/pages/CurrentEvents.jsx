// @ts-nocheck
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarPlus, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function formatDateRange(startsAt, endsAt) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const s = new Date(startsAt).toLocaleDateString(undefined, opts);
  const e = new Date(endsAt).toLocaleDateString(undefined, opts);
  return `${s} – ${e}`;
}

function daysLeft(endsAt) {
  const diff = new Date(endsAt) - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Ended';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export default function CurrentEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = Date.now();

  const { data: currentUser = null } = useQuery({
    queryKey: ['currentEventsUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['activeEvents'],
    queryFn: async () => {
      const rows = await base44.entities.Event.filter({ is_active: true });
      return Array.isArray(rows) ? rows : [];
    },
    refetchInterval: 60000,
  });

  // Client-side filter: drop events past their end date
  const events = useMemo(
    () => allEvents.filter((ev) => new Date(ev.ends_at).getTime() > now),
    [allEvents, now]
  );

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => base44.entities.Event.delete(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activeEvents'] });
      toast.success('Event deleted successfully.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete event');
    },
  });

  const canDeleteEvent = (event) => !!currentUser && (
    currentUser.email === event.user_email || currentUser.role === 'admin'
  );

  const handleDeleteEvent = async (evt, eventId) => {
    evt.stopPropagation();
    evt.preventDefault();

    if (deleteEventMutation.isPending) return;

    const confirmed = window.confirm('Delete this event? This cannot be undone.');
    if (!confirmed) return;

    await deleteEventMutation.mutateAsync(eventId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Current Events</h1>
          <Link to={createPageUrl('EventCenter')}>
            <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl">
              <CalendarPlus className="w-4 h-4 mr-1" />
              Create Event
            </Button>
          </Link>
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
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-fuchsia-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-fuchsia-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No Active Events Yet</h2>
            <p className="text-slate-500 mb-6">Be the first to post an event for your area.</p>
            <Link to={createPageUrl('EventCenter')}>
              <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Create an Event
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all"
                onClick={() => navigate(createPageUrl('EventDetail') + '?id=' + event.id)}
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-fuchsia-100 to-violet-100 flex items-center justify-center">
                    <CalendarDays className="w-14 h-14 text-fuchsia-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{event.title}</h3>
                    {canDeleteEvent(event) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(evt) => handleDeleteEvent(evt, event.id)}
                        disabled={deleteEventMutation.isPending}
                        className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white h-8 px-2.5 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {(event.city || event.state || event.address) && (
                    <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {[event.city, event.state].filter(Boolean).join(', ') || event.address}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{formatDateRange(event.starts_at, event.ends_at)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      daysLeft(event.ends_at) === 'Ended'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-fuchsia-100 text-fuchsia-700'
                    }`}>
                      {daysLeft(event.ends_at)}
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
