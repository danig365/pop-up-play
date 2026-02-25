import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import SessionManager from '@/components/auth/SessionManager';
import InactivityManager from '@/components/auth/InactivityManager';
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import PaywallModal from '@/components/subscription/PaywallModal';
import IncomingCallDetector from '@/components/IncomingCallDetector';
import { PAGE_TIERS } from '@/lib/SubscriptionContext';

export default function Layout({ children, currentPageName }) {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user.email);
      } catch (error) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  // 3-tier access control:
  // 'open'   = no subscription check at all (Tier 1)
  // 'browse' = page renders, but actions are gated via useSubscription().guardAction() (Tier 2)
  // 'gated'  = old behavior: full redirect to Pricing if no subscription (Tier 3)
  const pageTier = PAGE_TIERS[currentPageName] || 'gated';
  const shouldCheckSubscription = pageTier === 'gated';
  
  const content = (
    <div className="min-h-screen bg-slate-50">
      <SessionManager />
      <InactivityManager />
      <IncomingCallDetector user={{ email: userEmail }} />
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