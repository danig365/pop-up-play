// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeDollarSign, ExternalLink, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_BASE_URL = getApiBaseUrl();
const DURATION_OPTIONS = [
  { label: '30 days', value: '30' },
  { label: '60 days', value: '60' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
];

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-700';
  if (s === 'pending_payment') return 'bg-amber-100 text-amber-700';
  if (s === 'expired') return 'bg-slate-100 text-slate-600';
  return 'bg-violet-100 text-violet-700';
}

export default function AdCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const captureHandledRef = useRef(false);

  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [renewDurations, setRenewDurations] = useState({});
  const [formData, setFormData] = useState({
    business_name: '',
    contact_email: '',
    contact_number: '',
    website_url: '',
    banner_image_url: '',
    duration_days: '30',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: myAds = [], isLoading: adsLoading } = useQuery({
    queryKey: ['myAds', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const resp = await fetch(`${API_BASE_URL}/ads/my`, { headers: getAuthHeaders() });
      const data = await resp.json().catch(() => []);
      if (!resp.ok) throw new Error(data?.error || 'Failed to load ads');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  const createAdOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const resp = await fetch(`${API_BASE_URL}/paypal/create-ad-order`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to create ad payment order');
      return data;
    },
    onError: (error) => toast.error(error?.message || 'Unable to start PayPal payment'),
  });

  const captureOrderMutation = useMutation({
    mutationFn: async ({ adId, orderID }) => {
      const resp = await fetch(`${API_BASE_URL}/paypal/capture-ad-order`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ adId, orderID }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to confirm ad payment');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['myAds'] });
      toast.success('Payment confirmed. Your ad is now active.');
    },
    onError: (error) => toast.error(error?.message || 'Payment confirmation failed'),
  });

  useEffect(() => {
    if (!user?.email || captureHandledRef.current) return;

    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const adId = params.get('adId');
    const token = params.get('token');

    if (payment === 'cancelled') {
      captureHandledRef.current = true;
      toast.error('PayPal payment was cancelled.');
      navigate(createPageUrl('AdCenter'), { replace: true });
      return;
    }

    if (payment === 'success' && adId && token) {
      captureHandledRef.current = true;
      captureOrderMutation.mutate(
        { adId, orderID: token },
        {
          onSettled: () => {
            navigate(createPageUrl('AdCenter'), { replace: true });
          },
        }
      );
    }
  }, [location.search, navigate, user?.email]);

  const canSubmit = useMemo(() => {
    return (
      formData.business_name.trim().length > 0 &&
      formData.contact_email.trim().length > 0 &&
      formData.website_url.trim().length > 0 &&
      !!formData.duration_days &&
      !createAdOrderMutation.isPending
    );
  }, [formData, createAdOrderMutation.isPending]);

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for your banner.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Banner image must be less than 20MB.');
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const startPayPalCheckout = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      let bannerUrl = formData.banner_image_url || '';
      if (selectedFile) {
        const uploaded = await base44.integrations.Core.UploadFile({ file: selectedFile });
        bannerUrl = uploaded?.file_url || '';
      }

      const order = await createAdOrderMutation.mutateAsync({
        business_name: formData.business_name.trim(),
        contact_email: formData.contact_email.trim(),
        contact_number: formData.contact_number.trim(),
        website_url: formData.website_url.trim(),
        banner_image_url: bannerUrl,
        duration_days: Number(formData.duration_days),
      });

      if (!order?.approvalUrl) {
        throw new Error('PayPal approval link is unavailable. Please try again.');
      }

      window.location.assign(order.approvalUrl);
    } catch (error) {
      toast.error(error?.message || 'Unable to start PayPal checkout');
    }
  };

  const handleExtend = async (ad) => {
    const selectedDays = Number(renewDurations[ad.id] || '30');
    try {
      const order = await createAdOrderMutation.mutateAsync({
        adId: ad.id,
        duration_days: selectedDays,
      });

      if (!order?.approvalUrl) {
        throw new Error('PayPal approval link is unavailable. Please try again.');
      }

      window.location.assign(order.approvalUrl);
    } catch (error) {
      toast.error(error?.message || 'Unable to start extension payment');
    }
  };

  const deleteAdMutation = useMutation({
    mutationFn: async (adId) => {
      const resp = await fetch(`${API_BASE_URL}/ads/${adId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to delete ad');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['myAds'] });
      toast.success('Ad deleted successfully.');
    },
    onError: (error) => toast.error(error?.message || 'Delete failed'),
  });

  const handleDeleteAd = async (ad) => {
    if (!window.confirm(`Delete "${ad.business_name}"? This cannot be undone.`)) return;
    deleteAdMutation.mutate(ad.id);
  };

  const activateFreeMutation = useMutation({
    mutationFn: async (payload) => {
      const resp = await fetch(`${API_BASE_URL}/ads/activate-free`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Failed to activate free ad');
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['myAds'] });
      toast.success('Ad activated for free (admin test mode).');
    },
    onError: (error) => toast.error(error?.message || 'Free activation failed'),
  });

  const activateFreeAd = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      let bannerUrl = formData.banner_image_url || '';
      if (selectedFile) {
        const uploaded = await base44.integrations.Core.UploadFile({ file: selectedFile });
        bannerUrl = uploaded?.file_url || '';
      }
      await activateFreeMutation.mutateAsync({
        business_name: formData.business_name.trim(),
        contact_email: formData.contact_email.trim(),
        contact_number: formData.contact_number.trim(),
        website_url: formData.website_url.trim(),
        banner_image_url: bannerUrl,
        duration_days: Number(formData.duration_days),
      });
    } catch (error) {
      toast.error(error?.message || 'Free activation failed');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Advertise</h1>
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
            <BadgeDollarSign className="w-7 h-7 text-fuchsia-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create Ad Campaign</h2>
          <p className="text-slate-500 mt-2 mb-5">Fill in your business details, choose ad duration, and continue to PayPal.</p>

          <form className="space-y-4" onSubmit={startPayPalCheckout}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ad-business">Business name</Label>
                <Input
                  id="ad-business"
                  value={formData.business_name}
                  onChange={(e) => setFormData((p) => ({ ...p, business_name: e.target.value }))}
                  placeholder="Your business name"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="ad-email">Contact email</Label>
                <Input
                  id="ad-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData((p) => ({ ...p, contact_email: e.target.value }))}
                  placeholder="name@company.com"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="ad-phone">Contact number</Label>
                <Input
                  id="ad-phone"
                  value={formData.contact_number}
                  onChange={(e) => setFormData((p) => ({ ...p, contact_number: e.target.value }))}
                  placeholder="+1 555 123 4567"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="ad-url">Website address (URL)</Label>
                <Input
                  id="ad-url"
                  value={formData.website_url}
                  onChange={(e) => setFormData((p) => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://yourcompany.com"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label>Ad banner image</Label>
              <div className="mt-2 flex flex-col gap-3">
                <input id="ad-banner" type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                <label htmlFor="ad-banner">
                  <Button type="button" asChild variant="outline" className="rounded-xl w-full cursor-pointer">
                    <span>
                      <ImagePlus className="w-4 h-4" />
                      {selectedFile ? 'Change Banner Image' : 'Upload Banner Image'}
                    </span>
                  </Button>
                </label>
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={previewUrl} alt="Banner preview" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Ad duration</Label>
              <Select
                value={formData.duration_days}
                onValueChange={(value) => setFormData((p) => ({ ...p, duration_days: value }))}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Choose duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl"
            >
              {createAdOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting PayPal...
                </>
              ) : (
                'Continue to PayPal'
              )}
            </Button>

            {user?.role === 'admin' && (
              <Button
                type="button"
                onClick={activateFreeAd}
                disabled={!canSubmit || activateFreeMutation.isPending}
                variant="outline"
                className="w-full rounded-xl border-dashed border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                {activateFreeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  '⚡ Admin: Activate Free (Skip Payment)'
                )}
              </Button>
            )}

          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-4">My Ads</h3>
          {adsLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your ads...
            </div>
          ) : myAds.length === 0 ? (
            <p className="text-slate-500">No ad campaigns yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {myAds.map((ad) => (
                <div key={ad.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{ad.business_name}</p>
                      <a
                        href={ad.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-fuchsia-700 inline-flex items-center gap-1"
                      >
                        Visit website
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClass(ad.status)}`}>
                        {String(ad.status || 'draft').replace(/_/g, ' ')}
                      </span>
                      {user?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAd(ad)}
                          disabled={deleteAdMutation.isPending}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Delete ad (admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {ad.starts_at ? `Start: ${new Date(ad.starts_at).toLocaleString()}` : 'Start: pending payment'}
                    {' • '}
                    {ad.ends_at ? `End: ${new Date(ad.ends_at).toLocaleString()}` : 'End: not set'}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select
                      value={renewDurations[ad.id] || '30'}
                      onValueChange={(value) => setRenewDurations((prev) => ({ ...prev, [ad.id]: value }))}
                    >
                      <SelectTrigger className="rounded-xl sm:w-40">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={`${ad.id}-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      onClick={() => handleExtend(ad)}
                      disabled={createAdOrderMutation.isPending}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Extend / Renew via PayPal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
