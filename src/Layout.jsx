import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
// InactivityManager removed — users stay popped up until they manually pop down
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import PaywallModal from '@/components/subscription/PaywallModal';
import IncomingCallDetector from '@/components/IncomingCallDetector';
import { PAGE_TIERS } from '@/lib/SubscriptionContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { isRequiredProfileComplete } from '@/lib/profileCompletion';
import { createPageUrl } from '@/utils';
import { useLocation, useNavigate } from 'react-router-dom';

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  const userEmail = user?.email || null;
  const [isProfileCheckLoading, setIsProfileCheckLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const hasCompletedInitialProfileCheckRef = useRef(false);
  const [profileCheckTick, setProfileCheckTick] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;
    let retryTimeout = null;

    const checkProfileCompletion = async () => {
      if (!userEmail) {
        hasCompletedInitialProfileCheckRef.current = false;
        setIsProfileCheckLoading(false);
        setIsProfileComplete(true);
        return;
      }

      if (!hasCompletedInitialProfileCheckRef.current) {
        setIsProfileCheckLoading(true);
      }

      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
        if (isCancelled) return;

        const profile = profiles[0] || null;
        setIsProfileComplete(isRequiredProfileComplete(profile));
      } catch (error) {
        if (isCancelled) return;
        setIsProfileComplete(true);
        retryTimeout = setTimeout(() => {
          if (!isCancelled) {
            setProfileCheckTick((value) => value + 1);
          }
        }, 15000);
      } finally {
        if (isCancelled) return;
        hasCompletedInitialProfileCheckRef.current = true;
        setIsProfileCheckLoading(false);
      }
    };

    checkProfileCompletion();

    return () => {
      isCancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [userEmail, profileCheckTick]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      setProfileCheckTick((value) => value + 1);
    };

    window.addEventListener('profile:updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('profile:updated', handleProfileUpdated);
    };
  }, []);

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

  if (userEmail && isProfileCheckLoading && !hasCompletedInitialProfileCheckRef.current) {
    return <FullPageLoader />;
  }

  if (userEmail && !isProfileComplete) {
    const params = new URLSearchParams(location.search);
    const viewingUserEmail = params.get('user');
    const onOwnProfile =
      currentPageName === 'Profile' &&
      (!viewingUserEmail || viewingUserEmail === userEmail);

    if (!onOwnProfile) {
      return <FullPageLoader />;
    }
  }
  
  const content = (
    <div className="min-h-screen bg-slate-50">
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