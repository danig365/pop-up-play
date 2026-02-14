/**
 * API Configuration Utility
 * Provides dynamic API base URL based on environment (development or production)
 */

export function getApiBaseUrl() {
  // Check if we have a globally set API URL (set from index.html)
  if (typeof window !== 'undefined' && window.__apiUrl) {
    return window.__apiUrl;
  }

  // Fallback: compute from current location
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    
    // Development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    // Production environment - use current domain
    return `${protocol}//${hostname}/api`;
  }

  // Server-side fallback
  return 'http://localhost:3001/api';
}

export const API_BASE_URL = getApiBaseUrl();
