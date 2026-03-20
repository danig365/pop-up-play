// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, Clock, ArrowLeft, Key, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';

const API_BASE_URL = getApiBaseUrl();

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalButtonReady, setPaypalButtonReady] = useState(false);
  const [paypalRestricted, setPaypalRestricted] = useState(false);
  const [paypalRestrictionMessage, setPaypalRestrictionMessage] = useState('');
  const [paypalDisplayError, setPaypalDisplayError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const paypalButtonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const getAuthHeaders = (extra = {}) => {
    const headers = { ...extra };
    const token = localStorage.getItem('popup_auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (user?.email) {
      headers['x-user-email'] = user.email;
    }
    return headers;
  };

  const returnTo =
    location.state?.returnTo ||
    new URLSearchParams(location.search).get('returnTo') ||
    '';
  const backTarget = returnTo || createPageUrl('Menu');

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
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&currency=USD`;
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
    if (!paypalButtonRef.current) return;

    // Show loading skeleton while dependencies load
    if (!paypalLoaded || !user || !settings) {
      setPaypalButtonReady(false);
      paypalButtonRef.current.innerHTML = '<div class="h-12 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse"></div>';
      return;
    }

    if (subscription?.status === 'active' || paypalRestricted) {
      setPaypalButtonReady(false);
      return;
    }

    setPaypalDisplayError('');
    setPaypalButtonReady(false);

    // Clear existing buttons
    paypalButtonRef.current.innerHTML = '';

    // @ts-ignore - PayPal is loaded via script
    if (window.paypal) {
      // @ts-ignore
      const buttons = window.paypal.Buttons({
        fundingSource: window.paypal.FUNDING.PAYPAL, // Only show PayPal button
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 50,
        },
        createSubscription: async () => {
          setLoading(true);
          try {
            const response = await fetch(`${API_BASE_URL}/paypal/create-subscription`, {
              method: 'POST',
              headers: getAuthHeaders({
                'Content-Type': 'application/json',
              }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
              if (data?.code === 'PAYEE_ACCOUNT_RESTRICTED') {
                setPaypalRestricted(true);
                setPaypalRestrictionMessage(data.error || 'PayPal is temporarily unavailable. Please use an access code.');
              }
              if (data?.code === 'PAYER_CANNOT_PAY_SELF' || data?.code === 'PAYMENT_SOURCE_DECLINED_BY_PROCESSOR') {
                setPaypalDisplayError('This PayPal account cannot be used for this payment. Please log in with a different buyer account.');
              }
              throw new Error(data.error || 'Failed to create payment');
            }
            return data.subscriptionID;
          } catch (error) {
            console.error('Create order error:', error);
            toast.error(error?.message || 'Failed to create payment. Please try again.');
            setLoading(false);
            throw error;
          }
        },
        onApprove: async (data) => {
          try {
            const response = await fetch(`${API_BASE_URL}/paypal/activate-subscription`, {
              method: 'POST',
              headers: getAuthHeaders({
                'Content-Type': 'application/json',
              }),
              body: JSON.stringify({ subscriptionID: data.subscriptionID }),
            });
            const captureData = await response.json();
            if (!response.ok || captureData.error) throw new Error(captureData.error || 'Payment verification failed');
            
            console.log('✅ Payment successful:', captureData);
            toast.success('Payment successful! Welcome to Premium!');
            refetchSubscription();
            navigate(createPageUrl('SubscriptionSuccess'), {
              state: { returnTo },
            });
          } catch (error) {
            console.error('Capture error:', error);
            toast.error(error?.message || 'Payment verification failed. Please contact support.');
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
          const rawMessage = String(
            err?.message || err?.toString?.() || ''
          ).toLowerCase();

          if (
            rawMessage.includes('associated with the merchant') ||
            rawMessage.includes('different account') ||
            rawMessage.includes('paying yourself') ||
            rawMessage.includes('pay self')
          ) {
            setPaypalDisplayError('This PayPal account is linked to the merchant. Please log in with a different buyer account.');
            toast.error('This PayPal account is the merchant account. Please log in with a different buyer account.');
            return;
          }

          setPaypalDisplayError('Unable to load PayPal checkout for this account right now. Try another PayPal account or use an access code.');
          toast.error('Payment error. Please try again.');
        },
      });

      if (!buttons?.isEligible?.()) {
        setPaypalButtonReady(false);
        setPaypalDisplayError('PayPal checkout is not available for this account/session. Please log out of PayPal and retry with a different buyer account.');
        return;
      }

      buttons
        .render(paypalButtonRef.current)
        .then(() => {
          setPaypalButtonReady(true);
        })
        .catch((renderError) => {
          console.error('PayPal render error:', renderError);
          setPaypalButtonReady(false);
          setPaypalDisplayError('PayPal checkout could not be displayed. Please retry, or use a different PayPal account.');
        });
    }
  }, [paypalLoaded, user, settings, subscription, navigate, refetchSubscription, paypalRestricted]);

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/subscription/cancel`, {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to cancel subscription');
      return data;
    },
    onSuccess: () => {
      toast.success('Membership cancelled successfully.');
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
      setShowCancelConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel membership.');
    },
  });

  const handleCancelToggle = (checked) => {
    if (!checked) {
      // User is turning OFF auto-payment (cancelling)
      setShowCancelConfirm(true);
    }
  };

  const handleAccessCode = () => {
    navigate(createPageUrl('EnterAccessCode'), {
      state: { returnTo },
    });
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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(backTarget)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                      <Check className="w-5 h-5" />
                      Active Subscription
                    </div>
                  </div>
                  {(subscription.current_period_end || subscription.end_date) && (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-slate-600">
                        {Math.max(0, Math.ceil((new Date(subscription.current_period_end || subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining
                      </p>
                      <p className="text-xs text-slate-500">
                        Expires on {new Date(subscription.current_period_end || subscription.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Auto-Payment Toggle */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Active Membership</p>
                        <p className="text-xs text-slate-500">Turn off to cancel your membership</p>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={handleCancelToggle}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>

                  {/* Cancel Confirmation */}
                  {showCancelConfirm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800">Cancel Membership?</p>
                          <p className="text-xs text-red-600 mt-1">
                            You will immediately lose access to premium features including messaging, video chat, and full profile browsing.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              onClick={() => cancelMutation.mutate()}
                              disabled={cancelMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg"
                            >
                              {cancelMutation.isPending ? (
                                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Cancelling...</>
                              ) : (
                                'Yes, Cancel'
                              )}
                            </Button>
                            <Button
                              onClick={() => setShowCancelConfirm(false)}
                              variant="outline"
                              className="text-xs px-3 py-1.5 rounded-lg"
                            >
                              Keep Membership
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* PayPal Button Container */}
                  <div className="min-h-[50px]">
                    {paypalRestricted ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {paypalRestrictionMessage || 'PayPal is temporarily unavailable. Please use an access code.'}
                      </div>
                    ) : paypalDisplayError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {paypalDisplayError}
                      </div>
                    ) : (
                      <div className="relative min-h-[50px]">
                        <div
                          ref={paypalButtonRef}
                          className={`min-h-[50px] transition-opacity duration-200 ${paypalButtonReady ? 'opacity-100' : 'opacity-0'}`}
                        />
                        {!paypalButtonReady && (
                          <button
                            type="button"
                            disabled
                            className="absolute inset-0 w-full rounded-md border border-amber-300 bg-amber-300/90 text-base font-semibold text-slate-900 cursor-not-allowed"
                          >
                            PayPal
                          </button>
                        )}
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