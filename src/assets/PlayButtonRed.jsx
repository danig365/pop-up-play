// SVG React component for a colored play button (blue)
import React from 'react';

export default function PlayButtonRed({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="26" stroke="#3B82F6" strokeWidth="4" fill="white" />
      <polygon points="22,17 22,39 40,28" fill="#3B82F6" />
    </svg>
  );
}
