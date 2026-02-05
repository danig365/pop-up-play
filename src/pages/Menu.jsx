import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageCircle, Heart, Users, Info, ArrowLeft, Key, CreditCard, LogOut, Flame, Send, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import reelsImage from '@/assets/image-removebg-preview.png';

export default function Menu() {
  const [user, setUser] = React.useState(null);
// Fetch current user on component mount
  React.useEffect(() => {
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

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    {
      label: 'Chat',
      icon: MessageCircle,
      path: 'Chat',
      badge: unreadCount,
      color: 'bg-purple-400',
      description: 'View your messages'
    },
    {
      label: 'All Profiles',
      icon: Users,
      path: 'AllProfiles',
      color: 'bg-violet-300',
      description: 'Browse all members nearby'
    },
    {
      label: 'Members Popped Up',
      icon: Users,
      path: 'OnlineMembers',
      color: 'bg-emerald-300',
      description: 'See who\'s active now'
    },
    {
      label: 'Reels',
      icon: reelsImage,
      path: 'Reels',
      color: 'bg-pink-300',
      description: 'Watch and share reels',
      isImage: true
    },
    {
      label: 'About',
      icon: Info,
      path: 'About',
      color: 'bg-blue-300',
      description: 'Learn more about us'
    },
    {
      label: 'Access Code',
      icon: Key,
      path: 'EnterAccessCode',
      color: 'bg-amber-300',
      description: 'Redeem your access code'
    },
    {
      label: 'Pricing',
      icon: CreditCard,
      path: 'Pricing',
      color: 'bg-green-300',
      description: 'View membership plans'
    },
    {
      label: 'Sign Out',
      icon: LogOut,
      action: 'logout',
      color: 'bg-red-300',
      description: 'Log out of your account'
    }
  ];

  // Admin-only menu items
  const adminMenuItems = [
    {
      label: 'Access Code Manager',
      icon: Key,
      path: 'AccessCodeManager',
      color: 'bg-indigo-400',
      description: 'Generate and manage access codes',
      adminOnly: true
    },
    {
      label: 'Broadcast Message',
      icon: Send,
      path: 'Broadcast',
      color: 'bg-pink-400',
      description: 'Send messages to all users',
      adminOnly: true
    },
    {
      label: 'Subscription Settings',
      icon: Settings,
      path: 'SubscriptionSettings',
      color: 'bg-teal-400',
      description: 'Configure membership & pricing',
      adminOnly: true
    }
  ];

  // Combine menu items - add admin items before Sign Out if user is admin
  const allMenuItems = isAdmin 
    ? [...menuItems.slice(0, -1), ...adminMenuItems, menuItems[menuItems.length - 1]]
    : menuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Menu</h1>
          <div className="w-9"></div>
        </div>
      </header>

      {/* Menu Items */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Admin Badge */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                <p className="text-sm text-indigo-100">You have admin privileges</p>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="space-y-4">
          {allMenuItems.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`${item.color} w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden`}>
                    {item.isImage ? (
                      <img src={Icon} alt={item.label} className={item.label === 'Reels' ? 'w-14 h-14 object-contain' : 'w-8 h-8 object-contain'} />
                    ) : (
                      <Icon className="w-8 h-8 text-slate-700" />
                    )}
                    {item.badge > 0 && (
                      <NotificationBadge count={item.badge} className="absolute -top-2 -right-2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={
                        `text-xl font-semibold mb-1 relative ` +
                        (item.label === 'Reels' ? ' font-[Mashiro] tracking-wide text-black-500' : 'text-slate-800')
                      }
                    >
                      {item.label === 'Members Popped Up' && (
                        <>
                          <Flame className="w-5 h-5 text-red-500 absolute -left-7 top-0.5" />
                          <Flame className="w-3 h-3 text-yellow-400 absolute -left-6 top-1.5" />
                          <Flame className="w-4 h-4 text-orange-500 absolute -left-9 top-1" />
                          <Flame className="w-3 h-3 text-red-400 absolute -left-5 top-0" />
                          <Flame className="w-2 h-2 text-yellow-300 absolute -left-8 top-2" />
                        </>
                      )}
                      {item.label}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );

            if (item.action === 'logout') {
              return (
                <div key="logout" onClick={async () => {
                  console.log('🔄 [Menu.logout] Logout clicked');
                  try {
                    console.log('🔄 [Menu.logout] Calling base44.auth.logout()...');
                    await base44.auth.logout();
                    console.log('✅ [Menu.logout] Logout completed');
                  } catch (error) {
                    console.error('❌ [Menu.logout] Logout failed:', error);
                    console.log('🔄 [Menu.logout] Forcing redirect...');
                    window.location.href = window.location.origin;
                  }
                }}>
                  {content}
                </div>
              );
            }

            return (
              <Link key={item.path} to={createPageUrl(item.path)}>
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}