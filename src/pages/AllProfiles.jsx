import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BlockButton from '@/components/blocking/BlockButton';

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
  const [interestFilter, setInterestFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [profilesWithDistance, setProfilesWithDistance] = useState([]);
  const navigate = useNavigate();

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

  // Calculate distances based on ZIP codes
  useEffect(() => {
    const calculateDistances = async () => {
      if (!myProfile?.current_zip) {
        setProfilesWithDistance(allProfiles);
        return;
      }
      
      // Geocode user's ZIP
      const myCoords = await geocodeZip(myProfile.current_zip, myProfile.current_country || 'US');
      if (!myCoords) {
        setProfilesWithDistance(allProfiles);
        return;
      }
      
      // Calculate distances for all profiles
      const profilesWithDist = await Promise.all(
        allProfiles.map(async (profile) => {
          if (!profile.current_zip) {
            return { ...profile, zipDistance: null };
          }
          
          const profileCoords = await geocodeZip(profile.current_zip, profile.current_country || 'US');
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
    let profiles = [...profilesWithDistance]
      .filter(p => p.user_email !== user?.email); // Exclude own profile
    
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
        const city = (p.current_city || '').toLowerCase();
        const state = (p.current_state || '').toLowerCase();
        const zip = (p.current_zip || '').toLowerCase();
        const country = (p.current_country || '').toLowerCase();
        
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
      if (a.zipDistance === null && b.zipDistance === null) {
        // Both have no distance, sort alphabetically
        const aLocation = `${a.current_city || ''} ${a.current_state || ''}`.trim();
        const bLocation = `${b.current_city || ''} ${b.current_state || ''}`.trim();
        return aLocation.localeCompare(bLocation);
      }
      if (a.zipDistance === null) return 1; // a goes to end
      if (b.zipDistance === null) return -1; // b goes to end
      return a.zipDistance - b.zipDistance; // Sort by distance ascending
    });
    
    return profiles;
  }, [profilesWithDistance, blockedUsers, interestFilter, locationFilter]);

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
                placeholder="Filter by interests (e.g., hiking, cooking)..."
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
                className="cursor-pointer"
                onClick={() => navigate(createPageUrl('Profile') + '?user=' + profile.user_email + '&back=AllProfiles')}
              >
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Avatar */}
                  <div className="aspect-square relative">
                    <img
                      src={profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                    {profile.is_popped_up && (
                      <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {profile.display_name || 'Anonymous'}
                      {profile.age && <span className="text-slate-500">, {profile.age}</span>}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 flex-wrap">
                      {(profile.current_city || profile.current_state || profile.current_country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span>
                            {[profile.current_city, profile.current_state, profile.current_country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      {profile.zipDistance !== null && profile.zipDistance !== undefined && (
                        <span className="text-purple-600 font-semibold">
                          • {profile.zipDistance.toFixed(1)} mi
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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

                    {/* Action Buttons */}
                    <div className="mt-4">
                      <BlockButton 
                        targetUserEmail={profile.user_email} 
                        currentUserEmail={user?.email}
                        variant="outline"
                      />
                    </div>
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
      </main>
    </div>
  );
}