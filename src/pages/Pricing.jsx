// @ts-nocheck
import React, { useState, useEffect } from 'react';
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

const BANNER_STYLES = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  violet: 'bg-violet-50 border-violet-200 text-violet-900',
  green: 'bg-green-50 border-green-200 text-green-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
};

function StatusBanner({ color = 'blue', icon: Icon, title, subtitle }) {
  return (
    <motion.div
      className={`mb-8 p-4 border rounded-2xl text-center ${BANNER_STYLES[color] || BANNER_STYLES.blue}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-center gap-2">
        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
        <p className="font-semibold">{title}</p>
      </div>
      {subtitle && <p className="text-sm mt-1 opacity-80">{subtitle}</p>}
    </motion.div>
  );
}

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paypalRestricted, setPaypalRestricted] = useState(false);
  const [paypalRestrictionMessage, setPaypalRestrictionMessage] = useState('');
  const [paypalDisplayError, setPaypalDisplayError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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

  const handlePayPalCheckout = async () => {
    if (loading || !user || !settings || paypalRestricted) return;

    setLoading(true);
    setPaypalDisplayError('');

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
        throw new Error(data.error || 'Unable to start PayPal checkout');
      }

      if (data?.approvalUrl) {
        window.location.assign(data.approvalUrl);
        return;
      }

      throw new Error('PayPal approval link is unavailable. Please try again.');
    } catch (error) {
      console.error('PayPal checkout error:', error);
      setPaypalDisplayError(error?.message || 'PayPal checkout could not be started. Please try again.');
      toast.error(error?.message || 'PayPal checkout could not be started. Please try again.');
      setLoading(false);
    }
  };

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

  // Trials, access codes, and one-time payments all store their expiry in end_date.
  const daysUntil = (d) =>
    d ? Math.max(0, Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const subStatus = subscription?.status;
  const hasRecurringPaypal = !!subscription?.paypal_subscription_id;
  const hasPaypalOrder = !!subscription?.paypal_order_id;

  const isTrial = subStatus === 'trial';
  const isRecurring = subStatus === 'active' && hasRecurringPaypal;
  const isOneTime = subStatus === 'active' && hasPaypalOrder && !hasRecurringPaypal;
  // Access code = active with no PayPal linkage at all
  const isAccessCode = subStatus === 'active' && !hasRecurringPaypal && !hasPaypalOrder;

  const subEndDate = subscription?.current_period_end || subscription?.end_date || null;
  const daysRemaining = daysUntil(subEndDate);
  const trialDaysRemaining = isTrial ? daysUntil(subscription?.end_date) : null;
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '');

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

        {/* Trial */}
        {isTrial && (
          <StatusBanner
            color="blue"
            icon={Clock}
            title={
              trialDaysRemaining > 0
                ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} left in your free trial`
                : 'Your free trial has ended'
            }
            subtitle={subEndDate ? `Trial ends on ${formatDate(subscription.end_date)}` : ''}
          />
        )}

        {/* Access code */}
        {isAccessCode && (
          <StatusBanner
            color="violet"
            icon={Key}
            title={
              daysRemaining > 0
                ? `Access code active — ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`
                : 'Your access code has expired'
            }
            subtitle={
              subEndDate
                ? `Expires on ${formatDate(subEndDate)} · does not auto-renew — subscribe to keep access`
                : ''
            }
          />
        )}

        {/* Recurring paid membership */}
        {isRecurring && (
          <StatusBanner
            color="green"
            icon={Crown}
            title="Recurring membership active"
            subtitle={subEndDate ? `Auto-renews on ${formatDate(subEndDate)}` : ''}
          />
        )}

        {/* One-time PayPal payment */}
        {isOneTime && (
          <StatusBanner
            color="green"
            icon={Check}
            title={
              daysRemaining > 0
                ? `Membership active — ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`
                : 'Your membership has ended'
            }
            subtitle={
              subEndDate
                ? `Expires on ${formatDate(subEndDate)} · one-time payment, does not auto-renew`
                : ''
            }
          />
        )}

        {/* Expired / inactive */}
        {(subStatus === 'expired' || subStatus === 'cancelled') && (
          <StatusBanner
            color="amber"
            icon={AlertTriangle}
            title={subStatus === 'cancelled' ? 'Your membership was cancelled' : 'Your access has expired'}
            subtitle="Subscribe or enter an access code to regain access"
          />
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

              {isRecurring ? (
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
                  {/* PayPal Checkout Button */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handlePayPalCheckout}
                      disabled={!user || !settings || paypalRestricted || loading}
                      className="flex h-[50px] w-full items-center justify-center rounded-md border border-[#d8a600] bg-[#ffc439] hover:bg-[#f0b930] active:bg-[#e0a820] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[#003087]" />
                      ) : (
                        <>
                          <span
                            className="text-[31px] font-black italic leading-none text-[#003087]"
                            style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
                          >
                            Pay
                          </span>
                          <span
                            className="text-[31px] font-black italic leading-none text-[#009cde]"
                            style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
                          >
                            Pal
                          </span>
                        </>
                      )}
                    </button>

                    {paypalRestricted && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {paypalRestrictionMessage || 'PayPal is temporarily unavailable. Please use an access code.'}
                      </div>
                    )}

                    {!paypalRestricted && paypalDisplayError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {paypalDisplayError}
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

        <motion.div
          className="text-center mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Link to={createPageUrl('RefundPolicy')} className="text-sm text-violet-700 hover:underline">
            Refund Policy
          </Link>
        </motion.div>
      </div>
    </div>
  );
}