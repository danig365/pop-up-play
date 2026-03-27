// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/apiUrl';

const API_BASE_URL = getApiBaseUrl();

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [activating, setActivating] = useState(false);
  const activatedRef = useRef(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  const returnTo =
    location.state?.returnTo ||
    new URLSearchParams(location.search).get('returnTo') ||
    '';

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        // User not logged in - still show success page
      }
    };
    loadUser();
  }, []);

  // Activate subscription from PayPal redirect (subscription_id in URL)
  useEffect(() => {
    if (!user || activatedRef.current) return;

    const activate = async () => {
      // PayPal may place params before or after the hash
      const hashParts = window.location.hash.split('?');
      const hashSearch = hashParts.length > 1 ? hashParts[1] : '';
      const hashParams = new URLSearchParams(hashSearch);
      const windowParams = new URLSearchParams(window.location.search);

      const subscriptionId =
        searchParams.get('subscription_id') ||
        hashParams.get('subscription_id') ||
        windowParams.get('subscription_id');

      if (!subscriptionId) return;

      activatedRef.current = true;
      setActivating(true);

      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('popup_auth_token');
        if (token) headers.Authorization = `Bearer ${token}`;
        if (user.email) headers['x-user-email'] = user.email;

        await fetch(`${API_BASE_URL}/paypal/activate-subscription`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ subscriptionID: subscriptionId }),
        });

        // Refresh subscription data everywhere
        queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
      } catch (err) {
        console.error('Error activating subscription after redirect:', err);
      } finally {
        setActivating(false);
      }
    };

    activate();
  }, [user, searchParams, queryClient]);

  // Check subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['userSubscription', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const subs = await base44.entities.UserSubscription.filter({
        user_email: user.email
      });
      return subs[0] || null;
    },
    enabled: !!user && !activating
  });

  useEffect(() => {
    // Confetti effect
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      if (window.confetti) {
        window.confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2
          }
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center px-4">
      <motion.div
        className="max-w-md w-full text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-slate-900 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to Premium!
        </motion.h1>

        <motion.p
          className="text-lg text-slate-600 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Your subscription is now active. Enjoy unlimited access to all features!
        </motion.p>

        {subscription?.end_date && (
          <motion.p
            className="text-sm text-slate-500 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            Valid until: {new Date(subscription.end_date).toLocaleDateString()}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to={returnTo || createPageUrl('Home')}>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl">
              Start Exploring
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}