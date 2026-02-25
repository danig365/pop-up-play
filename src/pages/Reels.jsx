import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReelViewer from '@/components/reels/ReelViewer';
import ReelUpload from '@/components/reels/ReelUpload';
import { useSubscription } from '@/lib/SubscriptionContext';

export default function Reels() {
  const [user, setUser] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [reelsLocked, setReelsLocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { guardAction, hasAccess, paywallOpen, closePaywall } = useSubscription();
  const paywallTimerRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();

    // Check if returning from profile with reel index
    const params = new URLSearchParams(window.location.search);
    const reelIndex = params.get('reelIndex');
    if (reelIndex !== null) {
      setCurrentIndex(parseInt(reelIndex, 10));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      const allReels = await base44.entities.Reel.list('-created_date');
      return allReels;
    },
    refetchInterval: 30000
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['reelProfiles', reels],
    queryFn: async () => {
      if (reels.length === 0) return [];
      const userEmails = [...new Set(reels.map(r => r.user_email))];
      const allProfiles = await base44.entities.UserProfile.filter({});
      return allProfiles.filter(p => userEmails.includes(p.user_email));
    },
    enabled: reels.length > 0
  });

  const getProfileForReel = (reel) => {
    return profiles.find(p => p.user_email === reel.user_email);
  };

  // Handle swipe navigation
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (reelsLocked && !hasAccess) return;
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe up - next reel
      handleNextReel();
    } else if (distance < -minSwipeDistance) {
      // Swipe down - previous reel
      handlePreviousReel();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Handle wheel navigation (desktop)
  const handleWheel = (e) => {
    e.preventDefault();
    if (reelsLocked && !hasAccess) return;
    
    if (e.deltaY > 0) {
      handleNextReel();
    } else if (e.deltaY < 0) {
      handlePreviousReel();
    }
  };

  const handleNextReel = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePreviousReel = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePreviousReel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  // Show paywall after 2 seconds for non-access users
  useEffect(() => {
    if (hasAccess) {
      setReelsLocked(false);
      clearTimeout(paywallTimerRef.current);
      return;
    }

    // Only start timer after both reel and profile are loaded for the current index
    const reelLoaded = reels.length > 0 && reels[currentIndex];
    const profileLoaded = reelLoaded && getProfileForReel(reels[currentIndex]);
    if (!hasAccess && reelLoaded && profileLoaded && !paywallOpen && !reelsLocked) {
      paywallTimerRef.current = setTimeout(() => {
        setReelsLocked(true);
        guardAction('view reels');
      }, 2000);
      return () => {
        clearTimeout(paywallTimerRef.current);
      };
    } else {
      clearTimeout(paywallTimerRef.current);
    }
  }, [hasAccess, reels, currentIndex, paywallOpen, profiles, reelsLocked]);

  const handleUploadComplete = () => {
    setShowUpload(false);
    queryClient.invalidateQueries({ queryKey: ['reels'] });
    setCurrentIndex(0);
  };

  if (!user || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 left-4 z-50">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full bg-white/20 hover:bg-white/30 text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">No Reels Yet</h2>
          <p className="text-white/70 mb-6">Be the first to share a reel!</p>
          <Button
            onClick={() => {
              if (!guardAction('upload reels')) return;
              setShowUpload(true);
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-5 h-5 mr-2 text-white" />
            Upload Reel
          </Button>
        </div>

        <AnimatePresence>
          {showUpload && (
            <ReelUpload
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUpload(false)} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-black overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Link to={createPageUrl('Menu')}>
              <Button variant="ghost" size="icon" className="rounded-full bg-white/20 hover:bg-white/30 text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full bg-white/20 hover:bg-white/30 text-white">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button
              onClick={() => {
                if (!guardAction('upload reels')) return;
                setShowUpload(true);
              }}
              size="icon"
              className="rounded-full bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="w-5 h-5 text-white" />
            </Button>
          </div>

          <div className="w-10"></div>
        </div>
      </div>

      {/* Reels Container */}
      <div className="h-full w-full relative">
        <AnimatePresence mode="wait">
          {reels[currentIndex] && (
            <motion.div
              key={currentIndex}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute inset-0">
              <ReelViewer
                reel={reels[currentIndex]}
                profile={getProfileForReel(reels[currentIndex])}
                isActive={!(reelsLocked && !hasAccess)}
                blocked={reelsLocked && !hasAccess}
                onToggleMute={() => setIsMuted(!isMuted)}
                isMuted={isMuted}
                reelIndex={currentIndex} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reelsLocked && !hasAccess && (
        <div className="absolute inset-0 bg-black/85 z-40 pointer-events-auto" />
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <ReelUpload
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
