import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Ban, Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function BlockedUsers() {
  const [user, setUser] = useState(null);
  const [backUrl, setBackUrl] = useState(createPageUrl('Home'));
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    if (fromParam === 'dashboard') {
      setBackUrl(createPageUrl('Dashboard'));
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

  const { data: blockedUsers = [], isLoading } = useQuery({
    queryKey: ['blockedUsers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.BlockedUser.filter({ blocker_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!user?.email
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockId) => {
      await base44.entities.BlockedUser.delete(blockId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      toast.success('User unblocked');
    },
    onError: () => {
      toast.error('Failed to unblock user');
    }
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const blockedProfiles = blockedUsers
    .map(blocked => ({
      ...blocked,
      profile: profiles.find(p => p.user_email === blocked.blocked_email)
    }))
    .filter(item => item.profile);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={backUrl}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Blocked Users</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {blockedProfiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <UserX className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No blocked users
            </h3>
            <p className="text-sm text-slate-500">
              Users you block will appear here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {blockedProfiles.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4"
              >
                <img
                  src={item.profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop'}
                  alt={item.profile.display_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {item.profile.display_name}
                  </h3>
                  <p className="text-sm text-slate-500 truncate">
                    {item.profile.bio || 'No bio'}
                  </p>
                </div>
                <Button
                  onClick={() => unblockMutation.mutate(item.id)}
                  disabled={unblockMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {unblockMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Unblock
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}