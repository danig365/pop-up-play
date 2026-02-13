import { useEffect, useRef } from 'react';

// Calculate distance between two coordinates in miles
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Generate ambient trance notification sound
const playAmbientTrance = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  
  // Create oscillators for layered ambient sound
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(440, now); // A note
  osc2.frequency.setValueAtTime(554.37, now); // C# note
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.5);
  osc2.stop(now + 1.5);
};

// Generate unplugged sound effect
const playUnpluggedSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  osc.start(now);
  osc.stop(now + 0.3);
};

export default function MapSoundNotifications({ activeUsers, userLocation, currentUserEmail, currentUserProfile }) {
  const previousUsersRef = useRef(new Set());
  const previousPopStatusRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Skip sound on first render to avoid playing sounds on initial load
    if (isFirstRenderRef.current) {
      const userIds = new Set(activeUsers.map(u => u.user_email).filter(email => email !== currentUserEmail));
      previousUsersRef.current = userIds;
      previousPopStatusRef.current = currentUserProfile?.is_popped_up || false;
      isFirstRenderRef.current = false;
      return;
    }

    // Check if current user's pop status changed
    const currentPopStatus = currentUserProfile?.is_popped_up || false;
    const previousPopStatus = previousPopStatusRef.current;
    
    if (previousPopStatus !== null && currentPopStatus !== previousPopStatus) {
      if (currentPopStatus) {
        // User just popped up
        playAmbientTrance();
      } else {
        // User just popped down
        playUnpluggedSound();
      }
    }
    previousPopStatusRef.current = currentPopStatus;

    if (!userLocation?.latitude || !userLocation?.longitude) return;

    const currentUserIds = new Set(
      activeUsers
        .filter(u => u.user_email !== currentUserEmail)
        .map(u => u.user_email)
    );

    // Detect new users (appeared)
    const newUsers = activeUsers.filter(
      u => u.user_email !== currentUserEmail && 
      !previousUsersRef.current.has(u.user_email) &&
      u.latitude && u.longitude
    );

    // Detect removed users (disappeared)
    const removedUserEmails = Array.from(previousUsersRef.current).filter(
      email => !currentUserIds.has(email)
    );

    // Play sound for new users within 60 miles
    newUsers.forEach(user => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        user.latitude,
        user.longitude
      );
      
      if (distance <= 60) {
        playAmbientTrance();
      }
    });

    // Play sound for removed users
    if (removedUserEmails.length > 0) {
      playUnpluggedSound();
    }

    // Update previous users
    previousUsersRef.current = currentUserIds;
  }, [activeUsers, userLocation, currentUserEmail]);

  return null;
}