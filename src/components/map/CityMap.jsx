import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import UserMarker from './UserMarker';
import { Loader2 } from 'lucide-react';

const DEFAULT_CENTER = [40.7128, -74.0060];
const DEFAULT_MAP_ZOOM = 11;
const MIN_MAP_ZOOM = 1;
const MAX_SAFE_MAP_ZOOM = 13;
const LOCATION_PRIVACY_OFFSET_KM = 0.35;

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

export default function CityMap({ activeUsers, totalActiveCount, currentUserProfile, userLocation, unreadMessages = [], onProfileClick }) {
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

  const getUsersWithLocation = () => {
    return activeUsers.map(profile => {
      const displayCoordinates = currentUserProfile?.id === profile.id
        ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
        : getObfuscatedCoordinates(profile);

      return {
        ...profile,
        displayLatitude: displayCoordinates.latitude,
        displayLongitude: displayCoordinates.longitude
      };
    }).filter(profile => Number.isFinite(profile.displayLatitude) && Number.isFinite(profile.displayLongitude));
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_MAP_ZOOM}
        minZoom={MIN_MAP_ZOOM}
        maxZoom={MAX_SAFE_MAP_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={mapCenter} />
        
        {getUsersWithLocation().map(profile => (
          <UserMarker 
            key={profile.id} 
            profile={profile}
            isCurrentUser={currentUserProfile?.id === profile.id}
            onProfileClick={onProfileClick}
            unreadFromUser={unreadMessages.filter(m => m.sender_email === profile.user_email).length}
          />
        ))}
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