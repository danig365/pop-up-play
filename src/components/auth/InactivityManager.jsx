import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function InactivityManager() {
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = async () => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

      if (inactiveTime >= twoHours) {
        try {
          const user = await base44.auth.me();
          const profiles = await base44.entities.UserProfile.filter({ 
            user_email: user.email 
          });
          
          if (profiles.length > 0 && profiles[0].is_popped_up) {
            await base44.entities.UserProfile.update(profiles[0].id, { 
              is_popped_up: false,
              popup_message: ''
            });
            queryClient.invalidateQueries({ queryKey: ['myProfile'] });
            queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
          }
        } catch (error) {
          // Silently fail if user not logged in
        }
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Check inactivity every minute
    checkIntervalRef.current = setInterval(checkInactivity, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [queryClient]);

  return null;
}