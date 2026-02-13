import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LocationService({ onLocationUpdate, autoUpdate = true }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding service error');
      
      const data = await response.json();
      const address = data.address || {};
      
      // Try multiple fields to find city name in order of preference
      const city = 
        address.city || 
        address.town || 
        address.village || 
        address.county ||
        address.district ||
        address.municipality ||
        'Unknown';
      
      const zip = address.postcode || address.postal_code || 'Unknown';
      const country = address.country || 'Unknown';
      
      console.log('🗺️ Reverse geocoding result:', { city, zip, country, fullAddress: data.address });
      
      return { city, zip, country };
    } catch (err) {
      console.error('❌ Reverse geocoding failed:', err);
      // Return approximate location from coordinates
      return { city: 'Location Found', zip: 'Unknown', country: 'Unknown' };
    }
  };

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geoData = await reverseGeocode(latitude, longitude);

        const locationInfo = {
          latitude,
          longitude,
          city: geoData.city,
          zip: geoData.zip,
          country: geoData.country,
          timestamp: new Date().toISOString()
        };

        console.log('✅ Location acquired:', locationInfo);
        setLocationData(locationInfo);
        setStatus('success');
        onLocationUpdate?.(locationInfo);
      },
      (err) => {
        let errorMessage = err.message || 'Failed to get location';
        
        // Provide specific error messages
        if (err.code === 1) {
          errorMessage = 'Permission denied. Allow location access in browser settings.';
        } else if (err.code === 2) {
          errorMessage = 'Location unavailable. Enable GPS or location services.';
        } else if (err.code === 3) {
          errorMessage = 'Location request timed out. Try again or check GPS.';
        }
        
        console.error('❌ Location error:', { code: err.code, message: err.message });
        setError(errorMessage);
        setStatus('error');
      },
      { 
        enableHighAccuracy: false,  // Set to false for faster results
        timeout: 20000,             // Increased from 10s to 20s
        maximumAge: 300000          // Cache location for 5 minutes
      }
    );
  }, [onLocationUpdate]);

  useEffect(() => {
    if (autoUpdate) {
      getLocation();

      // Update location every 5 minutes
      const interval = setInterval(getLocation, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, getLocation]);

  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}>

      {status === 'loading' &&
      <>
          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          <span className="text-sm text-slate-600">Finding your location...</span>
        </>
      }
      
      {status === 'success' && locationData &&
      <>
          <div className="bg-purple-400 rounded-full w-8 h-8 from-violet-500 to-purple-500 flex items-center justify-center">
            <MapPin className="text-black lucide lucide-map-pin w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{locationData.city}</p>
            <p className="text-xs text-slate-500">ZIP: {locationData.zip}</p>
          </div>
          <Button
          variant="ghost"
          size="icon"
          onClick={getLocation}
          className="h-8 w-8">

            <RefreshCw className="w-4 h-4 text-slate-400" />
          </Button>
        </>
      }
      
      {status === 'error' &&
      <>
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <span className="text-sm text-rose-600 flex-1">{error}</span>
          <Button
          variant="outline"
          size="sm"
          onClick={getLocation}
          className="text-xs">

            Retry
          </Button>
        </>
      }
      
      {status === 'idle' &&
      <Button
        onClick={getLocation}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600">

          <MapPin className="w-4 h-4 mr-2" />
          Enable Location
        </Button>
      }
    </motion.div>);

}