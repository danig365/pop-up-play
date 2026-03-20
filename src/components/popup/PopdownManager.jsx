import { useEffect } from 'react';

/**
 * PopdownManager
 * ---------------------------------------------------------------
 * Users stay popped up for 24 hours regardless of browser state.
 * Closing the browser / tab does NOT pop the user down.
 * The server-side cleanup timer (every 5 min) handles expiring
 * stale popups after 24 hours of inactivity.
 *
 * This component only logs lifecycle events for debugging.
 * ---------------------------------------------------------------
 */
export default function PopdownManager() {
  useEffect(() => {
    console.log(
      '✅ [PopdownManager] Initialized – users stay popped up for 24 h even if browser closes'
    );
    return () => {
      console.log('🛑 [PopdownManager] Cleanup');
    };
  }, []);

  return null;
}
