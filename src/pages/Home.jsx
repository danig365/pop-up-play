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
import reelsImage from '@/assets/image-removebg-preview.png';

// Preload the reels image immediately
const preloadImg = new Image();
preloadImg.src = reelsImage;
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ScrollControl from '@/components/map/ScrollControl';
import NavigationMenu from '@/components/navigation/NavigationMenu';
import { useSubscription } from '@/lib/SubscriptionContext';
import { isLocationEnabled, requestCurrentLocation, setLocationEnabled } from '@/lib/locationPermission';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [locationEnabled, setLocationEnabledState] = useState(() => isLocationEnabled());
  const [locationError, setLocationError] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { guardAction } = useSubscription();

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

  const { data: myProfile, isLoading: profileLoading } = useQuery({
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

  const { data: unreadMessagesRaw = [] } = useQuery({
    queryKey: ['unreadMessagesList', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const msgs = await base44.entities.Message.filter({
        receiver_email: user.email,
        read: false
      });
      return msgs;
    },
    enabled: !!user?.email,
    refetchInterval: 5000
  });
  const unreadMessages = Array.isArray(unreadMessagesRaw) ? unreadMessagesRaw : [];
  const unreadCount = unreadMessages.length;

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (myProfile) {
        return base44.entities.UserProfile.update(myProfile.id, data);
      } else {
        return base44.entities.UserProfile.create({
          user_email: user.email,
          display_name: user.name || user.email.split('@')[0],
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
      // Update GPS coordinates and location name only - NOT zip_code
      // zip_code is set permanently in the profile edit page
      const updateData = {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
        location: locationInfo.city,
        last_location_update: locationInfo.timestamp
      };
      
      updateProfileMutation.mutate(updateData);
    }
  }, [user?.email]);

  // Auto pop-up ONLY for brand-new users (first signup) once GPS location is acquired
  const autoPopTriggeredRef = React.useRef(false);
  useEffect(() => {
    if (
      !autoPopTriggeredRef.current &&
      myProfile &&
      !myProfile.is_popped_up &&
      !myProfile.has_ever_popped_up &&
      userLocation?.latitude &&
      userLocation?.longitude
    ) {
      // Only auto-pop users who have NEVER popped up before (first signup only)
      autoPopTriggeredRef.current = true;
      const defaultMessage = 'Just joined! Looking to connect.';
      setPopupMessage(defaultMessage);
      updateProfileMutation.mutate({
        is_popped_up: true,
        has_ever_popped_up: true,
        popup_message: defaultMessage,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        location: userLocation.city,
        last_location_update: new Date().toISOString()
      });
    }
  }, [myProfile, userLocation]);

  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    if (myProfile?.popup_message) {
      setPopupMessage(myProfile.popup_message);
    }
  }, [myProfile?.popup_message]);

  const handlePopToggle = async (isPopping) => {
    // No subscription required to pop up
    if (isPopping && !popupMessage.trim()) {
      return; // Don't allow popping up without a message
    }

    setIsUpdating(true);
    setLocationError('');

    try {
      let latestLocation = null;

      if (isPopping) {
        if (!locationEnabled) {
          const shouldEnableLocation = window.confirm('Location is disabled. Enable location access to pop up?');
          if (!shouldEnableLocation) {
            setLocationError('Location access is required to pop up. Please enable location and try again.');
            return;
          }

          setLocationEnabled(true);
          setLocationEnabledState(true);
        }

        latestLocation = await requestCurrentLocation();
        setUserLocation(latestLocation);
        if (!latestLocation?.latitude || !latestLocation?.longitude) {
          setLocationError('Location access is required to pop up. Please enable location and try again.');
          return;
        }
      }

      const updateData = {
        is_popped_up: isPopping,
        popup_message: isPopping ? popupMessage : '',
        last_location_update: isPopping ? new Date().toISOString() : myProfile?.last_location_update
      };

      if (isPopping) {
        updateData.latitude = latestLocation.latitude;
        updateData.longitude = latestLocation.longitude;
        updateData.location = latestLocation.city;
      }

      // Mark that this user has popped up at least once (disables future auto-popup)
      if (isPopping && !myProfile?.has_ever_popped_up) {
        updateData.has_ever_popped_up = true;
      }

      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      if (isPopping) {
        setLocationError(error?.userMessage || 'Location access is required to pop up. Please enable location and try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user || profileLoading) {
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
                  src={myProfile?.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
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
            className="mb-6 flex flex-col items-center gap-3 max-w-sm mx-auto w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}>
            <Link to={createPageUrl('OnlineMembers') + '?from=home'} className="w-full">
              <Button 
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 text-sm font-semibold justify-center"
                style={{ zIndex: 1000 }}>
                <User className="w-4 h-4" />
                Members Popped Up ({activeUsers.length})
              </Button>
            </Link>
            <Link to={createPageUrl('Reels')} state={{ from: 'Home' }} className="w-full">
              <div className="w-full">
                <div className="flex items-center bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all cursor-pointer gap-4">
                  <div className="bg-pink-300 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={reelsImage} alt="Reels" className="w-14 h-14 object-contain" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xl font-[Mashiro] tracking-wide text-black-500 mb-1">Reels</span>
                    <span className="text-base text-slate-500">Watch and share reels</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Location Status */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}>

            <LocationService
              onLocationUpdate={handleLocationUpdate}
              enabled={locationEnabled}
            />
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
              unreadMessages={unreadMessages}
              onProfileClick={(profile) => {
                if (!guardAction('view full profiles')) return;
                navigate(createPageUrl('Profile') + '?user=' + profile.user_email);
              }} />

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
                  <Button className="px-8 py-6 text-lg rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xl hover:shadow-2xl">
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
                  placeholder="E.g., Looking for someone to play with tonight..." className="bg-slate-50 text-black px-3 py-2 text-base rounded-xl flex min-h-[60px] w-full border shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none border-violet-200 focus:border-violet-400"
                  rows={2}
                  disabled={isUpdating} />

                    <div className="flex justify-center">
                      <PopToggle
                    isPopped={false}
                    onToggle={handlePopToggle}
                    isLoading={isUpdating}
                    disabled={!popupMessage.trim()} />

                    </div>
                    {locationError ?
                <p className="text-xs text-rose-600 text-center">{locationError}</p> :
                null}
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