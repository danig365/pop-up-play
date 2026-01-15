import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function AvatarUpload({ currentAvatar, onAvatarChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onAvatarChange(file_url);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    }
    setUploading(false);
  };

  return (
    <motion.div 
      className="relative group"
      whileHover={{ scale: 1.02 }}
    >
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
        <img
          src={currentAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </div>
      
      <label className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
          <Camera className="w-8 h-8 text-white" />
        )}
      </label>
      
      <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
        <Camera className="w-5 h-5 text-white" />
      </div>
    </motion.div>
  );
}