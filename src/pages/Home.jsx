// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import CityMap from '@/components/map/CityMap';
import PopToggle from '@/components/popup/PopToggle';
import LocationService from '@/components/location/LocationService';
import MapSoundNotifications from '@/components/map/MapSoundNotifications';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Settings, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ScrollControl from '@/components/map/ScrollControl';
import NavigationMenu from '@/components/navigation/NavigationMenu';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
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

  const { data: activeUsers = [] } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ is_popped_up: true });
      return profiles;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const allMessages = await base44.entities.Message.filter({
        receiver_email: user.email,
        read: false
      });
      return allMessages.length;
    },
    enabled: !!user?.email,
    refetchInterval: 5000
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (myProfile) {
        return base44.entities.UserProfile.update(myProfile.id, data);
      } else {
        return base44.entities.UserProfile.create({
          user_email: user.email,
          display_name: user.full_name,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
    }
  });

  const handleLocationUpdate = useCallback((locationInfo) => {
    setUserLocation(locationInfo);
    if (user?.email) {
      // Update GPS coordinates and location name
      const updateData = {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
        location: locationInfo.city, // Save the city/location name
        last_location_update: locationInfo.timestamp
      };
      
      updateProfileMutation.mutate(updateData);
    }
  }, [user?.email]);

  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    if (myProfile?.popup_message) {
      setPopupMessage(myProfile.popup_message);
    }
  }, [myProfile?.popup_message]);

  const handlePopToggle = async (isPopping) => {
    if (isPopping && !popupMessage.trim()) {
      return; // Don't allow popping up without a message
    }

    setIsUpdating(true);
    await updateProfileMutation.mutateAsync({
      is_popped_up: isPopping,
      popup_message: isPopping ? popupMessage : ''
    });
    setIsUpdating(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-violet-200 mb-4"></div>
          <div className="h-4 w-32 bg-violet-100 rounded"></div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div></div>

          <div className="flex items-center gap-2">
            <NavigationMenu unreadCount={unreadCount} />
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <Link to={createPageUrl('Profile')}>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-violet-200">
                <img
                  src={myProfile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
                  alt="Profile"
                  className="w-full h-full object-cover" />

              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Sound Notifications */}
      <MapSoundNotifications
        activeUsers={activeUsers}
        userLocation={userLocation}
        currentUserEmail={user?.email}
        currentUserProfile={myProfile} />


      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Members Online Button */}
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}>
            <Link to={createPageUrl('OnlineMembers') + '?from=home'}>
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 text-sm font-semibold"
                style={{ zIndex: 1000 }}>
                <User className="w-4 h-4" />
                Members Popped Up ({activeUsers.length})
              </Button>
            </Link>
          </motion.div>

          {/* Location Status */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}>

            <LocationService onLocationUpdate={handleLocationUpdate} />
          </motion.div>

          {/* Map */}
          <motion.div
            className="h-[60vh] rounded-2xl overflow-hidden shadow-2xl mb-8 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}>

            <CityMap
              activeUsers={activeUsers}
              currentUserProfile={myProfile}
              userLocation={userLocation}
              onProfileClick={(profile) => navigate(createPageUrl('Profile') + '?user=' + profile.user_email)} />

            <ScrollControl />
          </motion.div>

          {/* Pop Up Control - Below the map */}
          <motion.div
            className="w-full max-w-2xl mx-auto mt-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}>

            {!myProfile?.display_name ?
            <div className="flex justify-center">
                <Link to={createPageUrl('Profile')}>
                  <Button className="px-8 py-6 text-lg rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-xl hover:shadow-2xl">
                    <User className="w-5 h-5 mr-2" />
                    Complete Your Profile First
                  </Button>
                </Link>
              </div> :

            <div className="bg-slate-300 p-6 rounded-3xl backdrop-blur-lg shadow-2xl border border-violet-100">
                {!myProfile?.is_popped_up ?
              <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-violet-500" />
                      <label className="text-sm font-semibold text-slate-700">
                        What are you looking for?
                      </label>
                    </div>
                    <Textarea
                  value={popupMessage}
                  onChange={(e) => setPopupMessage(e.target.value)}
                  placeholder="E.g., Looking for someone to grab coffee with tonight..." className="bg-slate-50 text-black px-3 py-2 text-base rounded-xl flex min-h-[60px] w-full border shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none border-violet-200 focus:border-violet-400"

                  rows={2}
                  disabled={isUpdating} />

                    <div className="flex justify-center">
                      <PopToggle
                    isPopped={false}
                    onToggle={handlePopToggle}
                    isLoading={isUpdating}
                    disabled={!popupMessage.trim()} />

                    </div>
                  </div> :

              <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold text-green-700">You're Live</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {activeUsers.length - 1} others nearby
                      </span>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-violet-50 to-rose-50 rounded-xl border border-violet-100">
                      <p className="text-sm text-slate-700 italic">"{myProfile.popup_message}"</p>
                    </div>
                    <div className="flex justify-center">
                      <PopToggle
                    isPopped={true}
                    onToggle={handlePopToggle}
                    isLoading={isUpdating} />

                    </div>
                  </div>
              }
              </div>
            }
          </motion.div>
        </div>
        </main>
        </div>);

}