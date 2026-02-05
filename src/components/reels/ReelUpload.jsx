import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReelUpload({ onUploadComplete, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Video file must be less than 200MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const user = await base44.auth.me();

      // Upload video file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // Get video duration
      const video = document.createElement('video');
      video.src = previewUrl;
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      const duration = Math.round(video.duration);

      // Prepare reel data
      const reelData = {
        user_email: user.email,
        video_url: file_url,
        caption: caption.trim() || null,
        duration
      };
      // Debug: Log all data sent to backend
      console.log('[DEBUG ReelUpload] Attempting to create reel with data:', reelData);

      // Create reel record
      await base44.entities.Reel.create(reelData);

      toast.success('Reel uploaded successfully!');

      // Clean up
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      // Debug: Log full error response
      console.error('[DEBUG ReelUpload] Error creating reel:', error);
      if (error.response && error.response.data) {
        console.error('[DEBUG ReelUpload] Backend error details:', error.response.data);
      }
      toast.error('Failed to upload reel: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}>
      <motion.div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-violet-600">Upload Reel</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={uploading}
            className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Video Preview */}
        {previewUrl && (
          <div className="mb-3 relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[40vh]">
            <video
              src={previewUrl}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full object-contain" />
          </div>
        )}

        {/* File Input */}
        {!selectedFile && (
          <label className="block mb-4">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="reel-upload" />
            <Button
              asChild
              disabled={uploading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              <label htmlFor="reel-upload" className="cursor-pointer text-white">
                <Upload className="w-5 h-5 mr-2 text-white" />
                Select Video
              </label>
            </Button>
          </label>
        )}

        {/* Caption */}
        {selectedFile && (
          <>
            <div className="mb-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="rounded-xl border border-slate-200 resize-none w-full p-2"
                rows={2}
                disabled={uploading}
                maxLength={500} />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {caption.length}/500
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setCaption('');
                }}
                disabled={uploading}
                className="flex-1">
                Change Video
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-white" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2 text-white" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
