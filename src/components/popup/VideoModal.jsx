import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function VideoModal({ isOpen, onClose, videoSrc, title = 'Video Player' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className={`relative w-full max-w-4xl ${
              isFullscreen ? 'max-w-full' : 'max-w-4xl'
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Modal Container */}
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
              {/* Video Container */}
              <div className="relative w-full bg-black">
                {/* Responsive video wrapper */}
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <video
                    src={videoSrc}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-black bg-opacity-60 hover:bg-opacity-100 text-white p-2 rounded-full transition-all z-10"
                aria-label="Close video player"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Title (for mobile) */}
              <div className="md:hidden bg-slate-900 text-white p-3 text-center text-sm font-semibold">
                {title}
              </div>
            </div>

            {/* Close hint for desktop */}
            <div className="text-center text-white text-xs mt-4 hidden md:block">
              Press ESC to close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
