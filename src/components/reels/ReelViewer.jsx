import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function ReelViewer({ reel, profile, isActive, blocked = false, onToggleMute, onForceMute, onForceUnmute, isMuted, reelIndex }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [views, setViews] = useState(reel?.views || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);

  // Increment view count when reel becomes active
  useEffect(() => {
    if (isActive && !viewCounted && reel?.id) {
      const incrementView = async () => {
        try {
          await base44.entities.Reel.update(reel.id, { views: (reel.views || 0) + 1 });
          setViews((reel.views || 0) + 1);
          setViewCounted(true);
        } catch (error) {
          // Silently fail
        }
      };
      incrementView();
    }
  }, [isActive, reel?.id, viewCounted]);

  // Reset view count when reel changes
  useEffect(() => {
    setViewCounted(false);
    setViews(reel?.views || 0);
  }, [reel?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (blocked) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    if (isActive) {
      // Reset to start when swiping to a new reel
      video.currentTime = 0;

      // Always attempt unmuted playback first — after any user gesture
      // (swipe/tap) the browser allows unmuted autoplay even if the
      // very first reel was force-muted.
      video.muted = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            // Unmuted playback succeeded — sync parent state if it was muted
            if (isMuted && onForceUnmute) onForceUnmute();
          })
          .catch(() => {
            // Autoplay blocked by browser – force mute and retry
            video.muted = true;
            if (onForceMute) onForceMute();
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, blocked, reel?.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const handleSeek = (clientX) => {
    if (!progressBarRef.current || !videoRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const handleProgressTouchStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      handleSeek(clientX);
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, duration]);

  const handleVideoClick = () => {
    if (blocked) return;
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!reel) {
    return <div className="relative w-full h-full bg-black" />;
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-contain cursor-pointer"
        loop
        playsInline
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleVideoClick}
        // @ts-ignore
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)} />

      {/* Progress Bar */}
      <div className="absolute bottom-[139px] left-0 right-0 px-6 z-10 pointer-events-auto">
        <div
          ref={progressBarRef}
          className="h-1.5 bg-white/30 rounded-full cursor-pointer relative"
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="h-full bg-red-500 rounded-full pointer-events-none"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg pointer-events-none"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, marginLeft: '-6px' }}
          />
        </div>
      </div>

      {/* Overlay - User Info & Caption */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <Link to={createPageUrl('Profile') + '?user=' + reel.user_email + '&back=Reels&reelIndex=' + reelIndex}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
              <img
                src={profile?.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
                alt="Profile"
                className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-semibold">
                {profile?.display_name || 'Unknown User'}
              </p>
              <p className="text-white/70 text-sm">
                {profile?.current_city}
                {profile?.current_city && profile?.current_state ? ', ' : ''}
                {profile?.current_state}
              </p>
            </div>
          </div>
        </Link>

        {reel.caption && (
          <p className="text-white text-sm mb-2">{reel.caption}</p>
        )}
        
        <p className="text-white/70 text-xs">{views} {views === 1 ? 'view' : 'views'}</p>
      </div>

      {/* Play/Pause Indicator */}
      {!isPlaying && isActive && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}>
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
