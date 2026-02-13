import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NotificationBadge({ count, className }) {
  if (!count || count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={cn(
          "absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg",
          className
        )}
      >
        <span className="text-xs font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}