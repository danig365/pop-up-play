import React, { useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSubscription } from '@/lib/SubscriptionContext';

export default function UserMarker({ profile, isCurrentUser, onProfileClick, unreadFromUser = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [popupHovered, setPopupHovered] = useState(false);
  const markerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { guardAction, hasAccess } = useSubscription();

  const handleChatClick = (e) => {
    e.stopPropagation();
    if (!guardAction('send messages')) return;
    navigate(createPageUrl('Chat') + '?user=' + profile.user_email);
  };

  const handleVideoCall = (e) => {
    e.stopPropagation();
    if (!guardAction('make video calls')) return;
    navigate(createPageUrl('VideoCall') + '?user=' + profile.user_email);
  };

  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-12 h-12 rounded-full border-3 ${isCurrentUser ? 'border-violet-500' : 'border-rose-400'} overflow-hidden shadow-lg bg-white transform transition-transform hover:scale-110">
            <img src="${profile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}" class="w-full h-full" style="object-fit: cover; object-position: center; width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;" oncontextmenu="return false;" draggable="false" />
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
          if (!isCurrentUser && !hasAccess) {
            // Non-paid user: show paywall, don't open the popup
            e.target.closePopup();
            guardAction('view profile details');
            return;
          }
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
          if (!isCurrentUser && !hasAccess) {
            // Non-paid user: show paywall, don't open the popup
            e.target.closePopup();
            guardAction('view profile details');
            return;
          }
          e.target.openPopup();
        },
        dblclick: () => {
          navigate(createPageUrl('Profile') + '?user=' + profile.user_email);
        }
      }}
    >
      <Popup className="custom-popup leaflet-popup" closeButton={false}>
        {/* Only show popup content for paid users or current user */}
        {(isCurrentUser || hasAccess) ? (
        <div 
          className="p-3 min-w-[220px] bg-white rounded-xl relative"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPopupHovered(false);
              if (markerRef.current) {
                markerRef.current.closePopup();
              }
            }}
            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={profile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`} 
              className="w-10 h-10 rounded-full object-cover border-2 border-violet-200"
              alt={profile.display_name}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
            />
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(createPageUrl('Profile') + '?user=' + profile.user_email);
                }}
                style={{ 
                  cursor: 'pointer', 
                  color: '#6d28d9', 
                  fontWeight: 600, 
                  fontSize: '0.875rem', 
                  background: 'none', 
                  border: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  textDecoration: 'none',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                title="View profile"
              >
                {profile.display_name || 'Anonymous'}
              </button>
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
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg p-1.5 shadow-lg transition-all hover:scale-110 relative"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {unreadFromUser > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none shadow">
                      {unreadFromUser > 99 ? '99+' : unreadFromUser}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="p-3 min-w-[180px] bg-white rounded-xl text-center">
            <p className="text-sm text-slate-500 font-medium">Subscribe to view profiles</p>
          </div>
        )}
      </Popup>
    </Marker>
  );
}