import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import SessionManager from '@/components/auth/SessionManager';
// InactivityManager removed — users stay popped up until they manually pop down
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import PaywallModal from '@/components/subscription/PaywallModal';
import IncomingCallDetector from '@/components/IncomingCallDetector';
import { PAGE_TIERS } from '@/lib/SubscriptionContext';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Layout({ children, currentPageName }) {
  const [userEmail, setUserEmail] = useState(null);
  const [isProfileCheckLoading, setIsProfileCheckLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user?.email || null);
      } catch (error) {
        // User not logged in
        setUserEmail(null);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!userEmail) {
        setIsProfileCheckLoading(false);
        setIsProfileComplete(true);
        return;
      }

      setIsProfileCheckLoading(true);

      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
        const profile = profiles[0] || null;

        const hasZip = Boolean(profile?.zip_code && profile.zip_code.trim());
        const hasPicture = Boolean(
          (profile?.avatar_url && profile.avatar_url.trim()) ||
          (Array.isArray(profile?.photos) && profile.photos.length > 0)
        );

        setIsProfileComplete(hasZip && hasPicture);
      } catch (error) {
        setIsProfileComplete(true);
      } finally {
        setIsProfileCheckLoading(false);
      }
    };

    checkProfileCompletion();
  }, [userEmail, location.pathname, location.search]);

  useEffect(() => {
    if (!userEmail || isProfileCheckLoading || isProfileComplete) return;

    const params = new URLSearchParams(location.search);
    const viewingUserEmail = params.get('user');
    const onOwnProfile =
      currentPageName === 'Profile' &&
      (!viewingUserEmail || viewingUserEmail === userEmail);

    if (!onOwnProfile) {
      navigate(createPageUrl('Profile'), { replace: true });
    }
  }, [
    userEmail,
    isProfileCheckLoading,
    isProfileComplete,
    currentPageName,
    location.search,
    navigate,
  ]);

  // 3-tier access control:
  // 'open'   = no subscription check at all (Tier 1)
  // 'browse' = page renders, but actions are gated via useSubscription().guardAction() (Tier 2)
  // 'gated'  = old behavior: full redirect to Pricing if no subscription (Tier 3)
  const pageTier = PAGE_TIERS[currentPageName] || 'gated';
  const shouldCheckSubscription = pageTier === 'gated';

  if (userEmail && isProfileCheckLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (userEmail && !isProfileComplete) {
    const params = new URLSearchParams(location.search);
    const viewingUserEmail = params.get('user');
    const onOwnProfile =
      currentPageName === 'Profile' &&
      (!viewingUserEmail || viewingUserEmail === userEmail);

    if (!onOwnProfile) {
      return <div className="min-h-screen bg-slate-50" />;
    }
  }
  
  const content = (
    <div className="min-h-screen bg-slate-50">
      <SessionManager />
      {/* InactivityManager removed — no auto pop-down */}
      {currentPageName !== 'VideoCall' && <IncomingCallDetector user={{ email: userEmail }} />}
      <style>{`
        :root {
          --primary: 139 92 246;
          --primary-foreground: 255 255 255;
        }
        
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: none;
        }
        
        .leaflet-popup-tip {
          display: none;
        }
        
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: 'rounded-xl',
        }}
      />
      {children}
      <PaywallModal />
    </div>
  );

  if (shouldCheckSubscription) {
    return <SubscriptionGate>{content}</SubscriptionGate>;
  }

  return content;
}