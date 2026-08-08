import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import UserMarker from './UserMarker';
import { Loader2 } from 'lucide-react';

const DEFAULT_CENTER = [40.7128, -74.0060];
const DEFAULT_MAP_ZOOM = 11;
const MIN_MAP_ZOOM = 1;
const MAX_SAFE_MAP_ZOOM = 13;
const LOCATION_PRIVACY_OFFSET_KM = 0.35;
// Pad the fetched region beyond the exact visible bounds so a small pan
// doesn't cause a visible pop-in while the next batch loads.
const BOUNDS_BUFFER_RATIO = 0.25;
const BOUNDS_DEBOUNCE_MS = 400;

function hashLocationSeed(value) {
  const source = String(value || 'anonymous');
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getObfuscatedCoordinates(profile) {
  const baseLatitude = Number(profile?.latitude);
  const baseLongitude = Number(profile?.longitude);

  if (!Number.isFinite(baseLatitude) || !Number.isFinite(baseLongitude)) {
    return {
      latitude: null,
      longitude: null
    };
  }

  const seed = hashLocationSeed(profile.id || profile.user_email || profile.display_name);
  const angle = (seed % 360) * (Math.PI / 180);
  const minDistanceKm = LOCATION_PRIVACY_OFFSET_KM * 0.5;
  const variableDistanceKm = seed % Math.round(LOCATION_PRIVACY_OFFSET_KM * 500);
  const distanceKm = minDistanceKm + (variableDistanceKm / 1000);
  const latitudeOffset = (distanceKm / 111) * Math.sin(angle);
  const longitudeOffset = (distanceKm / (111 * Math.max(Math.cos(baseLatitude * Math.PI / 180), 0.2))) * Math.cos(angle);

  return {
    latitude: baseLatitude + latitudeOffset,
    longitude: baseLongitude + longitudeOffset
  };
}

function MapController({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, DEFAULT_MAP_ZOOM, { duration: 1.5 });
    }
  }, [center, map]);

  return null;
}

// How long to wait for geolocation to resolve and re-center the map before
// falling back to scoping the fetch around wherever the map currently is
// (e.g. the default center, for a user who denies/lacks location access).
const INITIAL_BOUNDS_FALLBACK_MS = 5000;

