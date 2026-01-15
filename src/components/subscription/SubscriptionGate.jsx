import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubscriptionGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        setChecking(false);
      }
    };
    loadUser();
  }, []);

  const { data: status, isLoading, error } = useQuery({
    queryKey: ['subscriptionStatus', user?.email],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getSubscriptionStatus', {});
        console.log('✅ Subscription status:', response);
        // Return the response directly, or provide default values
        return response || { is_active: false, status: 'inactive', hasAccess: false, required: false };
      } catch (err) {
        console.error('❌ Error getting subscription status:', err);
        // On error, deny access (fail secure)
        return { required: true, hasAccess: false, status: 'error' };
      }
    },
    enabled: !!user,
    refetchInterval: 60000 // Check every minute
  });

  useEffect(() => {
    if (status) {
      setChecking(false);
      console.log('🔐 SubscriptionGate check:', { required: status.required, hasAccess: status.hasAccess, currentPath: window.location.hash });
      // If subscription is required but user doesn't have access
      if (status.required && !status.hasAccess) {
        console.warn('⛔ User denied access - redirecting to Pricing');
        // Don't redirect if already on pricing page
        if (window.location.hash !== '#/Pricing') {
          navigate(createPageUrl('Pricing'));
        }
      }
    }
  }, [status, navigate]);

  if (checking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  // Allow access if subscription is not required or user has access
  if (!status?.required || status?.hasAccess) {
    return children;
  }

  // Show nothing while redirecting
  return null;
}