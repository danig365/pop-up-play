import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InactivityManager() {
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const warningShownRef = useRef(false);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      // If warning is showing and user becomes active, hide it
      if (showWarning) {
        setShowWarning(false);
        warningShownRef.current = false;
        setTimeRemaining(600);
      }
    };

    const checkInactivity = async () => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      const warningTime = 110 * 60 * 1000; // 1 hour 50 minutes in milliseconds

      // Check if user is popped up first
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const profiles = await base44.entities.UserProfile.filter({ 
          user_email: user.email 
        });
        
        if (profiles.length === 0 || !profiles[0].is_popped_up) {
          // User not popped up, no need for warning
          if (showWarning) {
            setShowWarning(false);
            warningShownRef.current = false;
          }
          return;
        }

        // User is popped up - check inactivity
        if (inactiveTime >= twoHours) {
          // Auto pop-down after 2 hours
          await base44.entities.UserProfile.update(profiles[0].id, { 
            is_popped_up: false,
            popup_message: ''
          });
          queryClient.invalidateQueries({ queryKey: ['myProfile'] });
          queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
          setShowWarning(false);
          warningShownRef.current = false;
          console.log('⏰ [InactivityManager] Auto pop-down after 2 hours of inactivity');
        } else if (inactiveTime >= warningTime && !warningShownRef.current) {
          // Show warning at 1h 50min
          warningShownRef.current = true;
          setShowWarning(true);
          const remaining = Math.ceil((twoHours - inactiveTime) / 1000);
          setTimeRemaining(remaining);
          console.log('⚠️ [InactivityManager] Warning: popup will expire in', remaining, 'seconds');
        } else if (showWarning) {
          // Update countdown
          const remaining = Math.ceil((twoHours - inactiveTime) / 1000);
          setTimeRemaining(Math.max(0, remaining));
        }
      } catch (error) {
        // Silently fail if user not logged in
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Check inactivity every 10 seconds for more responsive countdown
    checkIntervalRef.current = setInterval(checkInactivity, 10000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [queryClient, showWarning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStayActive = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    warningShownRef.current = false;
    setTimeRemaining(600);
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
        >
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-sm">
                  Inactivity Warning
                </h3>
                <p className="text-amber-800 text-xs mt-1">
                  Your popup request will automatically pop down due to inactivity.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-lg font-bold text-amber-900 font-mono">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-xs text-amber-700">remaining</span>
                </div>
                <Button
                  onClick={handleStayActive}
                  className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm py-2"
                >
                  I'm Still Here - Stay Popped Up
                </Button>
              </div>
              <button 
                onClick={handleStayActive}
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}