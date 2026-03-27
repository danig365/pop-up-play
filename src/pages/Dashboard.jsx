// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Eye, EyeOff, Image, Video,
  Settings, LogOut, Trash2, Edit2, Loader2, Clock, Ban, CreditCard } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
'@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { getLocationPermissionState, isLocationEnabled, requestCurrentLocation, setLocationEnabled } from '@/lib/locationPermission';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [locationEnabled, setLocationEnabledState] = useState(() => isLocationEnabled());
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const queryClient = useQueryClient();

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

  useEffect(() => {
    const loadPermission = async () => {
      const state = await getLocationPermissionState();
      setLocationPermission(state);
    };

    loadPermission();
  }, []);

  const { data: myProfile, isLoading } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });



  const getLocationStatusText = () => {
    if (!locationEnabled) {
      return 'Disabled in app';
    }

    if (locationPermission === 'granted') {
      return 'Allowed in browser';
    }

    if (locationPermission === 'denied') {
      return 'Blocked in browser';
    }

    if (locationPermission === 'prompt') {
      return 'Will ask when needed';
    }

    if (locationPermission === 'unsupported') {
      return 'Not supported in this browser';
    }

    return 'Permission state unknown';
  };

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      setLocationLoading(true);
      try {
        if (myProfile?.id && myProfile?.is_popped_up) {
          await base44.entities.UserProfile.update(myProfile.id, {
            is_popped_up: false,
            popup_message: ''
          });
          queryClient.invalidateQueries({ queryKey: ['myProfile'] });
          queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
        }

        setLocationEnabled(false);
        setLocationEnabledState(false);
      } catch (error) {
        console.error('❌ [Dashboard] Failed to disable location:', error);
      } finally {
        setLocationLoading(false);
      }
      return;
    }

    setLocationLoading(true);
    setLocationEnabled(true);
    setLocationEnabledState(true);

    try {
      await requestCurrentLocation();
    } catch (error) {
      console.error('❌ [Dashboard] Location enable failed:', error);
    } finally {
      const permissionState = await getLocationPermissionState();
      setLocationPermission(permissionState);
      setLocationLoading(false);
    }
  };

  const getLocationHelpText = () => {
    if (typeof navigator === 'undefined') {
      return 'Open your browser settings and allow location access for this site, then return and tap Enable again.';
    }

    const userAgent = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    if (isIOS) {
      return 'iPhone/iPad: Settings > Safari > Location > Allow, then reopen this page and tap Enable.';
    }

    if (isAndroid) {
      return 'Android: Browser site settings > Location > Allow, and make sure device Location is ON.';
    }

    return 'Desktop: Click the lock icon near the address bar, allow Location for this site, then refresh and tap Enable.';
  };

  const handleLogout = async () => {
    console.log('🔄 [Dashboard.handleLogout] Logout button clicked');
    try {
      console.log('🔄 [Dashboard.handleLogout] Calling base44.auth.logout()...');
      await base44.auth.logout();
      console.log('✅ [Dashboard.handleLogout] Logout completed');
    } catch (error) {
      console.error('❌ [Dashboard.handleLogout] Logout failed:', error);
      console.log('🔄 [Dashboard.handleLogout] Forcing redirect...');
      window.location.href = window.location.origin;
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  const stats = [
  {
    label: 'Photos',
    value: myProfile?.photos?.length || 0,
    icon: Image,
    color: 'from-violet-500 to-purple-500'
  },
  {
    label: 'Videos',
    value: myProfile?.videos?.length || 0,
    icon: Video,
    color: 'from-rose-500 to-pink-500'
  },
  {
    label: 'Status',
    value: myProfile?.is_popped_up ? 'Live' : 'Hidden',
    icon: myProfile?.is_popped_up ? Eye : EyeOff,
    color: myProfile?.is_popped_up ? 'from-green-500 to-emerald-500' : 'from-slate-400 to-slate-500'
  }];


  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 min-w-[4rem] sm:min-w-[5rem] rounded-full overflow-hidden border-4 border-violet-100 flex-shrink-0 aspect-square">
              <img
                src={myProfile?.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                alt="Profile"
                className="w-full h-full object-cover rounded-full" />

            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800">
                {myProfile?.display_name || user.name || 'Anonymous'}
              </h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              {myProfile?.current_city &&
              <div className="flex items-center gap-1 mt-1 text-sm text-violet-600">
                  <MapPin className="w-4 h-4" />
                  {myProfile.current_city}
                </div>
              }
            </div>
            <Link to={createPageUrl('Profile') + '?back=Dashboard'}>
              <Button variant="outline" size="icon" className="rounded-full">
                <Edit2 className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) =>
            <motion.div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}>

                <div className={`w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </motion.div>
            )}
          </div>
        </motion.div>



        {/* Quick Actions */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>

          <Link to={createPageUrl('Profile') + '?back=Dashboard'}>
            <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">Edit Profile</p>
                <p className="text-sm text-slate-500">Update your photos, bio, and more</p>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl('BlockedUsers') + '?from=dashboard'}>
            <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">Blocked Users</p>
                <p className="text-sm text-slate-500">Manage your blocked list</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4 p-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">Location Access</p>
              <p className="text-sm text-slate-500">{getLocationStatusText()}</p>
            </div>
            <Button
              variant={locationEnabled ? 'outline' : 'default'}
              onClick={handleLocationToggle}
              disabled={locationLoading}
              className={`min-w-[96px] ${
                locationEnabled
                  ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : locationEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {locationPermission === 'denied' &&
          <div className="px-4 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-end mb-2">
                <Button
                variant="link"
                className="h-auto p-0 text-sm text-violet-700"
                onClick={() => setShowLocationHelp((prev) => !prev)}>
                  {showLocationHelp ? 'Hide settings help' : 'How to enable in browser settings'}
                </Button>
              </div>
              {showLocationHelp &&
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  {getLocationHelpText()}
                </p>
            }
            </div>
          }

          {user?.role === 'admin' && (
            <Link to={createPageUrl('SubscriptionSettings') + '?from=dashboard'}>
              <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Subscription Settings</p>
                  <p className="text-sm text-slate-500">Configure membership & pricing</p>
                </div>
              </div>
            </Link>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-600">Sign Out</p>
                  <p className="text-sm text-slate-500">Log out of your account</p>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign in again to use the app.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout} className="bg-red-600 text-slate-100 px-4 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-red-700">


                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </main>
    </div>);

}