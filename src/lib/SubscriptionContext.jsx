import React, { createContext, useContext, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const SubscriptionContext = createContext(null);

/**
 * Page access tiers:
 * 
 * Tier 1 - OPEN: Full access, no subscription needed
 *   Home, Menu, About, Profile, Pricing, EnterAccessCode, SubscriptionSuccess,
 *   ForgotPassword, ResetPassword, Login, Signup
 * 
 * Tier 2 - BROWSE: Can view content, but actions trigger paywall modal
 *   AllProfiles, OnlineMembers, Chat, Reels
 * 
 * Tier 3 - GATED: Redirect to Pricing if no subscription
 *   VideoCall, Broadcast, Dashboard, BlockedUsers, AccessCodeManager, SubscriptionSettings
 */

export const PAGE_TIERS = {
  // Tier 1 — Fully open
  Home: 'open',
  Menu: 'open',
  About: 'open',
  Profile: 'open',
  Pricing: 'open',
  EnterAccessCode: 'open',
  SubscriptionSuccess: 'open',
  SubscriptionSettings: 'open', // Has its own admin guard
  ForgotPassword: 'open',
  ResetPassword: 'open',
  Login: 'open',
  Signup: 'open',
  Dashboard: 'open',
  Contact: 'open',
  PrivacyPolicy: 'open',

  // Tier 2 — Browse-only (actions blocked)
  AllProfiles: 'browse',
  OnlineMembers: 'browse',
  Reels: 'browse',

  // Tier 3 — Fully gated (redirect)
  Chat: 'gated',
  VideoCall: 'gated',
  Broadcast: 'gated',
  BlockedUsers: 'gated',
  AccessCodeManager: 'gated',
};

export function SubscriptionProvider({ children }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
  const [paywallReturnTo, setPaywallReturnTo] = useState('');

  // Load current user
  const { data: user } = useQuery({
    queryKey: ['subscriptionContextUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  // Check subscription status
  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ['subscriptionStatus', user?.email],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getSubscriptionStatus', {});
        return response || { required: false, hasAccess: false, status: 'unknown' };
      } catch {
        return { required: true, hasAccess: false, status: 'error' };
      }
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const hasAccess = !subscriptionStatus?.required || subscriptionStatus?.hasAccess;
  const status = subscriptionStatus?.status || 'unknown';

  /**
   * Call this before any premium action.
   * Returns true if the user has access, false if the paywall was shown.
   * 
   * Usage:
   *   const { guardAction } = useSubscription();
   *   const handleChat = () => {
   *     if (!guardAction('send messages')) return;
   *     // ... proceed with action
   *   };
   */
  const guardAction = useCallback((featureName = 'this feature') => {
    if (hasAccess) return true;
    setPaywallFeature(featureName);
    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search || ''}`;
      setPaywallReturnTo(currentPath);
    }
    setPaywallOpen(true);
    return false;
  }, [hasAccess]);

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
    setPaywallFeature('');
  }, []);

  const clearPaywallReturnTo = useCallback(() => {
    setPaywallReturnTo('');
  }, []);

  /**
   * Get the tier for a given page.
   */
  const getPageTier = useCallback((pageName) => {
    return PAGE_TIERS[pageName] || 'gated';
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      hasAccess,
      status,
      isLoading,
      user,
      paywallOpen,
      paywallFeature,
      paywallReturnTo,
      guardAction,
      closePaywall,
      clearPaywallReturnTo,
      getPageTier,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
