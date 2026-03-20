import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Video, Loader2, Play, Maximize, Minimize, Pause } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function VideoGallery({ videos = [], onAddVideo, onDeleteVideo, editable = true }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});
  const [playingVideos, setPlayingVideos] = useState({});
  const [viewCounted, setViewCounted] = useState({});
  const [localVideos, setLocalVideos] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const videoRefs = useRef({});
  const fullscreenVideoRef = useRef(null);
  const [pushLoading, setPushLoading] = useState(null); // index of video being pushed
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const normalizedVideos = (videos || []).map((video, index) => {
      if (typeof video === 'string') {
        return {
          id: `legacy-${index}`,
          video_url: video,
          views: 0,
          _legacy: true
        };
      }
      return {
        ...video,
        views: video?.views || 0
      };
    });
    setLocalVideos(normalizedVideos);
    setViewCounted({});
  }, [videos]);

  // Get user email from parent Profile page
  React.useEffect(() => {
    async function fetchUser() {
      try {
        const currentUser = await base44.auth.me();
        setUserEmail(currentUser.email);
      } catch (err) {
        setUserEmail(null);
      }
    }
    fetchUser();
  }, []);

  const handleVideoError = (index, e) => {
    console.error(`Video ${index} failed to load:`, e.target.error);
    setVideoErrors(prev => ({ ...prev, [index]: true }));
  };

  const handleVideoLoaded = (index) => {
    setVideoErrors(prev => ({ ...prev, [index]: false }));
  };

  const togglePlay = (index) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.error('Play failed:', err));
      setPlayingVideos(prev => ({ ...prev, [index]: true }));
    } else {
      video.pause();
      setPlayingVideos(prev => ({ ...prev, [index]: false }));
    }
  };

  const openFullscreen = (videoItem, index) => {
    // Pause the inline video before opening overlay
    const inlineVideo = videoRefs.current[index];
    if (inlineVideo && !inlineVideo.paused) {
      inlineVideo.pause();
    }
    setFullscreenVideo(videoItem);
    handleIncrementView(videoItem, index);
  };

  const closeFullscreen = () => {
    // Pause the fullscreen video before closing
    if (fullscreenVideoRef.current) {
      fullscreenVideoRef.current.pause();
    }
    setFullscreenVideo(null);
  };

  const handleIncrementView = async (videoItem, index) => {
    if (!videoItem?.id || videoItem._legacy || viewCounted[videoItem.id]) return;

    try {
      await base44.entities.ProfileVideo.update(videoItem.id, {
        views: (videoItem.views || 0) + 1
      });

      setLocalVideos(prev => prev.map((video, i) => {
        if (video.id === videoItem.id || i === index) {
          return { ...video, views: (video.views || 0) + 1 };
        }
        return video;
      }));

      setViewCounted(prev => ({ ...prev, [videoItem.id]: true }));
    } catch (error) {
      // Silently fail to match reels behavior
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    // Validate file size (200MB limit)
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes
    if (file.size > maxSize) {
      toast.error('Video size must be less than 200MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate realistic progress: quick start, then slower progress
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 30) {
          // Quick progress at start
          currentProgress += Math.random() * 15;
        } else if (currentProgress < 70) {
          // Slower progress in middle
          currentProgress += Math.random() * 5;
        } else if (currentProgress < 95) {
          // Even slower near the end
          currentProgress += Math.random() * 2;
        }
        if (currentProgress > 95) currentProgress = 95;
        setUploadProgress(currentProgress);
      }, 300);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (onAddVideo) {
        await onAddVideo(file_url);
      } else {
        setLocalVideos(prev => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            video_url: file_url,
            views: 0,
            _legacy: true
          }
        ]);
      }
      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload video. Please try again.');
      setUploadProgress(0);
    }
    
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 1000);
  };

  const handleRemove = (index) => {
    setDeleteConfirm(index);
  };

  const confirmDelete = async () => {
    if (deleteConfirm !== null) {
      const videoToDelete = localVideos[deleteConfirm];
      if (videoToDelete && onDeleteVideo && !videoToDelete._legacy) {
        try {
          await onDeleteVideo(videoToDelete.id);
        } catch (error) {
          toast.error('Failed to delete video. Please try again.');
          return;
        }
      }
      setLocalVideos(prev => prev.filter((_, i) => i !== deleteConfirm));
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {editable && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-1">Video Requirements:</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>• Max size: 200MB per video</li>
            <li>• Formats: MP4, MOV, AVI, WebM</li>
            <li>• Recommended: 1080p or lower</li>
            <li>• Maximum: 4 videos total</li>
          </ul>
        </div>
      )}
      <div className="space-y-4">
        {localVideos.map((videoItem, index) => (
          <motion.div
            key={videoItem.id || index}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg overflow-hidden"
          >
            {/* Video Player */}
            <div className="relative aspect-video rounded-lg overflow-hidden group bg-slate-900">
              {videoErrors[index] ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white">
                  <Video className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-400">Failed to load video</span>
                  <button
                    onClick={() => {
                      setVideoErrors(prev => ({ ...prev, [index]: false }));
                      const vid = videoRefs.current[index];
                      if (vid) { vid.load(); }
                    }}
                    className="mt-2 text-xs text-rose-400 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={(el) => { videoRefs.current[index] = el; }}
                    src={videoItem.video_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    playsInline
                    controls
                    controlsList="nodownload nofullscreen"
                    onError={(e) => handleVideoError(index, e)}
                    onLoadedData={() => handleVideoLoaded(index)}
                    onPlay={() => {
                      setPlayingVideos(prev => ({ ...prev, [index]: true }));
                      handleIncrementView(videoItem, index);
                    }}
                    onPause={() => setPlayingVideos(prev => ({ ...prev, [index]: false }))}
                    onEnded={() => setPlayingVideos(prev => ({ ...prev, [index]: false }))}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
                  />
                  <div className="absolute top-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                    {videoItem.views || 0} {(videoItem.views || 0) === 1 ? 'view' : 'views'}
                  </div>
                  {/* Fullscreen button */}
                  <button
                    onClick={() => openFullscreen(videoItem, index)}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all z-10 opacity-0 group-hover:opacity-100"
                    title="Fullscreen"
                  >
                    <Maximize className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Video Info & Actions */}
            <div className="p-4">
              {editable && (
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  disabled={pushLoading === index}
                  onClick={async () => {
                    if (!userEmail) {
                      toast.error('User not found. Please log in.');
                      return;
                    }
                    setPushLoading(index);
                    try {
                      await base44.entities.Reel.create({
                        user_email: userEmail,
                        video_url: videoItem.video_url,
                        caption: '', // Optionally add a caption
                      });
                      toast.success('Video pushed to reels!');
                    } catch (err) {
                      toast.error('Failed to push video to reels.');
                    }
                    setPushLoading(null);
                  }}
                >
                  {pushLoading === index ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <span>🎬</span>
                  )}
                  Push to Reels
                </button>
                <button
                  onClick={() => handleRemove(index)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Delete
                </button>
              </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {/* Add Video Button */}
        {editable && localVideos.length < 4 && (
          <label className="aspect-video rounded-xl border-2 border-dashed border-rose-200 hover:border-rose-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-rose-50/50 hover:bg-rose-50">
            <input
              type="file"
              accept="video/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                <div className="w-32 h-2 bg-rose-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-rose-600 font-medium">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            ) : (
              <>
                <Video className="w-8 h-8 text-rose-400 mb-1" />
                <span className="text-xs text-rose-500">Add Video</span>
                <span className="text-xs text-rose-400 mt-1">Max 200MB</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Fullscreen Video Overlay */}
      <AnimatePresence>
        {fullscreenVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4"
            onClick={closeFullscreen}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                ref={fullscreenVideoRef}
                src={fullscreenVideo?.video_url || fullscreenVideo}
                className="w-full max-h-[85vh] rounded-lg object-contain"
                controls
                autoPlay
                playsInline
                preload="auto"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none' }}
              />
              {/* Minimize / Close button */}
              <button
                className="absolute -top-12 right-0 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                onClick={closeFullscreen}
              >
                <Minimize className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Exit</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Delete Video?</h2>
              <p className="text-slate-600 text-sm mb-6">
                This action cannot be undone. This video will be permanently removed from your profile.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}