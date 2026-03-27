const LOCATION_ENABLED_KEY = 'popupplay.location.enabled';

const DEFAULT_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 60000
};

export function isLocationEnabled() {
  if (typeof window === 'undefined') return true;
  const value = window.localStorage.getItem(LOCATION_ENABLED_KEY);
  if (value === null) return true;
  return value === 'true';
}

export function setLocationEnabled(enabled) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCATION_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getLocationPermissionState() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }

  if (!navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (error) {
    return 'unknown';
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );

    if (!response.ok) {
      throw new Error('Geocoding service error');
    }

    const data = await response.json();
    const address = data.address || {};

    const city =
      address.town ||
      address.city ||
      address.village ||
      address.suburb ||
      address.neighbourhood ||
      address.county ||
      address.district ||
      address.municipality ||
      address.state_district ||
      'Unknown';

    const zip = address.postcode || address.postal_code || '';
    const country = address.country || 'Unknown';
    const state = address.state || '';

    return { city, zip, country, state };
  } catch (error) {
    return { city: 'Location Found', zip: '', country: 'Unknown', state: '' };
  }
}

export function requestCurrentLocation(options = DEFAULT_GEO_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 0,
        userMessage: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geoData = await reverseGeocode(latitude, longitude);

          resolve({
            latitude,
            longitude,
            city: geoData.city,
            zip: geoData.zip,
            country: geoData.country,
            state: geoData.state,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          reject({
            code: 0,
            userMessage: 'Unable to process your current location. Please try again.'
          });
        }
      },
      (err) => {
        let userMessage = err.message || 'Failed to get location.';

        if (err.code === 1) {
          userMessage = 'Permission denied. Allow location access in browser settings.';
        } else if (err.code === 2) {
          userMessage = 'Location unavailable. Enable GPS or location services.';
        } else if (err.code === 3) {
          userMessage = 'Location request timed out. Try again or check GPS.';
        }

        reject({
          code: err.code,
          userMessage
        });
      },
      options
    );
  });
}