import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Loader2, Filter, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BlockButton from '@/components/blocking/BlockButton';
import { useSubscription } from '@/lib/SubscriptionContext';
import { getApiBaseUrl } from '@/lib/apiUrl';

// State name to abbreviation mapping
const stateMapping = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

// Cache for geocoded ZIP codes
const zipCache = new Map();

// Geocode ZIP code to coordinates
const geocodeZip = async (zip, country = 'US') => {
  if (!zip) return null;
  
  const cacheKey = `${zip}_${country}`;
  if (zipCache.has(cacheKey)) {
    return zipCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=${country}&format=json&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      zipCache.set(cacheKey, coords);
      return coords;
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
  
  return null;
};

// Calculate distance between two coordinates in miles
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function AllProfiles() {
  const [user, setUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [interestFilter, setInterestFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [profilesWithDistance, setProfilesWithDistance] = useState([]);
  const navigate = useNavigate();
  const { guardAction } = useSubscription();

  const queryClient = useQueryClient();

  const resolveCountryCode = (countryValue) => {
    const normalized = String(countryValue || '').trim().toLowerCase();
    if (!normalized) return '';
    const map = {
      us: 'us',
      usa: 'us',
      'united states': 'us',
      'united states of america': 'us',
      nl: 'nl',
      netherlands: 'nl',
      nederland: 'nl',
    };
    return map[normalized] || '';
  };

  const getCountryCandidatesForPostal = (postalCode, countryValue) => {
    const candidates = [];
    const fromProfileCountry = resolveCountryCode(countryValue);
    if (fromProfileCountry) candidates.push(fromProfileCountry);

    if (/[a-zA-Z]/.test(postalCode)) {
      candidates.push('nl');
    }

    candidates.push('us');
    return [...new Set(candidates)];
  };

  const lookupWithNominatim = async (postalCode, countryHint = '') => {
    const params = new URLSearchParams({
      postalcode: postalCode,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    });

    if (countryHint) {
      params.set('country', countryHint);
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    const address = data?.[0]?.address;
    if (!address) return null;

    const city = address.city || address.town || address.village || address.municipality || address.county || '';
    const state = address.state || address.region || '';
    const country = address.country || countryHint || '';

    if (!city && !state && !country) return null;
    return { city, state, country };
  };

  const fetchCityFromZipCode = async (zipCode) => {
    let postalCode = String(zipCode || '').trim().replace(/\s+/g, ' ');
    if (!postalCode || postalCode.length < 4) return;
    if (/[a-zA-Z]/.test(postalCode)) {
      postalCode = postalCode.toUpperCase();
    }

    const countryCandidates = getCountryCandidatesForPostal(postalCode, editForm.country);

    try {
      for (const countryCode of countryCandidates) {
        const response = await fetch(`https://api.zippopotam.us/${countryCode}/${encodeURIComponent(postalCode)}`);
        if (!response.ok) continue;

        const data = await response.json();
        const city = data.places?.[0]?.['place name'] || '';
        const state = data.places?.[0]?.['state abbreviation'] || data.places?.[0]?.state || '';
        const country = data.country || (countryCode === 'nl' ? 'Netherlands' : 'United States');
        setEditForm(f => ({ ...f, city, state, country }));
        return;
      }

      const countryHints = [
        editForm.country,
        ...(countryCandidates.map((code) => (code === 'nl' ? 'Netherlands' : code === 'us' ? 'United States' : ''))),
        '',
      ].filter(Boolean);

      for (const hint of [...new Set(countryHints)]) {
        const resolved = await lookupWithNominatim(postalCode, hint);
        if (resolved) {
          setEditForm(f => ({ ...f, ...resolved }));
          return;
        }
      }

      setEditForm(f => ({ ...f, city: '', state: '', country: '' }));
    } catch (error) {
      console.error('Error fetching location data:', error);
      setEditForm(f => ({ ...f, city: '', state: '', country: '' }));
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      setEditingProfile(null);
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profile) => {
      // Delete the entire user account and all related data (not just the profile)
      const response = await fetch(`${getApiBaseUrl()}/admin/user/${encodeURIComponent(profile.user_email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('popup_auth_token')}`,
          'x-user-email': JSON.parse(localStorage.getItem('popup_auth_user') || '{}').email || '',
        },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      setConfirmDelete(null);
    },
  });

  const handleEditClick = (profile, e) => {
    e.stopPropagation();
    setEditForm({
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      age: profile.age || '',
      gender: profile.gender || '',
      interested_in: profile.interested_in || '',
      looking_for: profile.looking_for || '',
      city: profile.city || '',
      state: profile.state || '',
      zip_code: profile.zip_code || '',
      country: profile.country || '',
    });
    setEditingProfile(profile);
  };

  const handleSaveEdit = () => {
    if (!editingProfile) return;

    const ageRaw = typeof editForm.age === 'string' ? editForm.age.trim() : editForm.age;
    const normalizedAge = ageRaw === '' || ageRaw === null || ageRaw === undefined
      ? null
      : Number(ageRaw);

    const payload = {
      ...editForm,
      display_name: (editForm.display_name || '').trim(),
      bio: editForm.bio || '',
      gender: editForm.gender || '',
      interested_in: editForm.interested_in || '',
      looking_for: editForm.looking_for || '',
      zip_code: (editForm.zip_code || '').trim(),
      city: editForm.city || '',
      state: editForm.state || '',
      country: editForm.country || '',
      age: Number.isFinite(normalizedAge) ? normalizedAge : null,
    };

    updateProfileMutation.mutate({ id: editingProfile.id, data: payload });
  };

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

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles;
    },
    enabled: !!user?.email
  });

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const blocked = await base44.entities.BlockedUser.filter({
        blocker_email: user.email
      });
      return blocked;
    },
    enabled: !!user?.email
  });

  // Admin-only: fetch all subscriptions to show Free/Paid on each card
  const { data: allSubscriptions = [] } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: async () => base44.entities.UserSubscription.list(),
    enabled: user?.role === 'admin',
  });

  // Build a quick lookup map: user_email -> subscription status
  const subscriptionMap = React.useMemo(() => {
    const map = {};
    allSubscriptions.forEach(sub => {
      // Keep the most relevant (active > trial > others)
      const existing = map[sub.user_email];
      const isPriority = (s) => s === 'active' || s === 'trial';
      if (!existing || (!isPriority(existing.status) && isPriority(sub.status))) {
        map[sub.user_email] = sub;
      }
    });
    return map;
  }, [allSubscriptions]);

  // Calculate distances based on ZIP codes
  useEffect(() => {
    const calculateDistances = async () => {
      if (!myProfile?.zip_code) {
        setProfilesWithDistance(allProfiles);
        return;
      }
      
      // Geocode user's ZIP
      const myCoords = await geocodeZip(myProfile.zip_code, myProfile.country || 'US');
      if (!myCoords) {
        setProfilesWithDistance(allProfiles);
        return;
      }
      
      // Calculate distances for all profiles
      const profilesWithDist = await Promise.all(
        allProfiles.map(async (profile) => {
          if (!profile.zip_code) {
            return { ...profile, zipDistance: null };
          }
          
          const profileCoords = await geocodeZip(profile.zip_code, profile.country || 'US');
          if (!profileCoords) {
            return { ...profile, zipDistance: null };
          }
          
          const distance = calculateDistance(
            myCoords.lat,
            myCoords.lon,
            profileCoords.lat,
            profileCoords.lon
          );
          
          return { ...profile, zipDistance: distance };
        })
      );
      
      setProfilesWithDistance(profilesWithDist);
    };
    
    calculateDistances();
  }, [allProfiles, myProfile]);

  const sortedProfiles = React.useMemo(() => {
    const selfProfile = profilesWithDistance.find(p => p.user_email === user?.email) || null;
    let profiles = profilesWithDistance.filter(p => p.user_email !== user?.email);
    
    // Filter by interests
    if (interestFilter.trim()) {
      profiles = profiles.filter(p => 
        p.interests && p.interests.some(interest => 
          interest.toLowerCase().includes(interestFilter.toLowerCase())
        )
      );
    }
    
    // Filter by location
    if (locationFilter.trim()) {
      profiles = profiles.filter(p => {
        const searchTerm = locationFilter.toLowerCase();
        const city = (p.city || '').toLowerCase();
        const state = (p.state || '').toLowerCase();
        const zip = (p.zip_code || '').toLowerCase();
        const country = (p.country || '').toLowerCase();
        
        // Check if search term is a state name or abbreviation
        const stateAbbrev = stateMapping[searchTerm];
        const matchesState = state.includes(searchTerm) || 
                            (stateAbbrev && state.includes(stateAbbrev.toLowerCase()));
        
        return city.includes(searchTerm) || 
               matchesState || 
               zip.includes(searchTerm) || 
               country.includes(searchTerm);
      });
    }
    
    // Sort by ZIP code distance
    profiles.sort((a, b) => {
      // Always show current user's profile first
      if (a.user_email === user?.email) return -1;
      if (b.user_email === user?.email) return 1;

      if (a.zipDistance === null && b.zipDistance === null) {
        // Both have no distance, sort alphabetically
        const aLocation = `${a.city || ''} ${a.state || ''}`.trim();
        const bLocation = `${b.city || ''} ${b.state || ''}`.trim();
        return aLocation.localeCompare(bLocation);
      }
      if (a.zipDistance === null) return 1; // a goes to end
      if (b.zipDistance === null) return -1; // b goes to end
      return a.zipDistance - b.zipDistance; // Sort by distance ascending
    });
    
    return selfProfile ? [selfProfile, ...profiles] : profiles;
  }, [profilesWithDistance, blockedUsers, interestFilter, locationFilter, user?.email]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-purple-800">All Profiles</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter Bar */}
        <motion.div
          className="mb-6 space-y-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-purple-600" />
              <Input
                placeholder="Filter by interests (e.g., Couples, BBC, Unicorns)..."
                value={interestFilter}
                onChange={(e) => setInterestFilter(e.target.value)}
                className="flex-1 rounded-xl border-purple-200 focus:border-purple-400" />
              {interestFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInterestFilter('')}
                  className="text-slate-500">
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-400" />
              <Input
                placeholder="Filter by location (city, state, ZIP, country)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="flex-1 rounded-xl border-purple-200 focus:border-purple-400" />
              {locationFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocationFilter('')}
                  className="text-slate-500">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Count */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-600">
            {sortedProfiles.length} {sortedProfiles.length === 1 ? 'profile' : 'profiles'} nearby
          </p>
        </motion.div>

        {/* Profiles Grid */}
        {sortedProfiles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-lg">No profiles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer relative"
                onClick={() => {
                  if (!guardAction('view full profiles')) return;
                  navigate(createPageUrl('Profile') + '?user=' + profile.user_email + '&back=AllProfiles');
                }}
              >
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Admin controls */}
                  {user?.role === 'admin' && profile.user_email !== user?.email && (
                    <div className="absolute top-2 left-2 z-10 flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleEditClick(profile, e)}
                        className="bg-white/90 hover:bg-white text-purple-700 rounded-full p-1.5 shadow"
                        title="Edit profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(profile); }}
                        className="bg-white/90 hover:bg-white text-red-500 rounded-full p-1.5 shadow"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {/* Avatar */}
                  <div className="aspect-square relative">
                    <img
                      src={profile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                    {profile.is_popped_up && (
                      <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {profile.display_name || 'Anonymous'}
                        {profile.age && <span className="text-slate-500">, {profile.age}</span>}
                      </h3>
                      {profile.user_email === user?.email && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                          You
                        </span>
                      )}
                      {user?.role === 'admin' && (() => {
                        const sub = subscriptionMap[profile.user_email];
                        const isPaid = sub && (sub.status === 'active' || sub.status === 'trial');
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isPaid ? 'Paid' : 'Free'}
                          </span>
                        );
                      })()}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        {(profile.city || profile.state || profile.country) && (
                          <>
                            <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <span className="truncate">
                              {[profile.city, profile.state, profile.country]
                                .filter(Boolean)
                                .join(' , ')}
                            </span>
                          </>
                        )}
                        {profile.zipDistance !== null && profile.zipDistance !== undefined && (
                          <span className="text-purple-600 font-semibold flex-shrink-0 ml-1">
                            • {profile.zipDistance.toFixed(1)} mi
                          </span>
                        )}
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                        profile.is_popped_up 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {profile.is_popped_up ? 'Popped Up' : 'Popped Down'}
                      </span>
                    </div>

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {profile.interests.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs">
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                            +{profile.interests.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {profile.bio && (
                      <p className="text-sm text-slate-600 line-clamp-2">{profile.bio}</p>
                    )}

                    {profile.is_popped_up && profile.popup_message && (
                      <div className="mt-3 p-2 bg-violet-50 rounded-lg">
                        <p className="text-xs text-violet-700 italic line-clamp-2">
                          "{profile.popup_message}"
                        </p>
                      </div>
                    )}
                  </div>
                  {blockedUsers.some(b => b.blocked_email === profile.user_email) && (
                    <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                      <span className="bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-semibold">Blocked</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {[
                { key: 'display_name', label: 'Display Name' },
                { key: 'bio', label: 'Bio', multiline: true },
                { key: 'age', label: 'Age', type: 'number' },
                { key: 'gender', label: 'Gender' },
                { key: 'interested_in', label: 'Interested In' },
                { key: 'looking_for', label: 'Looking For' },
              ].map(({ key, label, multiline, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
                  {multiline ? (
                    <textarea
                      value={editForm[key] || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none resize-none"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={type || 'text'}
                      value={editForm[key] || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="rounded-lg border-slate-200 focus:border-purple-400"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ZIP Code</label>
                <Input
                  type="text"
                  value={editForm.zip_code || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditForm((f) => ({ ...f, zip_code: val }));
                    if (val.length >= 5) {
                      fetchCityFromZipCode(val);
                    }
                  }}
                  className="rounded-lg border-slate-200 focus:border-purple-400"
                  placeholder="Enter ZIP to auto-fill city/state"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">City</label>
                  <Input
                    type="text"
                    value={editForm.city || ''}
                    placeholder="Auto-filled based on ZIP Code"
                    className="rounded-lg border-slate-200 bg-gray-50"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">State</label>
                  <Input
                    type="text"
                    value={editForm.state || ''}
                    placeholder="Auto-filled based on ZIP Code"
                    className="rounded-lg border-slate-200 bg-gray-50"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Country</label>
                  <Input
                    type="text"
                    value={editForm.country || ''}
                    placeholder="Auto-filled based on ZIP Code"
                    className="rounded-lg border-slate-200 bg-gray-50"
                    disabled={true}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                onClick={handleSaveEdit}
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button onClick={() => setEditingProfile(null)} variant="outline" className="rounded-xl">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete User Account</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 py-2">
              Are you sure you want to delete <strong>{confirmDelete?.display_name || 'this user'}</strong>? This will permanently remove their account and all associated data (messages, profile, subscriptions).
            </p>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => confirmDelete?.user_email && deleteProfileMutation.mutate(confirmDelete)}
                disabled={deleteProfileMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {deleteProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
              <Button onClick={() => setConfirmDelete(null)} variant="outline" className="rounded-xl">
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}