// Reports padded, debounced map bounds up to the parent so it can fetch only
// profiles within (roughly) the visible area instead of everyone nationwide.
function MapBoundsWatcher({ onBoundsChange }) {
  const debounceRef = useRef(null);
  const reportedOnceRef = useRef(false);
  const popupOpenRef = useRef(false);

  const reportBounds = (map) => {
    reportedOnceRef.current = true;
    const bounds = map.getBounds();
    const latPad = (bounds.getNorth() - bounds.getSouth()) * BOUNDS_BUFFER_RATIO;
    const lngPad = (bounds.getEast() - bounds.getWest()) * BOUNDS_BUFFER_RATIO;

    onBoundsChange?.({
      minLat: bounds.getSouth() - latPad,
      maxLat: bounds.getNorth() + latPad,
      minLng: bounds.getWest() - lngPad,
      maxLng: bounds.getEast() + lngPad,
    });
  };

  const map = useMapEvents({
    popupopen: () => { popupOpenRef.current = true; },
    popupclose: () => { popupOpenRef.current = false; },
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // A popup's own autoPan nudges the map to keep itself fully visible,
        // which fires this same moveend. Refetching profiles for that tiny,
        // self-caused move replaces every marker with a fresh instance (a
        // separate, pre-existing quirk of how the marker list re-renders),
        // which closes the very popup that just opened — "hover it, see the
        // box, and it disappears while I'm still looking at it." Skip
        // reporting bounds while a popup is open; a real user-initiated pan
        // or zoom while nothing is open still refetches normally.
        if (popupOpenRef.current) return;
        reportBounds(map);
      }, BOUNDS_DEBOUNCE_MS);
    },
  });

  // Don't report bounds around the map's starting center immediately on
  // mount — that center is just a placeholder (DEFAULT_CENTER) until the
  // user's real location resolves and re-centers the map via flyTo, which
  // fires its own moveend above. Reporting bounds too early scoped the very
  // first fetch to the wrong place (e.g. NYC for someone across the world),
  // which correctly came back empty and made every avatar vanish for a
  // couple of seconds before the real, correctly-scoped ones appeared —
  // exactly what showed up as "avatars flickering" on load. Instead, wait
  // for the real re-center's moveend, with a fallback timer only for users
  // whose location never resolves (denied/unsupported/timed out).
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!reportedOnceRef.current) reportBounds(map);
    }, INITIAL_BOUNDS_FALLBACK_MS);
    return () => {
      clearTimeout(fallbackTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function CityMap({ activeUsers, totalActiveCount, currentUserEmail, userLocation, unreadMessages = [], onBoundsChange }) {
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const resolvedTotalCount = typeof totalActiveCount === 'number' ? totalActiveCount : activeUsers.length;
  const activeCountLabel = resolvedTotalCount !== activeUsers.length
    ? `${activeUsers.length} of ${resolvedTotalCount} active nearby`
    : `${activeUsers.length} active nearby`;

  useEffect(() => {
    if (userLocation) {
      const lat = Number(userLocation.latitude);
      const lon = Number(userLocation.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setMapCenter([lat, lon]);
      }
    }
  }, [userLocation]);

  const usersWithLocation = useMemo(() => {
    // Compared against the auth email (available the moment any marker can
    // exist at all — activeUsers itself is gated on it) rather than the
    // separate, slower-loading profile object. Using the profile object here
    // meant your own marker started on obfuscated coordinates (before the
    // profile query resolved) and then jumped to raw coordinates a moment
    // later — moving an already-clustered marker, which crashes a
    // leaflet.markercluster internal ("Cannot read properties of undefined
    // (reading 'x')" in DistanceGrid) that doesn't expect markers to move.
    return activeUsers.map(profile => {
      const displayCoordinates = currentUserEmail && currentUserEmail === profile.user_email
        ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
        : getObfuscatedCoordinates(profile);

      return {
        ...profile,
        displayLatitude: displayCoordinates.latitude,
        displayLongitude: displayCoordinates.longitude
      };
    }).filter(profile => Number.isFinite(profile.displayLatitude) && Number.isFinite(profile.displayLongitude));
  }, [activeUsers, currentUserEmail]);

  // usersWithLocation includes everyone in the padded/buffered bounds, not
  // just markers currently on screen — Leaflet only mounts a marker (and
  // starts loading its avatar) once it's actually scrolled into view. That
  // means panning into a new area shows several placeholder-then-fade-in
  // avatars all at once as their images fetch for the first time, which on a
  // slower mobile connection reads as "the map flickers when I move it".
  // Preloading every buffered profile's avatar as soon as its data arrives
  // means it's already in the browser cache by the time its marker actually
  // mounts, so the fade-in is instant instead of visible.
  const preloadedAvatarsRef = useRef(new Set());
  useEffect(() => {
    for (const profile of usersWithLocation) {
      const src = profile.avatar_thumb_url || profile.avatar_url;
      if (src && !preloadedAvatarsRef.current.has(src)) {
        preloadedAvatarsRef.current.add(src);
        const img = new Image();
        img.src = src;
      }
    }
  }, [usersWithLocation]);

  // Pre-computed once per unreadMessages change instead of a per-marker
  // .filter() scan (was O(markers × unread messages) on every render).
  const unreadCountByEmail = useMemo(() => {
    const map = new Map();
    for (const m of unreadMessages) {
      map.set(m.sender_email, (map.get(m.sender_email) || 0) + 1);
    }
    return map;
  }, [unreadMessages]);

  return (
    // Deliberately square corners, not rounded-2xl + overflow-hidden: clipping
    // to a rounded card also clips a marker's popup near the map's edge,
    // making it partly invisible and unreachable (the video-verify button
    // sits in the clipped-off part). A square card avoids the tradeoff
    // entirely instead of needing to pan the map to compensate, which has its
    // own problems (see the autoPan note on the Popup in UserMarker.jsx).
    <div className="relative w-full h-full shadow-xl">
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_MAP_ZOOM}
        minZoom={MIN_MAP_ZOOM}
        maxZoom={MAX_SAFE_MAP_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        // An open popup should only close via its own X button or by opening
        // a different marker's popup — not by an incidental tap/click on a
        // blank part of the map (Leaflet's default behavior otherwise).
        closePopupOnClick={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={mapCenter} />
        <MapBoundsWatcher onBoundsChange={onBoundsChange} />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          disableClusteringAtZoom={MAX_SAFE_MAP_ZOOM}
          showCoverageOnHover={false}
        >
          {usersWithLocation.map(profile => (
            <UserMarker
              key={profile.id}
              profile={profile}
              isCurrentUser={!!currentUserEmail && currentUserEmail === profile.user_email}
              unreadFromUser={unreadCountByEmail.get(profile.user_email) || 0}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-400 animate-pulse"></div>
          <span className="text-sm text-slate-600 font-medium">{activeCountLabel}</span>
        </div>
      </div>
    </div>
  );
}