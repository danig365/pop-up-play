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

export default function Dashboard() {
  const [user, setUser] = useState(null);
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

  const { data: myProfile, isLoading } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });



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
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-violet-100">
              <img
                src={myProfile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'}
                alt="Profile"
                className="w-full h-full object-cover" />

            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800">
                {myProfile?.display_name || user.full_name || 'Anonymous'}
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