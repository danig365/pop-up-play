import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Hook to track page views when route changes
 * Use this in your main App component wrapped by Router
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    const pageTitle = document.title || 'Pop Up Play';
    trackPageView(location.pathname, pageTitle);
  }, [location]);
};

export default usePageTracking;
