import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, MessageCircle, Loader2, MapPin, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BlockButton from '@/components/blocking/BlockButton';
import { useSubscription } from '@/lib/SubscriptionContext';
import { getProfileCoords, calculateDistanceMiles, bulkGeocodeProfiles } from '@/lib/zipGeocode';

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

export default function OnlineMembers() {
  const INITIAL_VISIBLE = 12;
  const LOAD_MORE_STEP = 12;
  const DISTANCE_BATCH_SIZE = 30;

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [screenNameFilter, setScreenNameFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [backUrl, setBackUrl] = useState('Menu');
  const [geocodedCities, setGeocodedCities] = useState({});
  const [distanceByProfileId, setDistanceByProfileId] = useState({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [distanceProgress, setDistanceProgress] = useState({ resolved: 0, total: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const { guardAction } = useSubscription();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);

  // Reset state whenever the page is accessed
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Detect route changes and reset state
  useEffect(() => {
    isMountedRef.current = true;
    
    // Reset filters when component mounts or route changes
    setScreenNameFilter('');
    setInterestFilter('');
    setLocationFilter('');
    setGeocodedCities({});
    setVisibleCount(INITIAL_VISIBLE);
    
    // Invalidate stale data but keep cache for fast re-renders
    queryClient.invalidateQueries({ queryKey: ['activeProfiles'] });
    
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    if (fromParam === 'home') {
      setBackUrl('Home');
    } else {
      setBackUrl('Menu');
    }

    // Load user data
    const loadUser = async () => {
      try {
        if (!isMountedRef.current) return;
        setUserLoading(true);
        const currentUser = await base44.auth.me();
        if (isMountedRef.current) {
          setUser(currentUser);
        }
      } catch (err) {
        if (isMountedRef.current) {
          base44.auth.redirectToLogin();
        }
      } finally {
        if (isMountedRef.current) {
          setUserLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMountedRef.current = false;
    };
  }, [location.pathname, queryClient]);

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.BlockedUser.filter({ blocker_email: user.email });
    },
    enabled: !!user?.email && !userLoading,
    staleTime: 5000
  });

  const { data: activeProfiles = [], isLoading } = useQuery({
    queryKey: ['activeProfiles'],
    queryFn: async () => {
      try {
        await base44.functions.invoke('cleanupStalePopups', {});
      } catch (error) {
        console.warn('Failed to cleanup stale popups:', error?.message || error);
      }
      const profiles = await base44.entities.UserProfile.filter({ is_popped_up: true });
      return profiles;
    },
    refetchInterval: 30000,
    staleTime: 3000,
    enabled: !!user?.email && !userLoading,
    gcTime: 0
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email && !userLoading,
    staleTime: 5000
  });

  // Fetch unread messages for current user to show per-user badge counts
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unreadMessages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Message.filter({ receiver_email: user.email, read: false });
    },
    enabled: !!user?.email && !userLoading,
    refetchInterval: 5000,
    gcTime: 0
  });

  // Use existing profile city/location data instead of reverse geocoding
  useEffect(() => {
    const newCities = {};
    for (const profile of activeProfiles) {
      if (!geocodedCities[profile.id]) {
        const city = profile.city || profile.location || '';
        if (city) {
          newCities[profile.id] = city;
        }
      }
    }
    if (Object.keys(newCities).length > 0) {
      setGeocodedCities(prev => ({ ...prev, ...newCities }));
    }
  }, [activeProfiles]);

  // Progressive background distance calculation in batches (non-blocking UI)
  useEffect(() => {
    let cancelled = false;

    const calculateDistancesProgressively = async () => {
      if (!cancelled) {
        setDistanceByProfileId({});
        setDistanceProgress({ resolved: 0, total: activeProfiles.length });
      }

      if (!activeProfiles.length) return;

      // Geocode current user first
      const sourceProfile = myProfile || activeProfiles.find(p => p.user_email === user?.email) || null;
      if (sourceProfile) {
        await bulkGeocodeProfiles([sourceProfile]);
      }
      if (cancelled) return;

      const myCoords = getProfileCoords(sourceProfile);
      if (!myCoords) {
        if (!cancelled) setDistanceProgress({ resolved: activeProfiles.length, total: activeProfiles.length });
        return;
      }

      let processed = 0;

      for (let i = 0; i < activeProfiles.length; i += DISTANCE_BATCH_SIZE) {
        const batch = activeProfiles.slice(i, i + DISTANCE_BATCH_SIZE);
        await bulkGeocodeProfiles(batch);
        if (cancelled) return;

        const batchResults = {};
        for (const profile of batch) {
          const coords = getProfileCoords(profile);
          batchResults[profile.id] = coords
            ? calculateDistanceMiles(myCoords.lat, myCoords.lon, coords.lat, coords.lon)
            : null;
        }

        setDistanceByProfileId(prev => ({ ...prev, ...batchResults }));

        processed += batch.length;
        if (!cancelled) {
          setDistanceProgress({ resolved: processed, total: activeProfiles.length });
        }

        // Yield to UI thread between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };

    calculateDistancesProgressively();

    return () => { cancelled = true; };
  }, [activeProfiles, myProfile, user?.email]);

  // Stable original order for tie-breaking during live sort
  const originalOrderMap = React.useMemo(() => {
    const map = new Map();
    activeProfiles.forEach((profile, index) => map.set(profile.id, index));
    return map;
  }, [activeProfiles]);

  const filteredProfiles = React.useMemo(() => {
    let profiles = activeProfiles
      .map(profile => {
        const distance = distanceByProfileId[profile.id] ?? null;
        const gpsCity = geocodedCities[profile.id];
        const isBlocked = blockedUsers.some(b => b.blocked_email === profile.user_email);
        return { ...profile, distance, gpsCity, isBlocked };
      });

    // Filter by screen/display name
    if (screenNameFilter.trim()) {
      const terms = screenNameFilter
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      profiles = profiles.filter(p => {
        const combinedName = `${p.display_name || ''} ${p.name || ''}`.trim().toLowerCase();
        return terms.every(term => combinedName.includes(term));
      });
    }
    
    // Filter by interests
    if (interestFilter.trim()) {
      profiles = profiles.filter(p => 
        p.interests && p.interests.some(interest => 
          interest.trim().toLowerCase().includes(interestFilter.trim().toLowerCase())
        )
      );
    }

    // Filter by location
    if (locationFilter.trim()) {
      profiles = profiles.filter(p => {
        const searchTerm = locationFilter.trim().toLowerCase();
        const city = (p.gpsCity || p.city || '').trim().toLowerCase();
        const state = (p.state || '').trim().toLowerCase();
        const zip = (p.zip_code || '').trim().toLowerCase();
        const country = (p.country || '').trim().toLowerCase();
        
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
    
    // Sort: known distances first (nearest→farthest), unknown at end, stable tie-breaker
    profiles.sort((a, b) => {
      if (a.distance === null && b.distance === null) {
        return (originalOrderMap.get(a.id) || 0) - (originalOrderMap.get(b.id) || 0);
      }
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (originalOrderMap.get(a.id) || 0) - (originalOrderMap.get(b.id) || 0);
    });
    
    return profiles;
  }, [activeProfiles, distanceByProfileId, blockedUsers, screenNameFilter, interestFilter, locationFilter, geocodedCities, originalOrderMap]);

  // Reset visible count when filters or data change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [screenNameFilter, interestFilter, locationFilter, activeProfiles.length]);

  const visibleProfiles = React.useMemo(
    () => filteredProfiles.slice(0, visibleCount),
    [filteredProfiles, visibleCount]
  );

  const canLoadMore = visibleCount < filteredProfiles.length;

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Unable to load user information</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const handleVideoCall = (otherUserEmail) => {
    if (!guardAction('make video calls')) return;
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    navigate(createPageUrl('VideoCall') + `?user=${otherUserEmail}&callId=${callId}&from=onlinemembers`);
  };

  const handleChat = (otherUserEmail) => {
    if (!guardAction('send messages')) return;
    navigate(createPageUrl('Chat') + `?user=${otherUserEmail}&from=onlinemembers`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl(backUrl)}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" />
            <h1 className="text-lg font-semibold text-violet-600">Popped Up Now</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                placeholder="Filter by name (e.g., Mike, Sarah Johnson)..."
                value={screenNameFilter}
                onChange={(e) => setScreenNameFilter(e.target.value)}
                className="flex-1 rounded-xl border-purple-300 focus:border-purple-500" />
              {screenNameFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreenNameFilter('')}
                  className="text-slate-500">
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-purple-600" />
              <Input
                placeholder="Filter by interests (e.g., Couples, BBC, Unicorns)..."
                value={interestFilter}
                onChange={(e) => setInterestFilter(e.target.value)}
                className="flex-1 rounded-xl border-purple-300 focus:border-purple-500" />
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
                className="flex-1 rounded-xl border-purple-300 focus:border-purple-500" />
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

        {/* Stats */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm p-4 mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-2xl font-bold text-violet-600">{filteredProfiles.length}</p>
          <p className="text-sm text-slate-500">Members Online</p>
          {distanceProgress.total > 0 && distanceProgress.resolved < distanceProgress.total && (
            <p className="text-xs text-slate-400 mt-1">
              Calculating distances... {distanceProgress.resolved}/{distanceProgress.total}
            </p>
          )}
        </motion.div>

        {/* Members Grid */}
        {filteredProfiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No one online
            </h3>
            <p className="text-sm text-slate-500">
              Check back later to see who's around
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Profile Image */}
                <div 
                  className="relative h-64 bg-gradient-to-br from-violet-100 to-rose-100 cursor-pointer"
                  onClick={() => {
                    if (!guardAction('view full profiles')) return;
                    navigate(createPageUrl('Profile') + '?user=' + profile.user_email + '&back=OnlineMembers');
                  }}
                >
                  <img
                    src={profile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Active
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {profile.display_name}{profile.age && `, ${profile.age}`}
                      </h3>
                      {profile.gpsCity && (
                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1 flex-wrap">
                          <MapPin className="w-3 h-3 text-violet-600" />
                          {profile.gpsCity}
                          {profile.distance !== null && profile.distance !== undefined && (
                            <span className="text-purple-600 font-semibold ml-1">
                              • {profile.distance.toFixed(1)} mi
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-1">
                            Popped Up
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {profile.interests && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
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

                  {profile.popup_message && (
                    <div className="bg-violet-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-700 italic line-clamp-2">
                        "{profile.popup_message}"
                      </p>
                    </div>
                  )}

                  {profile.bio && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVideoCall(profile.user_email)}
                      disabled={profile.isBlocked}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="w-4 h-4" />
                      Video Verify
                    </Button>
                    <Button
                      onClick={() => handleChat(profile.user_email)}
                      disabled={profile.isBlocked}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                      {(() => {
                        const count = unreadMessages.filter(m => m.sender_email === profile.user_email).length;
                        return count > 0 ? (
                          <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none shadow">
                            {count > 99 ? '99+' : count}
                          </span>
                        ) : null;
                      })()}
                    </Button>
                    {/* <BlockButton 
                      targetUserEmail={profile.user_email} 
                      currentUserEmail={user?.email}
                      variant="outline"
                    /> */}
                  </div>
                  {profile.isBlocked && (
                    <div className="mt-2 text-center">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Blocked User</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {canLoadMore && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => setVisibleCount(count => count + LOAD_MORE_STEP)}
              variant="outline"
              className="rounded-xl"
            >
              Load more members
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}