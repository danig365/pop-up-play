import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ReelUpload from '@/components/reels/ReelUpload';
// @ts-ignore
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

export default function ReelGallery({ userEmail, editable = true }) {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteReelId, setDeleteReelId] = useState(null);
  const [previewReel, setPreviewReel] = useState(null);
  const queryClient = useQueryClient();

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['userReels', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const allReels = await base44.entities.Reel.filter({ user_email: userEmail }, '-created_date');
      return allReels;
    },
    enabled: !!userEmail
  });

  const deleteMutation = useMutation({
    mutationFn: async (reelId) => {
      await base44.entities.Reel.delete(reelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userReels'] });
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      toast.success('Reel deleted');
      setDeleteReelId(null);
    },
    onError: () => {
      toast.error('Failed to delete reel');
    }
  });

  const handleUploadComplete = () => {
    setShowUpload(false);
    queryClient.invalidateQueries({ queryKey: ['userReels'] });
    queryClient.invalidateQueries({ queryKey: ['reels'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editable && (
        <Button
          onClick={() => setShowUpload(true)}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="w-4 h-4 mr-2 text-white" />
          Upload Reel
        </Button>
      )}
      {reels.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
            <Play className="w-8 h-8 text-violet-500" />
          </div>
          <p className="text-slate-500">
            {editable ? 'No reels yet. Upload your first reel!' : 'No reels to display'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {reels.map((reel) => (
            <div className="space-y-2">
              <motion.div
                key={reel.id}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black group cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => setPreviewReel(reel)}>
                <video
                  src={reel.video_url}
                  className="w-full h-full object-cover"
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  muted
                  playsInline />

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>

                <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                  {reel.views || 0} {(reel.views || 0) === 1 ? 'view' : 'views'}
                </div>

                {reel.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs line-clamp-2">{reel.caption}</p>
                  </div>
                )}
              </motion.div>
              {editable && (
                <div className="flex justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteReelId(reel.id);
                    }}
                    className="gap-1 px-3 py-1 h-auto">
                    <Trash2 className="w-3 h-3" />
                    <span className="text-xs">Delete</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <ReelUpload
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)} />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewReel && (
          <motion.div
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewReel(null)}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewReel(null)}
              className="absolute top-4 right-4 text-white rounded-full bg-white/20 hover:bg-white/30">
              ×
            </Button>
            <video
              src={previewReel.video_url}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              autoPlay
              className="max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      {/* @ts-ignore */}
      <div>
        {/* @ts-ignore */}
        <AlertDialog open={!!deleteReelId} onOpenChange={(open) => !open && setDeleteReelId(null)}>
          {/* @ts-ignore */}
          <AlertDialogContent>
            {/* @ts-ignore */}
            <AlertDialogHeader>
              {/* @ts-ignore */}
              <AlertDialogTitle>Delete Reel?</AlertDialogTitle>
              {/* @ts-ignore */}
              <AlertDialogDescription>
                This action cannot be undone. This reel will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* @ts-ignore */}
            <AlertDialogFooter>
              {/* @ts-ignore */}
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {/* @ts-ignore */}
              <AlertDialogAction
                onClick={() => deleteReelId && deleteMutation.mutate(deleteReelId)}
                className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
