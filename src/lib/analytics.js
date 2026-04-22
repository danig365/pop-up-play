/**
 * Google Analytics 4 Setup and Event Tracking
 * Measurement ID: G-1DLV5PHSBF
 */

import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID || 'G-1DLV5PHSBF';

/**
 * Initialize Google Analytics
 */
export const initializeAnalytics = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not configured');
    return;
  }

  try {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log('Google Analytics initialized with ID:', GA_MEASUREMENT_ID);
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
};

/**
 * Track page view
 * @param {string} path - The page path
 * @param {string} title - The page title
 */
export const trackPageView = (path, title) => {
  try {
    ReactGA.pageview({
      path: path,
      title: title || document.title,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

/**
 * Track custom event
 * @param {string} action - Event action/name
 * @param {string} category - Event category
 * @param {string} label - Event label (optional)
 * @param {number} value - Event value (optional)
 */
export const trackEvent = (action, category, label = '', value = 0) => {
  try {
    ReactGA.event({
      action: action,
      category: category,
      label: label,
      value: value,
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

/**
 * Track user login/signup
 * @param {string} method - 'email', 'google', etc.
 */
export const trackAuthEvent = (method) => {
  trackEvent('authentication', 'user_auth', method);
};

/**
 * Track user logout
 */
export const trackLogout = () => {
  trackEvent('logout', 'user_auth', 'logout');
};

/**
 * Track subscription event
 * @param {string} action - 'purchase', 'upgrade', 'downgrade', 'cancel'
 * @param {string} planName - Name of the plan
 */
export const trackSubscriptionEvent = (action, planName) => {
  trackEvent(action, 'subscription', planName);
};

/**
 * Track chat message sent
 */
export const trackChatMessage = () => {
  trackEvent('message_sent', 'chat', 'message');
};

/**
 * Track reels interaction
 * @param {string} action - 'view', 'like', 'share'
 */
export const trackReelsInteraction = (action) => {
  trackEvent(action, 'reels', action);
};

/**
 * Track video call
 * @param {string} action - 'initiated', 'completed', 'declined'
 */
export const trackVideoCall = (action) => {
  trackEvent(action, 'video_call', action);
};

/**
 * Track profile update
 */
export const trackProfileUpdate = () => {
  trackEvent('profile_updated', 'profile', 'update');
};

/**
 * Track broadcast sent
 */
export const trackBroadcastSent = () => {
  trackEvent('broadcast_sent', 'broadcast', 'send');
};

/**
 * Set user properties
 * @param {string} userId - The user ID
 * @param {object} properties - Custom properties
 */
export const setUserProperties = (userId, properties = {}) => {
  try {
    ReactGA.set({
      'user_id': userId,
      ...properties,
    });
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
};
