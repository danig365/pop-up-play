import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, MessageCircle, Loader2, MapPin, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BlockButton from '@/components/blocking/BlockButton';

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

export default function OnlineMembers() {
  const [user, setUser] = useState(null);
  const [interestFilter, setInterestFilter] = useState('');
  const [backUrl, setBackUrl] = useState('Menu');
  const [geocodedCities, setGeocodedCities] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    if (fromParam === 'home') {
      setBackUrl('Home');
    }
  }, []);

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

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.BlockedUser.filter({ blocker_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: activeProfiles = [], isLoading } = useQuery({
    queryKey: ['activeProfiles'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ is_popped_up: true });
      return profiles;
    },
    refetchInterval: 30000,
    enabled: !!user?.email
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  // Reverse geocode GPS coordinates to get city
  useEffect(() => {
    const geocodeProfiles = async () => {
      const newCities = {};
      for (const profile of activeProfiles) {
        if (profile.latitude && profile.longitude && !geocodedCities[profile.id]) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${profile.latitude}&lon=${profile.longitude}&format=json`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            if (city) {
              newCities[profile.id] = city;
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
          }
        }
      }
      if (Object.keys(newCities).length > 0) {
        setGeocodedCities(prev => ({ ...prev, ...newCities }));
      }
    };
    
    if (activeProfiles.length > 0) {
      geocodeProfiles();
    }
  }, [activeProfiles]);

  const filteredProfiles = React.useMemo(() => {
    let profiles = activeProfiles
      .map(profile => {
        const distance = myProfile?.latitude && myProfile?.longitude
          ? calculateDistance(myProfile.latitude, myProfile.longitude, profile.latitude, profile.longitude)
          : null;
        const gpsCity = geocodedCities[profile.id];
        const isBlocked = blockedUsers.some(b => b.blocked_email === profile.user_email);
        return { ...profile, distance, gpsCity, isBlocked };
      });
    
    // Filter by interests
    if (interestFilter.trim()) {
      profiles = profiles.filter(p => 
        p.interests && p.interests.some(interest => 
          interest.toLowerCase().includes(interestFilter.toLowerCase())
        )
      );
    }
    
    // Sort by distance (closest first)
    profiles.sort((a, b) => {
      if (a.distance === null || a.distance === undefined) return 1;
      if (b.distance === null || b.distance === undefined) return -1;
      return a.distance - b.distance;
    });
    
    return profiles;
  }, [activeProfiles, myProfile, blockedUsers, interestFilter, geocodedCities]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const handleVideoCall = (otherUserEmail) => {
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    navigate(createPageUrl('VideoCall') + `?user=${otherUserEmail}&callId=${callId}&from=onlinemembers`);
  };

  const handleChat = (otherUserEmail) => {
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
          className="mb-6"
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
        </motion.div>

        {/* Stats */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm p-4 mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-2xl font-bold text-violet-600">{filteredProfiles.length}</p>
          <p className="text-sm text-slate-500">Members Online</p>
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
            {filteredProfiles.map((profile, index) => (
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
                  onClick={() => navigate(createPageUrl('Profile') + '?user=' + profile.user_email + '&back=OnlineMembers')}
                >
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'}
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
                      className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </Button>
                    <BlockButton 
                      targetUserEmail={profile.user_email} 
                      currentUserEmail={user?.email}
                      variant="outline"
                    />
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
      </main>
    </div>
  );
}