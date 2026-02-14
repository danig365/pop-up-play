// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, Clock, ArrowLeft, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';

const API_BASE_URL = getApiBaseUrl();

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalButtonRef = useRef(null);
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

  // Load PayPal SDK
  useEffect(() => {
    const loadPayPalScript = async () => {
      try {
        // Get PayPal client ID from backend
        const response = await fetch(`${API_BASE_URL}/paypal/client-id`);
        const { clientId } = await response.json();
        
        if (!clientId) {
          console.error('PayPal client ID not configured');
          return;
        }

        // Check if script already exists
        if (document.querySelector('script[src*="paypal.com/sdk"]')) {
          setPaypalLoaded(true);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.async = true;
        script.onload = () => {
          console.log('✅ PayPal SDK loaded');
          setPaypalLoaded(true);
        };
        script.onerror = () => {
          console.error('❌ Failed to load PayPal SDK');
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error loading PayPal:', error);
      }
    };

    loadPayPalScript();
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

  const { data: subscription, refetch: refetchSubscription } = useQuery({
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

  // Initialize PayPal Buttons when SDK loads and user/settings are ready
  useEffect(() => {
    if (!paypalLoaded || !user || !settings || subscription?.status === 'active') return;
    if (!paypalButtonRef.current) return;

    // Clear existing buttons
    paypalButtonRef.current.innerHTML = '';

    // @ts-ignore - PayPal is loaded via script
    if (window.paypal) {
      // @ts-ignore
      window.paypal.Buttons({
        fundingSource: window.paypal.FUNDING.PAYPAL, // Only show PayPal button
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 50,
        },
        createOrder: async () => {
          setLoading(true);
          try {
            const response = await fetch(`${API_BASE_URL}/paypal/create-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-email': user.email,
              },
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return data.orderID;
          } catch (error) {
            console.error('Create order error:', error);
            toast.error('Failed to create payment. Please try again.');
            setLoading(false);
            throw error;
          }
        },
        onApprove: async (data) => {
          try {
            const response = await fetch(`${API_BASE_URL}/paypal/capture-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-email': user.email,
              },
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const captureData = await response.json();
            if (captureData.error) throw new Error(captureData.error);
            
            console.log('✅ Payment successful:', captureData);
            toast.success('Payment successful! Welcome to Premium!');
            refetchSubscription();
            navigate(createPageUrl('SubscriptionSuccess'));
          } catch (error) {
            console.error('Capture error:', error);
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
          setLoading(false);
          toast.info('Payment cancelled');
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          setLoading(false);
          toast.error('Payment error. Please try again.');
        },
      }).render(paypalButtonRef.current);
    }
  }, [paypalLoaded, user, settings, subscription, navigate, refetchSubscription]);

  const handleAccessCode = () => {
    navigate(createPageUrl('EnterAccessCode'));
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
                  {(subscription.current_period_end || subscription.end_date) && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                          {Math.max(0, Math.ceil((new Date(subscription.current_period_end || subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires on {new Date(subscription.current_period_end || subscription.end_date).toLocaleDateString()}
                        </p>
                      </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* PayPal Button Container */}
                  <div ref={paypalButtonRef} className="min-h-[50px]">
                    {!paypalLoaded && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                        <span className="ml-2 text-slate-600">Loading payment options...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">or</span>
                    </div>
                  </div>

                  {/* Access Code Button */}
                  <Button
                    onClick={handleAccessCode}
                    variant="outline"
                    className="w-full py-5 text-base border-2 border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl"
                  >
                    <Key className="w-5 h-5 mr-2" />
                    Have an Access Code?
                  </Button>
                </div>
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