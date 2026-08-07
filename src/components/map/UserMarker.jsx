import React, { useState, useRef, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSubscription } from '@/lib/SubscriptionContext';

function UserMarker({ profile, isCurrentUser, unreadFromUser = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [popupHovered, setPopupHovered] = useState(false);
  const markerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { guardAction, hasAccess } = useSubscription();

  // Touch screens don't have real hover — Leaflet still fires mouseover then
  // mouseout right after a tap to simulate it, which raced against the
  // close-on-mouseout timer below and made the popup flash open then closed
  // a moment later ("it blinks and disappears"). On touch, skip hover
  // entirely and just toggle the popup open/closed on tap.
  const isTouchDevice = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none), (pointer: coarse)').matches,
    []
  );

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

  // Rebuilding this Leaflet icon (a fresh HTML string + DOM parse) on every
  // render was a real cost multiplied by every marker on the map. Only the
  // fields actually baked into the HTML below need to invalidate it.
  const avatarSrc = profile.avatar_thumb_url || profile.avatar_url;
  const icon = useMemo(() => {
    // Every quote inside this data URI is percent-encoded (%27) rather than a
    // literal ' — this string gets embedded inside a single-quoted CSS url()
    // AND a single-quoted JS string below. A literal ' would prematurely end
    // those delimiters and silently break, which is what caused the "blank
    // white avatar" bug (background-image never rendered) and the "photo not
    // showing on iPhone" bug (the onerror fallback threw and left it blank).
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect fill=%27%23ddd6fe%27 width=%27100%27 height=%27100%27/%3E%3Ccircle cx=%2750%27 cy=%2738%27 r=%2718%27 fill=%27%23a78bfa%27/%3E%3Cellipse cx=%2750%27 cy=%2780%27 rx=%2728%27 ry=%2722%27 fill=%27%23a78bfa%27/%3E%3C/svg%3E`;
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-12 h-12 rounded-full border-3 ${isCurrentUser ? 'border-violet-500' : 'border-rose-400'} overflow-hidden shadow-lg bg-white transform transition-transform hover:scale-110" style="background-image: url('${placeholderSvg}'); background-size: cover;">
            ${avatarSrc ? `<img src="${avatarSrc}" class="w-full h-full" style="object-fit: cover; object-position: center; width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none; opacity: 0; transition: opacity 250ms ease-out;" oncontextmenu="return false;" draggable="false" onload="this.style.opacity=1;" onerror="this.onerror=null;this.src='${placeholderSvg}';this.style.opacity=1;" />` : ''}
          </div>
          <div class="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 ${isCurrentUser ? 'bg-violet-500' : 'bg-rose-400'} rotate-45" style="bottom: -6px;"></div>
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56]
    });
  }, [avatarSrc, isCurrentUser]);

  // Use offset coordinates for display, or fall back to actual coordinates.
  // Normalize to numbers to avoid Leaflet Invalid LatLng crashes.
  const displayLat = Number(profile.displayLatitude ?? profile.latitude);
  const displayLon = Number(profile.displayLongitude ?? profile.longitude);

  if (!Number.isFinite(displayLat) || !Number.isFinite(displayLon)) return null;

  // `[displayLat, displayLon]` written inline is a brand-new array on every
  // render — and this component re-renders on every hover-state change
  // (mouseover/mouseout/popup-hover), several times a second while the user
  // is just moving their mouse toward the popup. react-leaflet's Marker
  // compares position by reference, so each new array (even with identical
  // numbers) reads as "the marker moved" and calls marker.setLatLng() again.
  // Calling setLatLng on a marker inside an active MarkerClusterGroup makes
  // the plugin reprocess/re-add it — closing the popup that's mid-open, and
  // occasionally showing it briefly at the wrong spot mid-recluster. This is
  // the real cause of "the popup disappears / flashes elsewhere while I'm
  // just moving toward the button" — memoizing on the actual numbers instead
  // of the array literal stops setLatLng from ever being called spuriously.
  const position = useMemo(() => [displayLat, displayLon], [displayLat, displayLon]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        mouseover: (e) => {
          if (isTouchDevice) return;
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
          if (isTouchDevice) return;
          setIsHovered(false);
          // 200ms wasn't enough time for the mouse to travel from the marker
          // up to the popup above it — the popup closed itself mid-transit,
          // before onMouseEnter on the popup content had a chance to cancel
          // this timer ("I try to move to the box and it disappears").
          closeTimeoutRef.current = setTimeout(() => {
            if (!popupHovered && markerRef.current) {
              markerRef.current.closePopup();
            }
          }, 400);
        },
        click: (e) => {
          if (!isCurrentUser && !hasAccess) {
            // Non-paid user: show paywall, don't open the popup
            e.target.closePopup();
            guardAction('view profile details');
            return;
          }
          // On touch, a single tap can fire this click handler twice (Leaflet's
          // touch-to-click translation). openPopup() is idempotent either way —
          // closing is handled by the in-popup close button or by tapping
          // elsewhere on the map (Leaflet's default popup autoClose).
          e.target.openPopup();
        },
        dblclick: () => {
          // Double-clicking a marker jumps straight to that person's full
          // profile page — this used to skip the subscription paywall
          // entirely (the guard existed but lived in a dead, never-called
          // onProfileClick prop passed down from Home.jsx). Non-paying users
          // could reach a full profile this way even though the single-click
          // popup already blocks them from viewing details the normal way.
          if (!isCurrentUser && !guardAction('view full profiles')) return;
          navigate(
            createPageUrl('Profile') +
            '?user=' + encodeURIComponent(profile.user_email) +
            '&back=Home'
          );
        }
      }}
    >
      {/* autoPan off: leaflet.markercluster reprocesses which markers are shown
          on every map move (its own internal listener, separate from our own
          bounds-fetch logic) — panning to fit the popup triggers that pass,
          which closes the popup a moment after it opened. Keeping the popup
          fully reachable for markers near the map's edge is instead handled
          by not clipping the map's overflow (below), so the popup can extend
          past the rounded card without needing to move the map at all. */}
      <Popup className="custom-popup leaflet-popup" closeButton={false} maxWidth={220} minWidth={180} autoPan={false}>
        {/* Only show popup content for paid users or current user */}
        {(isCurrentUser || hasAccess) ? (
        <div
          className="p-2.5 w-[210px] max-w-[75vw] bg-white rounded-xl relative"
          // Scrolling the mouse wheel to reach content further down the popup
          // was instead reaching Leaflet's own wheel listener on the map
          // underneath — Leaflet treats wheel-over-the-map as a zoom gesture
          // by default, and that zoom (like any map move) makes the
          // clustering plugin reprocess and close the popup that's mid-open
          // ("I try to scroll up in the box... it disappears"). Stop the
          // wheel event here so it never reaches the map underneath.
          onWheel={(e) => e.stopPropagation()}
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
          <div className="flex items-center gap-2 mb-1.5">
            <img
              src={profile.avatar_thumb_url || profile.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`}
              className="w-8 h-8 rounded-full object-cover border-2 border-violet-200"
              alt={profile.display_name}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd6fe' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23a78bfa'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='22' fill='%23a78bfa'/%3E%3C/svg%3E`; }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
            />
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    createPageUrl('Profile') +
                    '?user=' + encodeURIComponent(profile.user_email) +
                    '&back=Home'
                  );
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
            <div className="bg-gradient-to-r from-violet-50 to-rose-50 rounded-lg p-1.5 mt-1.5">
              <p className="text-xs text-slate-700 italic">"{profile.popup_message}"</p>
            </div>
          )}
          <div className="mt-1.5 space-y-1">
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

export default React.memo(UserMarker);
