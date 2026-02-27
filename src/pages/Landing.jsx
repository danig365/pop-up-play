import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VideoModal from '@/components/popup/VideoModal';

const logoImage = new URL('../assets/logo.png', import.meta.url).href;
const bgImage = new URL('../assets/WhatsApp Image 2026-02-26 at 7.48.18 AM.jpeg', import.meta.url).href;

function PlayButton({ className = '', size = 80, onClick }) {
  return (
    <div
      className={`rounded-full bg-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <svg
        width={size * 0.45}
        height={size * 0.45}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="4,2 4,22 22,12" fill="#C057D6" />
      </svg>
    </div>
  );
}

export default function Landing() {
  const [rememberMe, setRememberMe] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if age was previously confirmed
  React.useEffect(() => {
    if (localStorage.getItem('age_confirmed') === 'true') {
      navigate(createPageUrl('Login'), { replace: true });
    }
  }, [navigate]);

  const handleYes = () => {
    if (rememberMe) {
      localStorage.setItem('age_confirmed', 'true');
    }
    navigate(createPageUrl('Login'));
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      {/* Mobile-only full-screen background image */}
      <img
        src={bgImage}
        alt=""
        className="md:hidden absolute inset-0 w-full h-full object-cover"
      />
      {/* Mobile-only purple tint overlay */}
      <div className="md:hidden absolute inset-0" style={{ backgroundColor: 'rgba(200, 142, 245, 0.35)' }} />

      {/* ===== DESKTOP LAYOUT (md+) ===== */}
      <div className="hidden md:flex min-h-screen relative z-10">
        {/* Left half — photo + tint */}
        <div className="w-1/2 relative overflow-hidden">
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(200, 142, 245, 0.35)' }} />
        </div>

        {/* Play button — centered on the divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <PlayButton size={100} onClick={() => setIsVideoModalOpen(true)} />
        </div>

        {/* Right half — solid purple bg + card + tagline */}
        <div className="w-1/2 flex flex-col items-center justify-center px-8 lg:px-16 relative z-10" style={{ backgroundColor: '#C88EF5' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg"
          >
            {/* Age gate card */}
            <div
              className="rounded-3xl px-8 py-10 text-center"
              style={{ background: 'rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            >
              <div className="flex justify-center mb-4">
                <img
                  src={logoImage}
                  alt="Pop-Up Play"
                  className="h-14 w-auto object-contain"
                />
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-8 leading-tight">
                Are You Over 18 Years Of Age?
              </h1>

              <div className="flex flex-row items-center justify-center gap-4 mb-6">
                <button
                  onClick={handleYes}
                  className="min-w-[120px] px-8 py-3 rounded-full bg-pink-200 text-pink-600 text-lg font-semibold hover:bg-pink-300 transition"
                >
                  Yes
                </button>
                <button
                  className="min-w-[120px] px-8 py-3 rounded-full border-2 border-white text-white text-lg font-semibold hover:bg-white/10 transition"
                >
                  No
                </button>
              </div>

              <label className="inline-flex items-center gap-3 text-white text-lg font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded border-white/60 bg-transparent accent-purple-400"
                />
                Remember Me
              </label>
            </div>

            {/* Tagline */}
            <p className="mt-6 text-white text-xl lg:text-2xl font-medium leading-relaxed text-center">
              Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ===== MOBILE LAYOUT (below md) ===== */}
      {/* Mobile play button — top right */}
      <div className="md:hidden absolute top-6 right-6 z-20">
        <PlayButton size={70} onClick={() => setIsVideoModalOpen(true)} />
      </div>

      <div className="flex md:hidden min-h-screen relative z-10 items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Age gate card */}
          <div
            className="rounded-2xl px-5 py-7 text-center"
            style={{ background: 'rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="flex justify-center mb-3">
              <img
                src={logoImage}
                alt="Pop-Up Play"
                className="h-10 w-auto object-contain"
              />
            </div>

            <h1 className="text-xl font-bold text-white mb-5 leading-tight">
              Are You Over 18 Years Of Age?
            </h1>

            <div className="flex flex-row items-center justify-center gap-3 mb-4">
              <button
                onClick={handleYes}
                className="min-w-[100px] px-6 py-2.5 rounded-full bg-pink-200 text-pink-600 text-base font-semibold hover:bg-pink-300 transition"
              >
                Yes
              </button>
              <button
                className="min-w-[100px] px-6 py-2.5 rounded-full border-2 border-white text-white text-base font-semibold hover:bg-white/10 transition"
              >
                No
              </button>
            </div>

            <label className="inline-flex items-center gap-2.5 text-white text-base font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/60 bg-transparent accent-purple-400"
              />
              Remember Me
            </label>
          </div>

          {/* Tagline */}
          <p className="mt-4 text-white text-lg font-medium leading-relaxed text-center px-2">
            Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
          </p>
        </motion.div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoSrc="/video.mp4"
        title="Pop Up Play Promo"
      />
    </div>
  );
}
