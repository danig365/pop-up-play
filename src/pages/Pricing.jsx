// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const { data: settings } = useQuery({
    queryKey: ['subscriptionSettings'],
    queryFn: async () => {
      const results = await base44.entities.SubscriptionSettings.list();
      // Get the most recently updated settings (in case there are multiple records)
      if (results.length > 0) {
        return results.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];
      }
      return null;
    }
  });

  const { data: subscription } = useQuery({
    queryKey: ['userSubscription', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const subs = await base44.entities.UserSubscription.filter({
        user_email: user.email
      });
      return subs[0] || null;
    },
    enabled: !!user
  });

  const handleSubscribe = async () => {
    // Redirect to access code page for users to redeem their subscription code
    window.location.href = createPageUrl('EnterAccessCode');
  };

  if (!user || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const trialDaysRemaining = subscription?.trial_end 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Pricing</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-12 px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600">
            Get unlimited access to all features
          </p>
        </motion.div>

        {subscription?.status === 'trial' && trialDaysRemaining > 0 && (
          <motion.div
            className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-2 text-blue-900">
              <Clock className="w-5 h-5" />
              <p className="font-semibold">
                {trialDaysRemaining} days left in your free trial
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          className="max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-violet-200">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-8 text-white text-center">
              <Crown className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Premium Membership</h2>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">${settings.monthly_price}</span>
                <span className="text-xl opacity-90">/month</span>
              </div>
              {settings.free_trial_enabled && !subscription && (
                <p className="mt-4 text-sm opacity-90">
                  {settings.trial_days}-day free trial included
                </p>
              )}
            </div>

            <div className="p-8">
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Access to all profiles</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Unlimited messaging</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Video chat capabilities</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Map visibility</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Priority support</span>
                </li>
              </ul>

              {subscription?.status === 'active' ? (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                    <Check className="w-5 h-5" />
                    Active Subscription
                  </div>
                  {subscription.current_period_end && (
                    <p className="text-sm text-slate-600">
                      {Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-6 text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Get Started Now'
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-sm text-slate-500 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Cancel anytime. No questions asked.
        </motion.p>
      </div>
    </div>
  );
}