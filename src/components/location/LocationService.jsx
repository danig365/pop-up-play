import React, { useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { requestCurrentLocation } from '@/lib/locationPermission';

const LocationService = React.forwardRef(function LocationService({ onLocationUpdate, autoUpdate = true, enabled = true }, ref) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);

  const getLocation = useCallback(async () => {
    if (!enabled) {
      setStatus('idle');
      setError(null);
      return null;
    }

    setStatus('loading');
    setError(null);

    try {
      const locationInfo = await requestCurrentLocation();
      console.log('✅ Location acquired:', locationInfo);
      setLocationData(locationInfo);
      setStatus('success');
      onLocationUpdate?.(locationInfo);
      return locationInfo;
    } catch (err) {
      console.error('❌ Location error:', err);
      setError(err?.userMessage || 'Failed to get location');
      setStatus('error');
      return null;
    }
  }, [enabled, onLocationUpdate]);

  useImperativeHandle(ref, () => ({
    requestLocation: getLocation
  }), [getLocation]);

  useEffect(() => {
    if (autoUpdate && enabled) {
      getLocation();

      // Update location every 5 minutes
      const interval = setInterval(getLocation, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, enabled, getLocation]);

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
            {locationData.zip ? (
              <p className="text-xs text-slate-500">ZIP: {locationData.zip}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">ZIP not available</p>
            )}
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
        disabled={!enabled}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600">

          <MapPin className="w-4 h-4 mr-2" />
          {enabled ? 'Enable Location' : 'Location Disabled'}
        </Button>
      }
    </motion.div>);

});

export default LocationService;