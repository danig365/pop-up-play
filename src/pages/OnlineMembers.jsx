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
import { DEFAULT_AVATAR_TEMPLATE } from '@/lib/avatarTemplate';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getLiveCoords(profile) {
  const lat = Number(profile?.latitude);
  const lon = Number(profile?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

function calculateGpsDistanceMiles(source, target) {
  const dLat = toRadians(target.lat - source.lat);
  const dLon = toRadians(target.lon - source.lon);
  const lat1 = toRadians(source.lat);
  const lat2 = toRadians(target.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

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
  const INITIAL_VISIBLE = 6;
  const LOAD_MORE_STEP = 6;

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [screenNameFilter, setScreenNameFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [backUrl, setBackUrl] = useState('Menu');
  const [liveLocationsByProfileId, setLiveLocationsByProfileId] = useState({});
  const [distanceByProfileId, setDistanceByProfileId] = useState({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [distanceProgress, setDistanceProgress] = useState({ resolved: 0, total: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const { guardAction } = useSubscription();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const pendingRestoreScrollRef = useRef(null);
  const pendingRestoreCountRef = useRef(null);

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
    setLiveLocationsByProfileId({});
    // Restore scroll from sessionStorage when returning from a profile, otherwise reset
    const savedScroll = sessionStorage.getItem('onlineMembers_scrollY');
    const savedCount = sessionStorage.getItem('onlineMembers_visibleCount');
    if (savedScroll !== null) {
      sessionStorage.removeItem('onlineMembers_scrollY');
      sessionStorage.removeItem('onlineMembers_visibleCount');
      const count = Math.max(INITIAL_VISIBLE, parseInt(savedCount || String(INITIAL_VISIBLE), 10));
      pendingRestoreCountRef.current = count;
      setVisibleCount(count);
      pendingRestoreScrollRef.current = parseInt(savedScroll, 10);
    } else {
      setVisibleCount(INITIAL_VISIBLE);
    }

    // Invalidate stale data but keep cache for fast re-renders
    queryClient.invalidateQueries({ queryKey: ['activeProfiles'] });

    const params = new URLSearchParams(location.search);
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
  }, [location.pathname, location.search, queryClient]);

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
    refetchInterval: 5000,
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

  // Use live location labels from profile updates (location/city)
  useEffect(() => {
    const newLocations = {};
    for (const profile of activeProfiles) {
      if (!liveLocationsByProfileId[profile.id]) {
        const locationText = String(profile.location || profile.city || '').trim();
        if (locationText) {
          newLocations[profile.id] = locationText;
        }
      }
    }
    if (Object.keys(newLocations).length > 0) {
      setLiveLocationsByProfileId(prev => ({ ...prev, ...newLocations }));
    }
  }, [activeProfiles, liveLocationsByProfileId]);

  // Calculate distances using live GPS coordinates only (no ZIP geocode fallback)
  useEffect(() => {
    const total = activeProfiles.length;
    setDistanceProgress({ resolved: 0, total });
    setDistanceByProfileId({});

    if (!total) return;

    const currentUserProfile = activeProfiles.find(p => p.user_email === user?.email) || myProfile || null;
    const currentUserCoords = getLiveCoords(currentUserProfile);

    if (!currentUserCoords) {
      setDistanceProgress({ resolved: total, total });
      return;
    }

    const computed = {};
    for (const profile of activeProfiles) {
      const targetCoords = getLiveCoords(profile);
      computed[profile.id] = targetCoords
        ? calculateGpsDistanceMiles(currentUserCoords, targetCoords)
        : null;
    }

    setDistanceByProfileId(computed);
    setDistanceProgress({ resolved: total, total });
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
        const liveLocation = liveLocationsByProfileId[profile.id] || String(profile.location || profile.city || '').trim();
        const isBlocked = blockedUsers.some(b => b.blocked_email === profile.user_email);
        return { ...profile, distance, liveLocation, isBlocked };
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
        const locationText = (p.liveLocation || '').trim().toLowerCase();
        const state = (p.state || '').trim().toLowerCase();
        const zip = (p.zip_code || '').trim().toLowerCase();
        const country = (p.country || '').trim().toLowerCase();
        
        // Check if search term is a state name or abbreviation
        const stateAbbrev = stateMapping[searchTerm];
        const matchesState = state.includes(searchTerm) || 
                            (stateAbbrev && state.includes(stateAbbrev.toLowerCase()));
        
        return locationText.includes(searchTerm) || 
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
  }, [activeProfiles, distanceByProfileId, blockedUsers, screenNameFilter, interestFilter, locationFilter, liveLocationsByProfileId, originalOrderMap]);

  // Reset visible count when filters or data change
  useEffect(() => {
    if (pendingRestoreCountRef.current !== null) {
      return;
    }
    setVisibleCount(INITIAL_VISIBLE);
  }, [screenNameFilter, interestFilter, locationFilter, activeProfiles.length]);

  useEffect(() => {
    if (isLoading || userLoading) return;
    const targetScroll = pendingRestoreScrollRef.current;
    if (targetScroll === null) return;

    let attempts = 0;
    const tryScroll = () => {
      const pageHeight = document.documentElement.scrollHeight;
      if (pageHeight > targetScroll + window.innerHeight || attempts > 20) {
        window.scrollTo({ top: targetScroll, left: 0, behavior: 'auto' });
        pendingRestoreScrollRef.current = null;
        pendingRestoreCountRef.current = null;
      } else {
        attempts++;
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [isLoading, userLoading, visibleCount, filteredProfiles.length]);

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
    sessionStorage.setItem('onlineMembers_scrollY', String(Math.round(window.scrollY || 0)));
    sessionStorage.setItem('onlineMembers_visibleCount', String(visibleCount));
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    navigate(createPageUrl('VideoCall') + `?user=${otherUserEmail}&callId=${callId}&from=onlinemembers`);
  };

  const handleChat = (otherUserEmail) => {
    if (!guardAction('send messages')) return;
    sessionStorage.setItem('onlineMembers_scrollY', String(Math.round(window.scrollY || 0)));
    sessionStorage.setItem('onlineMembers_visibleCount', String(visibleCount));
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
          <div className="space-y-1">
            {visibleProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <div className="bg-white rounded-xl overflow-hidden border border-slate-100 transition-all hover:bg-slate-50 hover:border-slate-200 hover:shadow-md p-3 flex items-center gap-3">
                  {/* Avatar with Gender */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200 cursor-pointer" onClick={() => {
                      if (!guardAction('view full profiles')) return;
                      sessionStorage.setItem('onlineMembers_scrollY', String(Math.round(window.scrollY || 0)));
                      sessionStorage.setItem('onlineMembers_visibleCount', String(visibleCount));
                      navigate(
                        createPageUrl('Profile') +
                        '?user=' + encodeURIComponent(profile.user_email) +
                        '&back=OnlineMembers'
                      );
                    }}>
                      <img
                        src={profile.avatar_url || DEFAULT_AVATAR_TEMPLATE}
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                      {profile.is_popped_up && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white shadow"></div>
                      )}
                    </div>
                    {profile.gender && (
                      <span className="text-[10px] text-slate-600 font-medium mt-1 text-center">
                        {profile.gender}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm truncate cursor-pointer hover:text-violet-600" onClick={() => {
                        if (!guardAction('view full profiles')) return;
                        sessionStorage.setItem('onlineMembers_scrollY', String(Math.round(window.scrollY || 0)));
                        sessionStorage.setItem('onlineMembers_visibleCount', String(visibleCount));
                        navigate(
                          createPageUrl('Profile') +
                          '?user=' + encodeURIComponent(profile.user_email) +
                          '&back=OnlineMembers'
                        );
                      }}>
                        {profile.display_name || 'Anonymous'}
                      </h3>
                      {profile.age && (
                        <span className="text-xs text-slate-600">{profile.age}</span>
                      )}
                      {profile.user_email === user?.email && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">You</span>
                      )}
                    </div>

                    {profile.liveLocation && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-violet-600 flex-shrink-0" />
                        <span className="truncate">
                          {profile.liveLocation}
                        </span>
                        {profile.distance !== null && profile.distance !== undefined && (
                          <span className="text-purple-600 font-semibold flex-shrink-0">
                            • {profile.distance.toFixed(1)} mi
                          </span>
                        )}
                      </div>
                    )}

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {profile.interests.slice(0, 2).map((interest, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px]">
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{profile.interests.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {profile.interested_in && (
                      <div className="text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">Looking for:</span> {profile.interested_in}
                      </div>
                    )}

                    {profile.popup_message && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                        {profile.popup_message}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex flex-col gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVideoCall(profile.user_email); }}
                      disabled={blockedUsers.some(b => b.blocked_email === profile.user_email)}
                      className="h-8 px-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 whitespace-nowrap shadow-sm"
                      title="Video"
                    >
                      <Video className="w-3 h-3 flex-shrink-0" />
                      <span>Video</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleChat(profile.user_email); }}
                      disabled={blockedUsers.some(b => b.blocked_email === profile.user_email)}
                      className="h-8 px-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-95 text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative transition-all flex items-center justify-center gap-1 whitespace-nowrap shadow-sm"
                      title="Chat"
                    >
                      <MessageCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Chat</span>
                      {(() => {
                        const count = unreadMessages.filter(m => m.sender_email === profile.user_email).length;
                        return count > 0 ? (
                          <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none shadow-lg">
                            {count > 99 ? '99+' : count}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  </div>

                  {profile.isBlocked && (
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-white bg-slate-800 px-2 py-1 rounded">Blocked</span>
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