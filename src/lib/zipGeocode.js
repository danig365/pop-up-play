/**
 * ZIP Code Geocoding Utility
 *
 * ALL geocoding happens on the server via /api/geocode-zips.
 * The browser makes ZERO external API calls — only one request to our own server.
 * Server caches results permanently in memory, making repeated calls instant.
 */

import { getApiBaseUrl } from '@/lib/apiUrl';

const coordsCache = new Map(); // cacheKey → { lat, lon } | null
let bulkPromise = null; // single in-flight bulk request

/**
 * Build a cache key for a ZIP+country pair.
 */
function cacheKey(zip, country) {
  const z = String(zip || '').trim();
  const c = String(country || '').trim().toLowerCase() || 'auto';
  return `${z}_${c}`;
}

/**
 * Bulk-geocode an array of profiles in ONE server call.
 * Call this once with all profiles before computing distances.
 * Populates the local cache so subsequent getProfileCoords() calls are instant.
 *
 * @param {Array} profiles - array of profile objects (need zip_code and optional country)
 * @returns {void}
 */
export async function bulkGeocodeProfiles(profiles) {
  if (!profiles?.length) return;

  // Collect unique ZIPs that aren't already cached
  const needed = [];
  const seen = new Set();
  for (const p of profiles) {
    const zip = String(p?.zip_code || '').trim();
    if (!zip) continue;
    const country = String(p?.country || '').trim();
    const key = cacheKey(zip, country);
    if (!coordsCache.has(key) && !seen.has(key)) {
      seen.add(key);
      needed.push({ zip, country });
    }
  }

  if (needed.length === 0) return; // all cached already

  // If a bulk request is already in-flight, wait for it then check again
  if (bulkPromise) {
    await bulkPromise;
    // Re-check if we still need anything
    const stillNeeded = needed.filter(({ zip, country }) => !coordsCache.has(cacheKey(zip, country)));
    if (stillNeeded.length === 0) return;
  }

  // Make ONE request to our server
  const apiBase = getApiBaseUrl();
  bulkPromise = fetch(`${apiBase}/geocode-zips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zips: needed }),
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.results) {
        // Populate local cache with all returned coords
        for (const [key, coords] of Object.entries(data.results)) {
          coordsCache.set(key, coords);
        }
      }
      // Mark unreturned ZIPs as null so we don't re-request them
      for (const { zip, country } of needed) {
        const k = cacheKey(zip, country);
        if (!coordsCache.has(k)) coordsCache.set(k, null);
      }
      bulkPromise = null;
    })
    .catch(() => {
      // On network error, mark all as null to avoid retries blocking UI
      for (const { zip, country } of needed) {
        const k = cacheKey(zip, country);
        if (!coordsCache.has(k)) coordsCache.set(k, null);
      }
      bulkPromise = null;
    });

  await bulkPromise;
}

/**
 * Get cached coordinates for a single ZIP. Returns from local cache only.
 * Call bulkGeocodeProfiles() first to populate the cache.
 */
export function geocodeZipCached(zip, country = '') {
  const key = cacheKey(zip, country);
  return coordsCache.get(key) || null;
}

/**
 * Haversine distance in miles between two coordinate pairs.
 */
export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(v => Number.isFinite(Number(v)))) return null;
  const R = 3959;
  const toRad = v => Number(v) * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get coordinates for a profile based on ZIP code (primary) or GPS (fallback).
 * ZIP is always preferred because GPS represents current device location,
 * while ZIP represents the user's stated home location.
 *
 * This is now synchronous (reads from cache populated by bulkGeocodeProfiles).
 */
export function getProfileCoords(profile) {
  // 1) Always try ZIP first
  const zip = String(profile?.zip_code || '').trim();
  if (zip) {
    const coords = geocodeZipCached(zip, profile?.country || '');
    if (coords) return coords;
  }

  // 2) Fall back to GPS only if no ZIP or ZIP geocoding failed
  const lat = Number(profile?.latitude);
  const lon = Number(profile?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon };
  }

  return null;
}
