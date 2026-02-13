import React, { useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UserMarker({ profile, isCurrentUser, onProfileClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [popupHovered, setPopupHovered] = useState(false);
  const markerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const handleChatClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('Chat') + '?user=' + profile.user_email);
  };

  const handleVideoCall = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('VideoCall') + '?user=' + profile.user_email);
  };

  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-12 h-12 rounded-full border-3 ${isCurrentUser ? 'border-violet-500' : 'border-rose-400'} overflow-hidden shadow-lg bg-white transform transition-transform hover:scale-110">
            <img src="${profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}" class="w-full h-full" style="object-fit: cover; object-position: center; width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;" oncontextmenu="return false;" draggable="false" />
          </div>
          <div class="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 ${isCurrentUser ? 'bg-violet-500' : 'bg-rose-400'} rotate-45" style="bottom: -6px;"></div>
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56]
    });
  };

  if (!profile.latitude || !profile.longitude) return null;

  // Use offset coordinates for display, or fall back to actual coordinates
  const displayLat = profile.displayLatitude || profile.latitude;
  const displayLon = profile.displayLongitude || profile.longitude;

  return (
    <Marker
      position={[displayLat, displayLon]}
      icon={createCustomIcon()}
      ref={markerRef}
      eventHandlers={{
        mouseover: (e) => {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
          }
          setIsHovered(true);
          e.target.openPopup();
        },
        mouseout: (e) => {
          setIsHovered(false);
          closeTimeoutRef.current = setTimeout(() => {
            if (!popupHovered && markerRef.current) {
              markerRef.current.closePopup();
            }
          }, 200);
        },
        click: (e) => {
          e.target.openPopup();
        },
        dblclick: () => {
          navigate(createPageUrl('Profile') + '?user=' + profile.user_email);
        }
      }}
    >
      <Popup className="custom-popup leaflet-popup" closeButton={false}>
        <div 
          className="p-3 min-w-[220px] bg-white rounded-xl"
          onMouseEnter={() => {
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
            }
            setPopupHovered(true);
          }}
          onMouseLeave={() => {
            setPopupHovered(false);
            closeTimeoutRef.current = setTimeout(() => {
              if (markerRef.current) {
                markerRef.current.closePopup();
              }
            }, 200);
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'} 
              className="w-10 h-10 rounded-full object-cover border-2 border-violet-200"
              alt={profile.display_name}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
            />
            <div>
              <h3 className="font-semibold text-sm text-slate-800">{profile.display_name || 'Anonymous'}</h3>
              {profile.age && <p className="text-xs text-slate-500">{profile.age} years old</p>}
            </div>
          </div>
          {profile.popup_message && (
            <div className="bg-gradient-to-r from-violet-50 to-rose-50 rounded-lg p-2 mt-2">
              <p className="text-xs text-slate-700 italic">"{profile.popup_message}"</p>
            </div>
          )}
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-slate-500 font-medium">📍 {profile.location || profile.current_city || 'Finding location...'}</p>
            {!isCurrentUser && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleVideoCall}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg px-2 py-1.5 shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Video Verify</span>
                </button>
                <button
                  onClick={handleChatClick}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg p-1.5 shadow-lg transition-all hover:scale-110"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}