import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function About() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const queryClient = useQueryClient();

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
  }, []);

  const { data: aboutVideos = [] } = useQuery({
    queryKey: ['aboutVideos'],
    queryFn: () => base44.entities.AboutVideo.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (videoId) => base44.entities.AboutVideo.delete(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aboutVideos'] });
      toast.success('Video removed successfully');
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Delete existing video if any
      if (aboutVideos.length > 0) {
        await base44.entities.AboutVideo.delete(aboutVideos[0].id);
      }

      // Create new video record
      await base44.entities.AboutVideo.create({
        video_url: file_url,
        uploaded_by: user.email
      });

      queryClient.invalidateQueries({ queryKey: ['aboutVideos'] });
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setUploading(true);
    try {
      // Delete existing video if any
      if (aboutVideos.length > 0) {
        await base44.entities.AboutVideo.delete(aboutVideos[0].id);
      }

      // Create new video record with YouTube URL
      await base44.entities.AboutVideo.create({
        video_url: youtubeUrl.trim(),
        uploaded_by: user.email
      });

      queryClient.invalidateQueries({ queryKey: ['aboutVideos'] });
      toast.success('YouTube video added successfully');
      setYoutubeUrl('');
    } catch (error) {
      toast.error('Failed to add YouTube video');
    } finally {
      setUploading(false);
    }
  };

  const currentVideo = aboutVideos[0];
  const isAdmin = user?.role === 'admin';

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-purple-600 text-xl font-bold">About Pop Up Play</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}>

          {currentVideo ?
          <div className="relative">
              {currentVideo.video_url.includes('youtube.com') || currentVideo.video_url.includes('youtu.be') ? (
                <iframe
                  src={currentVideo.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={currentVideo.video_url}
                  controls
                  className="w-full aspect-video bg-slate-900">
                  Your browser does not support the video tag.
                </video>
              )}
              {isAdmin &&
            <div className="p-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      Uploaded by {currentVideo.uploaded_by}
                    </p>
                    <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(currentVideo.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-full">

                      {deleteMutation.isPending ?
                  <Loader2 className="w-4 h-4 animate-spin" /> :

                  <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Video
                        </>
                  }
                    </Button>
                  </div>
                </div>
            }
            </div> :

          <div className="aspect-video bg-gradient-to-br from-violet-100 to-rose-100 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/80 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {isAdmin ? 'No video uploaded yet' : 'Coming soon'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isAdmin ?
                'Upload a video to introduce Pop Up Play to users' :
                'Check back later for more information'}
                </p>
              </div>
            </div>
          }
        </motion.div>

        {/* Admin Upload Section */}
        {isAdmin &&
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Admin Controls
              </h2>
              
              {/* YouTube URL Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Add YouTube Video
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube URL here..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    disabled={uploading}
                  />
                  <Button
                    onClick={handleYoutubeSubmit}
                    disabled={uploading || !youtubeUrl.trim()}
                    className="bg-red-600 hover:bg-red-700">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <label className="block">
                <input
                type="file"
                accept="video/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="video-upload" />

                <Button
                asChild
                disabled={uploading}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">

                  <label htmlFor="video-upload" className="bg-gradient-to-r text-slate-50 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 w-full from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 cursor-pointer">
                    {uploading ?
                  <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </> :

                  <>
                        <Upload className="w-5 h-5 mr-2" />
                        {currentVideo ? 'Replace with File' : 'Upload Video File'}
                      </>
                  }
                  </label>
                </Button>
              </label>
            </div>
          </motion.div>
        }
      </main>
      {/* Disclaimer at the bottom */}
      <footer className="max-w-4xl mx-auto px-4 pb-6">
        <p className="text-xs text-gray-400 text-center mt-12">
          Popup-Play is an alternative lifestyle platform designed to connect couples and singles for spontaneous encounters in their local area. By uploading photos or videos to Popup-Play.com, you grant the platform permission to host your content. Subscriptions are billed monthly and will continue until canceled.<br />
          Prostitution is strictly prohibited, and all members must meet the legal age requirements of their country. Any violation of these terms will result in immediate account termination without a refund.
        </p>
      </footer>
    </div>);

}