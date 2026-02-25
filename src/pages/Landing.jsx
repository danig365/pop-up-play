import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Image as ImageIcon, ShoppingCart, Facebook, Twitter, Instagram, ChevronRight, Menu, X } from 'lucide-react';
import heroImage from '@/assets/Untitled_design-removebg-preview.png';

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const slides = [0, 1, 2];

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-black relative">
      {/* Fullscreen Background with Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, 
              rgba(220, 38, 38, 0.3) 0%,
              rgba(0, 0, 0, 0.5) 50%,
              rgba(59, 130, 246, 0.3) 100%
            )
          `,
          backdropFilter: 'blur(2px)'
        }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60"></div>
      </div>

      {/* Center Hero Image */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-4"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <img
          src={heroImage}
          alt="Pop-Up Play"
          className="max-h-[90vh] md:max-h-[85vh] w-auto object-contain drop-shadow-2xl"
          onError={(e) => {
            console.error('Image failed to load:', e);
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E';
          }}
        />
      </motion.div>

      {/* Left Floating Toolbar - Extended */}
      <motion.div
        className={`fixed left-0 top-0 h-full z-40 flex flex-col items-center justify-center gap-8 ${
          mobileMenuOpen ? 'w-20 bg-black/80' : 'w-20'
        }`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Icon Stack */}
        <div className="flex flex-col gap-8 items-center">
          <motion.button 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <Home className="w-6 h-6" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <ImageIcon className="w-6 h-6" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <ShoppingCart className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-16 bg-gradient-to-b from-pink-400 to-blue-400"></div>

        {/* Social Icons */}
        <div className="flex flex-col gap-6 items-center">
          <motion.a 
            href="#" 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <Facebook className="w-5 h-5" />
          </motion.a>
          <motion.a 
            href="#" 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <Twitter className="w-5 h-5" />
          </motion.a>
          <motion.a 
            href="#" 
            whileHover={{ scale: 1.2 }}
            className="text-pink-400 hover:text-pink-300 transition"
          >
            <Instagram className="w-5 h-5" />
          </motion.a>
        </div>
      </motion.div>

      {/* Top Center Slider Indicators */}
      <motion.div
        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-40 flex gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {slides.map((_, index) => (
          <motion.div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === currentSlide 
                ? 'w-8 bg-pink-500' 
                : 'w-1.5 bg-gray-500'
            }`}
            whileHover={{ scale: 1.2 }}
          />
        ))}
      </motion.div>

      {/* Primary CTA Button - Responsive */}
      <motion.div
        className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 md:left-1/4"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Link to={createPageUrl('Signup')}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 md:px-12 py-3 md:py-4 border-2 border-pink-500 text-pink-500 font-bold uppercase text-sm md:text-lg tracking-widest hover:bg-pink-500/10 transition-all duration-300 backdrop-blur-sm whitespace-nowrap"
            style={{
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)'
            }}
          >
            START
          </motion.button>
        </Link>
      </motion.div>

      {/* Right Side Micro Content Block - Responsive */}
      <motion.div
        className="fixed right-4 md:right-12 bottom-24 md:bottom-32 z-30 max-w-xs text-right"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="space-y-2 md:space-y-3">
          <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-pink-400">
            Pop-Up Play
          </h3>
          <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
            Connect with people around you. Find genuine connections on an interactive map and chat with people nearby in your city.
          </p>
        </div>
      </motion.div>

      {/* Right-Side Arrow Control - Responsive */}
      <motion.button
        onClick={handleNextSlide}
        className="fixed right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-40 p-2 md:p-3 rounded-full border border-pink-500/50 hover:border-pink-500 transition-all duration-300"
        whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)' }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-pink-400" />
      </motion.button>

      {/* Bottom Auth Buttons - Responsive */}
      <motion.div
        className="fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex gap-3 md:gap-6 px-4 w-full md:w-auto md:px-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Link to={createPageUrl('Login')} className="flex-1 md:flex-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-6 md:px-8 py-2 md:py-3 border-2 border-gray-500 text-gray-300 font-semibold uppercase text-xs md:text-sm tracking-wider hover:border-pink-500 hover:text-pink-400 transition-all duration-300 backdrop-blur-sm"
          >
            Login
          </motion.button>
        </Link>
        <Link to={createPageUrl('Signup')} className="flex-1 md:flex-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full px-6 md:px-8 py-2 md:py-3 border-2 border-pink-500 text-pink-400 font-semibold uppercase text-xs md:text-sm tracking-wider hover:bg-pink-500/20 transition-all duration-300 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)'
            }}
          >
            Sign Up
          </motion.button>
        </Link>
      </motion.div>

      {/* Animated Glow Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 md:w-64 md:h-64 bg-red-500/20 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 md:w-64 md:h-64 bg-blue-500/20 rounded-full blur-3xl opacity-20 animate-pulse"></div>
    </div>
  );
}
