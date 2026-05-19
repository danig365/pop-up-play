// @ts-nocheck
import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, Clock, User, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function formatDateRange(startsAt, endsAt) {
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
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

export default function EventDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.search);
  const eventId = params.get('id');

  const { data: currentUser = null } = useQuery({
    queryKey: ['eventDetailUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const { data: events = [], isLoading: eventsLoading, isError } = useQuery({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    queryFn: async () => base44.entities.Event.filter({ id: eventId }),
  });

  const event = events[0] ?? null;

  const { data: profiles = [] } = useQuery({
    queryKey: ['eventPoster', event?.user_email],
    enabled: !!event?.user_email,
    queryFn: async () => base44.entities.UserProfile.filter({ user_email: event.user_email }),
  });

  const poster = profiles[0] ?? null;

  const taggedEmails = useMemo(() => {
    if (!Array.isArray(event?.tagged_users) || event.tagged_users.length === 0) return [];
    return event.tagged_users.map((u) => u.user_email).filter(Boolean);
  }, [event?.tagged_users]);

  const { data: taggedProfiles = [] } = useQuery({
    queryKey: ['eventTaggedProfiles', taggedEmails],
    enabled: taggedEmails.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        taggedEmails.map((email) =>
          base44.entities.UserProfile.filter({ user_email: email }).then((r) => r[0] ?? null)
        )
      );
      return results.filter(Boolean);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!event?.id) throw new Error('Event not found');
      return base44.entities.Event.delete(event.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeEvents'] }),
        queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
      ]);
      toast.success('Event deleted successfully.');
      navigate(createPageUrl('CurrentEvents'));
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete event');
    },
  });

  const isLoading = eventsLoading;
  const ended = event ? new Date(event.ends_at).getTime() < Date.now() : false;
  const location_str = [event?.city, event?.state, event?.country].filter(Boolean).join(', ');
  const canDeleteEvent = !!event && !!currentUser && (
    currentUser.email === event.user_email || currentUser.role === 'admin'
  );
  const canEditEvent = canDeleteEvent;

  const handleDeleteEvent = async () => {
    if (!canDeleteEvent || deleteEventMutation.isPending) return;

    const confirmed = window.confirm('Delete this event? This cannot be undone.');
    if (!confirmed) return;

    await deleteEventMutation.mutateAsync();
  };

  const handleBack = () => {
    navigate(createPageUrl('CurrentEvents'));
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-slate-500 mb-4">No event specified.</p>
          <Link to={createPageUrl('CurrentEvents')}>
            <Button variant="outline" className="rounded-xl">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Event Detail</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
            <div className="h-56 bg-slate-200" />
            <div className="p-6 space-y-3">
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          </div>
        ) : isError || !event ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <CalendarDays className="w-12 h-12 text-fuchsia-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Event Not Found</h2>
            <p className="text-slate-500 mb-6">This event may have been removed.</p>
            <Link to={createPageUrl('CurrentEvents')}>
              <Button variant="outline" className="rounded-xl">Back to Events</Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Cover image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              {event.image_url ? (
                <img src={event.image_url} alt={event.title} className="w-full max-h-72 object-cover" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-fuchsia-100 to-violet-100 flex items-center justify-center">
                  <CalendarDays className="w-16 h-16 text-fuchsia-300" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">{event.title}</h2>
                  <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                    ended ? 'bg-slate-100 text-slate-500' : 'bg-fuchsia-100 text-fuchsia-700'
                  }`}>
                    {daysLeft(event.ends_at)}
                  </span>
                </div>

                {event.description && (
                  <p className="text-slate-600 leading-relaxed mb-5">{event.description}</p>
                )}

                <div className="space-y-2.5 text-sm text-slate-600">
                  {(location_str || event.address) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-fuchsia-500 flex-shrink-0 mt-0.5" />
                      <span>
                        {[event.address, location_str].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-fuchsia-500 flex-shrink-0" />
                    <span>{formatDateRange(event.starts_at, event.ends_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-fuchsia-500 flex-shrink-0" />
                    <span>{event.duration_days} day{event.duration_days !== 1 ? 's' : ''} long</span>
                  </div>
                </div>

                {(canEditEvent || canDeleteEvent) && (
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-2">
                    {canEditEvent && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(createPageUrl('EventCenter') + '?id=' + event.id)}
                        className="rounded-xl"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Event
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Poster profile card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-5"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Posted by</p>
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => navigate(createPageUrl('Profile') + '?user=' + encodeURIComponent(event.user_email) + '&back=EventDetail&eventId=' + encodeURIComponent(event.id))}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-200 to-violet-200 flex-shrink-0 flex items-center justify-center group-hover:ring-2 group-hover:ring-fuchsia-400 transition-all">
                  {poster?.avatar_url ? (
                    <img src={poster.avatar_url} alt={poster.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-fuchsia-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-fuchsia-700 transition-colors truncate">
                    {poster?.display_name || event.user_email}
                  </p>
                  {poster?.bio && (
                    <p className="text-sm text-slate-500 truncate">{poster.bio}</p>
                  )}
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 group-hover:text-fuchsia-500 transition-colors flex-shrink-0" />
              </div>
            </motion.div>

            {/* Tagged / Attending users */}
            {taggedProfiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl shadow-lg p-5"
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Attending / Featured</p>
                <div className="space-y-3">
                  {taggedProfiles.map((profile) => (
                    <div
                      key={profile.user_email}
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(createPageUrl('Profile') + '?user=' + encodeURIComponent(profile.user_email) + '&back=EventDetail&eventId=' + encodeURIComponent(event.id))}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-200 to-violet-200 flex-shrink-0 flex items-center justify-center group-hover:ring-2 group-hover:ring-fuchsia-400 transition-all">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-fuchsia-500" />
                        )}
                      </div>
                      <p className="font-medium text-slate-900 group-hover:text-fuchsia-700 transition-colors truncate">
                        {profile.display_name || profile.user_email}
                      </p>
                      <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 group-hover:text-fuchsia-500 transition-colors flex-shrink-0 ml-auto" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
