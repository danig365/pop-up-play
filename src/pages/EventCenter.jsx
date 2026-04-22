// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, CalendarDays, ImagePlus, Loader2, MapPin, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/apiUrl';

const API_BASE_URL = getApiBaseUrl();

export default function EventCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const eventId = params.get('id');
  const isEditMode = !!eventId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressWrapperRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    zip_code: '',
    starts_at: new Date().toISOString().slice(0, 10),
    duration_days: '1',
  });

  const { data: currentUser = null } = useQuery({
    queryKey: ['eventCenterUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const { data: existingEvents = [], isLoading: isLoadingEvent } = useQuery({
    queryKey: ['eventEdit', eventId],
    enabled: isEditMode,
    queryFn: async () => base44.entities.Event.filter({ id: eventId }),
  });

  const existingEvent = isEditMode ? (existingEvents[0] || null) : null;

  useEffect(() => {
    if (!isEditMode || !existingEvent) return;
    setFormData({
      title: existingEvent.title || '',
      description: existingEvent.description || '',
      address: existingEvent.address || '',
      zip_code: existingEvent.zip_code || '',
      starts_at: String(existingEvent.starts_at || '').split('T')[0] || new Date().toISOString().slice(0, 10),
      duration_days: String(existingEvent.duration_days || '1'),
    });
    setPreviewUrl(existingEvent.image_url || '');
  }, [isEditMode, existingEvent]);

  const canSubmit = useMemo(() => {
    return (
      formData.title.trim().length > 0 &&
      formData.address.trim().length > 0 &&
      formData.zip_code.trim().length > 0 &&
      formData.starts_at.trim().length > 0 &&
      Number(formData.duration_days) >= 1 &&
      Number(formData.duration_days) <= 90 &&
      (!isEditMode || !!existingEvent) &&
      !isSubmitting &&
      !imageUploading
    );
  }, [formData, isSubmitting, imageUploading, isEditMode, existingEvent]);

  useEffect(() => {
    if (!showAddressSuggestions) return;

    const onDocClick = (event) => {
      if (!addressWrapperRef.current?.contains(event.target)) {
        setShowAddressSuggestions(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showAddressSuggestions]);

  useEffect(() => {
    const query = formData.address.trim();
    if (query.length < 3 || !showAddressSuggestions) {
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsAddressLoading(true);
        const resp = await fetch(`${API_BASE_URL}/address-autocomplete?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!resp.ok) {
          throw new Error('Unable to load address suggestions');
        }
        const data = await resp.json();
        setAddressSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setAddressSuggestions([]);
        }
      } finally {
        setIsAddressLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.address, showAddressSuggestions]);

  const pickAddressSuggestion = (suggestion) => {
    const selectedAddress = suggestion.address_line || suggestion.display_name || '';
    setFormData((prev) => ({
      ...prev,
      address: selectedAddress,
      zip_code: suggestion.zip_code || prev.zip_code,
    }));
    setShowAddressSuggestions(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }

    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode && !existingEvent) {
      toast.error('Event not found for editing.');
      return;
    }

    if (isEditMode && currentUser && existingEvent) {
      const canEdit = currentUser.email === existingEvent.user_email || currentUser.role === 'admin';
      if (!canEdit) {
        toast.error('Only the event owner or an admin can edit this event.');
        return;
      }
    }

    if (!formData.address.trim() || !formData.zip_code.trim()) {
      toast.error('Address and ZIP code are required to publish an event.');
      return;
    }

    if (!formData.starts_at.trim()) {
      toast.error('Please select the event start day.');
      return;
    }

    const startsAtDate = new Date(`${formData.starts_at}T12:00:00`);
    if (Number.isNaN(startsAtDate.getTime())) {
      toast.error('Please select a valid event start day.');
      return;
    }
    const startsAtIso = startsAtDate.toISOString();

    if (!formData.title.trim()) {
      toast.error('Event title is required.');
      return;
    }

    const duration = Number(formData.duration_days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 90) {
      toast.error('Event duration must be between 1 and 90 days.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = existingEvent?.image_url || '';
      if (selectedFile) {
        setImageUploading(true);
        const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
        imageUrl = uploadResult?.file_url || '';
        setImageUploading(false);
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: imageUrl,
        address: formData.address.trim(),
        zip_code: formData.zip_code.trim(),
        starts_at: startsAtIso,
        duration_days: duration,
      };

      if (isEditMode) {
        await base44.entities.Event.update(existingEvent.id, payload);
      } else {
        await base44.entities.Event.create(payload);
      }

      toast.success(isEditMode ? 'Event updated successfully.' : 'Event created and published successfully.');
      navigate(createPageUrl('CurrentEvents'));
    } catch (error) {
      setImageUploading(false);
      toast.error(error?.message || (isEditMode ? 'Failed to update event' : 'Failed to create event'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Event Center</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="w-14 h-14 rounded-full bg-fuchsia-100 flex items-center justify-center mb-4">
            <CalendarPlus className="w-7 h-7 text-fuchsia-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Event' : 'Event Center'}</h2>
          <p className="text-slate-500 mt-2 mb-5">
            {isEditMode
              ? 'Update your event details and save changes.'
              : 'Create an event and make it active on the homepage feed.'}
          </p>

          {isEditMode && isLoadingEvent && (
            <div className="mb-4 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading event details...
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="event-title" className="text-slate-700">Event Title</Label>
              <Input
                id="event-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Rooftop Meet & Greet"
                className="mt-1 rounded-xl border-slate-200"
                maxLength={120}
              />
            </div>

            <div>
              <Label htmlFor="event-description" className="text-slate-700">Event Description</Label>
              <Textarea
                id="event-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell users what this event is about..."
                className="mt-1 rounded-xl border-slate-200 resize-none"
                rows={5}
                maxLength={1500}
              />
            </div>

            <div>
              <Label htmlFor="event-image" className="text-slate-700">Event Image</Label>
              <div className="mt-2 flex flex-col gap-3">
                <input
                  id="event-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="event-image">
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                    className="rounded-xl w-full cursor-pointer"
                  >
                    <span>
                      <ImagePlus className="w-4 h-4" />
                      {selectedFile ? 'Change Event Image' : 'Upload Event Image'}
                    </span>
                  </Button>
                </label>
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={previewUrl} alt="Event preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-address" className="text-slate-700">
                  Address <span className="text-rose-600">*</span>
                </Label>
                  <div className="relative mt-1" ref={addressWrapperRef}>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="event-address"
                    value={formData.address}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, address: e.target.value }));
                        setShowAddressSuggestions(true);
                      }}
                      onFocus={() => setShowAddressSuggestions(true)}
                    placeholder="Street address"
                    className="pl-9 rounded-xl border-slate-200"
                  />

                    {showAddressSuggestions && (isAddressLoading || addressSuggestions.length > 0) && (
                      <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {isAddressLoading ? (
                          <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Finding address suggestions...
                          </div>
                        ) : (
                          addressSuggestions.map((suggestion, idx) => (
                            <button
                              key={`${suggestion.display_name}-${idx}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                              onClick={() => pickAddressSuggestion(suggestion)}
                            >
                              <p className="text-sm font-medium text-slate-800 truncate">{suggestion.address_line || suggestion.display_name}</p>
                              <p className="text-xs text-slate-500 truncate">{suggestion.display_name}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Required for 300-mile event targeting.</p>
              </div>

              <div>
                <Label htmlFor="event-start-date" className="text-slate-700">
                  Start Day <span className="text-rose-600">*</span>
                </Label>
                <div className="relative mt-1">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="event-start-date"
                    type="date"
                    value={formData.starts_at}
                    onChange={(e) => setFormData((prev) => ({ ...prev, starts_at: e.target.value }))}
                    className="pl-9 rounded-xl border-slate-200"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Choose the day this event should start.</p>
              </div>

              <div>
                <Label htmlFor="event-zip" className="text-slate-700">
                  ZIP Code <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="event-zip"
                  value={formData.zip_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="ZIP / Postal code"
                  className="mt-1 rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">Required for 300-mile event targeting.</p>
              </div>
            </div>

            <div>
              <Label className="text-slate-700">How long should this event run? (max 90 days)</Label>
              <div className="mt-1 relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Select
                  value={formData.duration_days}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, duration_days: value }))}
                >
                  <SelectTrigger className="pl-9 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-3">
              <p className="text-xs text-fuchsia-800">
                This event will not submit unless address and ZIP code are provided.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl sm:min-w-[220px]"
              >
                {isSubmitting || imageUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                    {isEditMode ? 'Saving Changes...' : 'Publishing Event...'}
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Publish Event'
                )}
              </Button>
              <Link to={createPageUrl('CurrentEvents')}>
                <Button type="button" variant="outline" className="rounded-xl w-full sm:w-auto">View Current Events</Button>
              </Link>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
