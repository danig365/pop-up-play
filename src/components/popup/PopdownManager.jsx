import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function PopdownManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let popdownInProgress = false;

    // Handle browser tab/window close
    const handleBeforeUnload = async (e) => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const profiles = await base44.entities.UserProfile.filter({ 
          user_email: user.email 
        });
        
        if (profiles.length > 0 && profiles[0].is_popped_up) {
          // Mark for popdown if not already in progress
          if (!popdownInProgress) {
            popdownInProgress = true;
            console.log('📍 [PopdownManager] Browser closing - auto popping down');
            
            // Use sendBeacon for reliable data sending before page unload
            const data = JSON.stringify({
              is_popped_up: false,
              popup_message: ''
            });
            
            navigator.sendBeacon(
              `${base44.entities.UserProfile.tableName ? 'http://localhost:3001/api/entities/UserProfile/' + profiles[0].id : ''}`,
              data
            );
          }
        }
      } catch (error) {
        console.warn('⚠️ [PopdownManager] Error during beforeunload:', error.message);
      }
    };

    // Handle visibility change (minimize/tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [PopdownManager] Browser window/tab is visible - popup remains active');
      } else {
        console.log('🙈 [PopdownManager] Browser window/tab is hidden - popup remains active');
        // Popup remains active when minimized - no action needed
      }
    };

    // Handle page unload
    const handleUnload = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const profiles = await base44.entities.UserProfile.filter({ 
          user_email: user.email 
        });
        
        if (profiles.length > 0 && profiles[0].is_popped_up) {
          console.log('📍 [PopdownManager] Page unloading - auto popping down');
          
          // Use sendBeacon for reliable async request
          const updateData = {
            is_popped_up: false,
            popup_message: ''
          };
          
          const updateUrl = `http://localhost:3001/api/entities/UserProfile/${profiles[0].id}`;
          navigator.sendBeacon(updateUrl, JSON.stringify(updateData));
        }
      } catch (error) {
        console.warn('⚠️ [PopdownManager] Error during unload:', error.message);
      }
    };

    // Track page focus/blur
    const handlePageBlur = () => {
      console.log('👁️ [PopdownManager] Window lost focus - popup remains active');
    };

    const handlePageFocus = () => {
      console.log('👁️ [PopdownManager] Window regained focus - popup remains active');
    };

    // Attach event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handlePageBlur);
    window.addEventListener('focus', handlePageFocus);

    console.log('✅ [PopdownManager] Initialized - monitoring popup lifecycle');

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handlePageBlur);
      window.removeEventListener('focus', handlePageFocus);
      console.log('🛑 [PopdownManager] Cleanup - listeners removed');
    };
  }, [queryClient]);

  return null;
}
