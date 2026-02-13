import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Generate a unique device ID stored in localStorage
const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export default function SessionManager() {
  const checkIntervalRef = useRef(null);
  const deviceId = getDeviceId();
  const isCheckingRef = useRef(false);
  const [showDialog, setShowDialog] = useState(false);
  const otherSessionsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const registerSession = async () => {
      try {
        const user = await base44.auth.me();
        if (!mounted) return;

        // Find existing session for this device
        const existingSessions = await base44.entities.UserSession.filter({
          user_email: user.email,
          device_id: deviceId
        });

        const now = new Date().toISOString();

        if (existingSessions.length > 0) {
          // Update existing session
          await base44.entities.UserSession.update(existingSessions[0].id, {
            last_active: now,
            user_agent: navigator.userAgent
          });
        } else {
          // Create new session
          await base44.entities.UserSession.create({
            user_email: user.email,
            device_id: deviceId,
            last_active: now,
            user_agent: navigator.userAgent
          });
        }
      } catch (error) {
        // User not logged in or error occurred
      }
    };

    const checkMultipleSessions = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const user = await base44.auth.me();
        if (!mounted) return;

        // Get all sessions for this user
        const allSessions = await base44.entities.UserSession.filter({
          user_email: user.email
        });

        // Filter out stale sessions (inactive for more than 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const activeSessions = allSessions.filter(
          s => s.last_active > twoMinutesAgo
        );

        // Delete stale sessions
        const staleSessions = allSessions.filter(
          s => s.last_active <= twoMinutesAgo
        );
        for (const session of staleSessions) {
          await base44.entities.UserSession.delete(session.id);
        }

        // Check if there are multiple active sessions
        if (activeSessions.length > 1) {
          // Find the most recent session (excluding current device)
          const otherSessions = activeSessions.filter(s => s.device_id !== deviceId);
          
          if (otherSessions.length > 0) {
            // Sort by last_active to find the most recent other session
            const sortedOtherSessions = otherSessions.sort(
              (a, b) => new Date(b.last_active) - new Date(a.last_active)
            );
            const mostRecentOtherSession = sortedOtherSessions[0];
            
            // Find current session
            const currentSession = activeSessions.find(s => s.device_id === deviceId);
            
            // If another device has a more recent login, show dialog
            if (currentSession && mostRecentOtherSession.last_active > currentSession.last_active) {
              otherSessionsRef.current = otherSessions;
              setShowDialog(true);
            }
          }
        }
      } catch (error) {
        // User not logged in or error occurred
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Register session immediately
    registerSession();

    // Update session every 30 seconds
    const updateInterval = setInterval(registerSession, 30000);

    // Check for multiple sessions every 10 seconds
    checkIntervalRef.current = setInterval(checkMultipleSessions, 10000);

    return () => {
      mounted = false;
      clearInterval(updateInterval);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [deviceId]);

  const handleLogoutOtherDevices = async () => {
    try {
      const user = await base44.auth.me();
      
      // Delete other sessions
      for (const session of otherSessionsRef.current) {
        await base44.entities.UserSession.delete(session.id);
      }
      
      toast.success('Other devices have been logged out');
      setShowDialog(false);
    } catch (error) {
      toast.error('Failed to logout other devices');
    }
  };

  const handleKeepBothSessions = () => {
    setShowDialog(false);
    // Do nothing - allow both sessions to remain active
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account Logged In On Another Device</AlertDialogTitle>
          <AlertDialogDescription>
            Your account is currently active on another device. Would you like to log out of the other device?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleKeepBothSessions}>No</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogoutOtherDevices} className="text-purple-600">
            Yes, Log Out Other Device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}