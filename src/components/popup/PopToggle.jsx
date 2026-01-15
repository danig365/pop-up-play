import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, MapPinOff } from 'lucide-react';

export default function PopToggle({ isPopped, onToggle, isLoading, disabled }) {
  const handleToggleClick = () => {
    if (isPopped) {
      onToggle(false);
    } else {
      onToggle(true);
    }
  };

  return (
    <motion.button
      onClick={handleToggleClick}
      disabled={isLoading || disabled}
      className={`
        relative overflow-hidden rounded-full px-8 py-4 font-semibold text-lg
        transition-all duration-500 shadow-lg
        ${isPopped 
          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200' 
          : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-200'
        }
        hover:shadow-xl hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="flex items-center gap-3">
        {isPopped ? (
          <>
            <MapPinOff className="w-5 h-5" />
            Pop Down
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5" />
            Pop Up
          </>
        )}
      </span>
      
      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={false}
        animate={{ 
          x: isPopped ? '100%' : '-100%',
          opacity: 0 
        }}
        transition={{ duration: 0.5 }}
      />
    </motion.button>
  );
}