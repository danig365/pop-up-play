// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Radio, Trash2, Users, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const initialForm = {
  title: '',
  description: '',
  thumbnail_url: '',
  stream_provider: 'restream',
  stream_id: '',
  access_type: 'paid',
  price_usd: '9.99',
  status: 'draft',
  scheduled_at: '',
};

export default function LiveStudio() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [watchersByEvent, setWatchersByEvent] = useState({});
  const [loadingWatchersFor, setLoadingWatchersFor] = useState('');
  const [expandedWatchersFor, setExpandedWatchersFor] = useState('');

  const { data: user = null } = useQuery({
    queryKey: ['liveStudioUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['liveEventsManage', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/live-events/manage`, { headers: getAuthHeaders() });
      const data = await resp.json().catch(() => []);
      if (!resp.ok) throw new Error(data?.error || 'Failed to load live events');
      return Array.isArray(data) ? data : [];
    },
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Radio className="w-10 h-10 text-fuchsia-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Admin Access Required</h2>
          <p className="text-slate-500 mb-6">Only admin users can start and manage livestream events.</p>
          <Link to={createPageUrl('LiveEvents')}>
            <Button className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white">Browse Live Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const createOrUpdateMutation = useMutation({
    mutationFn: async (payload) => {
      const isEdit = !!editingId;
      const url = isEdit
        ? `${API_BASE_URL}/live-events/manage/${editingId}`
        : `${API_BASE_URL}/live-events/manage`;
      const method = isEdit ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to save live event');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['liveEventsManage'] });
      toast.success(editingId ? 'Live event updated.' : 'Live event created.');
      setEditingId('');
      setFormData(initialForm);
    },
    onError: (error) => toast.error(error?.message || 'Unable to save event'),
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const resp = await fetch(`${API_BASE_URL}/live-events/manage/${id}/status`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to update status');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['liveEventsManage'] });
      toast.success('Status updated.');
    },
    onError: (error) => toast.error(error?.message || 'Status update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/live-events/manage/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to delete live event');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['liveEventsManage'] });
      toast.success('Live event deleted.');
      if (editingId) {
        setEditingId('');
        setFormData(initialForm);
      }
    },
    onError: (error) => toast.error(error?.message || 'Delete failed'),
  });

  const canSubmit = useMemo(() => {
    if (!formData.title.trim()) return false;
    if (!formData.stream_id.trim()) return false;
    if (formData.access_type === 'paid' && Number(formData.price_usd) < 0) return false;
    return !createOrUpdateMutation.isPending;
  }, [formData, createOrUpdateMutation.isPending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      thumbnail_url: formData.thumbnail_url.trim(),
      stream_provider: formData.stream_provider,
      stream_id: formData.stream_id.trim(),
      access_type: formData.access_type,
      price_usd: formData.access_type === 'free' ? 0 : Number(formData.price_usd || 0),
      status: formData.status,
      scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
    };
    createOrUpdateMutation.mutate(payload);
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      thumbnail_url: event.thumbnail_url || '',
      stream_provider: event.stream_provider || 'restream',
      stream_id: event.stream_id || '',
      access_type: event.access_type || 'paid',
      price_usd: String(event.price_usd ?? '0'),
      status: event.status || 'draft',
      scheduled_at: toDatetimeLocal(event.scheduled_at),
    });
  };

  const askDelete = (event) => {
    if (!window.confirm(`Delete live event "${event.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(event.id);
  };

  const loadWatchers = useCallback(async (eventId, options = {}) => {
    const { silent = false } = options;
    try {
      setLoadingWatchersFor(eventId);
      const resp = await fetch(`${API_BASE_URL}/live-events/${eventId}/watchers`, {
        headers: getAuthHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to load watchers');
      setWatchersByEvent((prev) => ({ ...prev, [eventId]: data }));
      setExpandedWatchersFor(eventId);
    } catch (error) {
      if (!silent) {
        toast.error(error?.message || 'Unable to load watchers');
      }
    } finally {
      setLoadingWatchersFor('');
    }
  }, []);

  // Auto-refresh active watcher panel every 10 seconds for near real-time updates.
  useEffect(() => {
    if (!expandedWatchersFor) return;

    const timer = setInterval(() => {
      loadWatchers(expandedWatchersFor, { silent: true });
    }, 10000);

    return () => clearInterval(timer);
  }, [expandedWatchersFor, loadWatchers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Live Studio</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="w-14 h-14 rounded-full bg-fuchsia-100 flex items-center justify-center mb-4">
            <Radio className="w-7 h-7 text-fuchsia-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{editingId ? 'Edit Live Event' : 'Create Live Event'}</h2>
          <p className="text-slate-500 mt-2 mb-5">Configure free or paid stream events for your audience.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="live-title">Title</Label>
              <Input
                id="live-title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Friday Night Live Session"
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="live-description">Description</Label>
              <Textarea
                id="live-description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={4}
                placeholder="Tell users what this livestream is about"
                className="mt-1 rounded-xl resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="live-provider">Stream provider</Label>
                <Input
                  id="live-provider"
                  value={formData.stream_provider}
                  onChange={(e) => setFormData((p) => ({ ...p, stream_provider: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="restream"
                />
              </div>
              <div>
                <Label htmlFor="live-stream-id">Stream ID</Label>
                <Input
                  id="live-stream-id"
                  value={formData.stream_id}
                  onChange={(e) => setFormData((p) => ({ ...p, stream_id: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="Restream player ID or full Restream player URL"
                />
              </div>
              <div>
                <Label htmlFor="live-thumbnail">Thumbnail URL</Label>
                <Input
                  id="live-thumbnail"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData((p) => ({ ...p, thumbnail_url: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="live-scheduled">Scheduled At</Label>
                <Input
                  id="live-scheduled"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData((p) => ({ ...p, scheduled_at: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Access Type</Label>
                <Select
                  value={formData.access_type}
                  onValueChange={(value) => setFormData((p) => ({ ...p, access_type: value }))}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="live-price">Price (USD)</Label>
                <Input
                  id="live-price"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={formData.access_type === 'free'}
                  value={formData.access_type === 'free' ? '0' : formData.price_usd}
                  onChange={(e) => setFormData((p) => ({ ...p, price_usd: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((p) => ({ ...p, status: value }))}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl"
              >
                {createOrUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? 'Save Changes' : 'Create Event'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingId('');
                    setFormData(initialForm);
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-4">My Live Events</h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <p className="text-slate-500">No live events yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {event.access_type === 'paid' ? `$${Number(event.price_usd || 0).toFixed(2)}` : 'Free'} • {event.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => askDelete(event)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    {event.scheduled_at ? `Scheduled: ${new Date(event.scheduled_at).toLocaleString()}` : 'No schedule set'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => startEdit(event)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: event.id, status: 'upcoming' })}
                    >
                      Mark Upcoming
                    </Button>
                    <Button
                      type="button"
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: event.id, status: 'live' })}
                    >
                      Go Live
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: event.id, status: 'ended' })}
                    >
                      End Stream
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={loadingWatchersFor === event.id}
                      onClick={() => loadWatchers(event.id)}
                    >
                      {loadingWatchersFor === event.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          View Watchers
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedWatchersFor === event.id && watchersByEvent[event.id] && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-800">
                          Watching now: {Number(watchersByEvent[event.id]?.active_count || 0)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => loadWatchers(event.id)}
                          disabled={loadingWatchersFor === event.id}
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${loadingWatchersFor === event.id ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>

                      {Array.isArray(watchersByEvent[event.id]?.watchers) && watchersByEvent[event.id].watchers.length > 0 ? (
                        <div className="space-y-2">
                          {watchersByEvent[event.id].watchers.map((w) => (
                            <div key={w.user_email} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-2.5 py-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-200 to-violet-200 flex-shrink-0 flex items-center justify-center">
                                {w.avatar_url ? (
                                  <img src={w.avatar_url} alt={w.display_name || w.user_email} className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-4 h-4 text-fuchsia-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{w.display_name || w.user_email}</p>
                                <p className="text-xs text-slate-500 truncate">{w.user_email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No active viewers in the last 30 seconds.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
