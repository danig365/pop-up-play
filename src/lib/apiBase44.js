/**
 * Base44 Client with PostgreSQL Backend
 * Replaces mock database with actual API calls
 */
const getAPIUrl = () => {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.__apiUrl) {
    // @ts-ignore
    return window.__apiUrl;
  }
  // Default fallback
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getAPIUrl();

// ============ Unified Auth Storage Keys ============
const AUTH_USER_KEY = 'popup_auth_user';
const AUTH_TOKEN_KEY = 'popup_auth_token';

// Migration: move old keys to new keys on first load
(function migrateOldAuthKeys() {
  if (typeof window === 'undefined') return;
  const oldUserKeys = ['mock_auth_user', 'auth_user'];
  const oldTokenKeys = ['mock_auth_token', 'auth_token'];

  if (!localStorage.getItem(AUTH_USER_KEY)) {
    for (const key of oldUserKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        localStorage.setItem(AUTH_USER_KEY, val);
        break;
      }
    }
  }
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    for (const key of oldTokenKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        localStorage.setItem(AUTH_TOKEN_KEY, val);
        break;
      }
    }
  }
  // Clean up old keys
  for (const key of [...oldUserKeys, ...oldTokenKeys]) {
    localStorage.removeItem(key);
  }
})();

// Get current auth token
function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Get current user email from session
function getCurrentUserEmail() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (stored) {
    try {
      const user = JSON.parse(stored);
      return user.email;
    } catch {
      return null;
    }
  }
  return null;
}

// Build auth headers for API requests
function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Keep x-user-email as fallback during transition
  const email = getCurrentUserEmail();
  if (email) {
    headers['x-user-email'] = email;
  }
  return headers;
}

// Entity class for API-based CRUD operations
class APIEntity {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async list(sortBy = '', limit = 100) {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/entities/${this.tableName}?limit=${limit}`, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to list ${this.tableName}`);
    }
    return response.json();
  }

  async filter(criteria = {}) {
    const email = getCurrentUserEmail();
    if (!email) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/filter`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(criteria),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to filter ${this.tableName}`);
    }
    return response.json();
  }

  async findOne(criteria = {}) {
    const results = await this.filter(criteria);
    return results[0] || null;
  }

  async create(data) {
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `Failed to create ${this.tableName}`);
      error.response = { data: errorData };
      throw error;
    }
    return response.json();
  }

  async update(id, data) {
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/${id}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `Failed to update ${this.tableName}`);
      error.response = { data: errorData };
      throw error;
    }
    return response.json();
  }

  async delete(id) {
    const headers = getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/${id}`,
      { method: 'DELETE', headers }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete ${this.tableName}`);
    }
    return response.json();
  }

  async bulkCreate(records) {
    return Promise.all(records.map(record => this.create(record)));
  }
}

// Integrations with API
class APIIntegrations {
  Core = {
    UploadFile: async ({ file }) => {
      // Upload file to server via multipart form data
      const formData = new FormData();
      formData.append('file', file);

      const { getApiBaseUrl } = await import('@/lib/apiUrl');
      const baseUrl = getApiBaseUrl().replace(/\/api$/, '');

      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const result = await response.json();
      // Return full URL so it works from the browser
      return {
        file_url: `${baseUrl}${result.file_url}`,
        file_name: result.file_name,
      };
    },
    SendEmail: async (config) => {
      console.log('Email sent via API:', config);
      return { success: true };
    },
  };
}

// Functions/Lambdas via API
class APIFunctions {
  async invoke(functionName, params = {}) {
    console.log(`📢 [APIFunctions] Function invoked: ${functionName}`, params);
    
    // Simulate different function responses
    switch (functionName) {
      case 'createCheckout':
        return {
          checkout_url: 'https://checkout.example.com/session',
          session_id: 'session_' + Math.random().toString(36).substr(2, 9),
        };
      case 'sendBroadcast':
        console.log('📢 [APIFunctions] sendBroadcast - Creating broadcast message...');
        // Return mock data that matches what the component expects
        return { 
          success: true, 
          data: {
            broadcast_sent: true,
            recipients: 1 // Mock: 1 recipient
          }
        };
      case 'getSubscriptionStatus':
        // Call the real backend function with user email
        const userEmail = getCurrentUserEmail();
        return fetch(`${API_BASE_URL}/functions/getSubscriptionStatus`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ user_email: userEmail })
        }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }).catch(err => {
          console.error('Error calling getSubscriptionStatus:', err);
          // Fail open - grant access on error so paid users aren't locked out
          return { required: false, hasAccess: true, status: 'error' };
        });
      case 'popDownUser':
        return { success: true };
      case 'cleanupStalePopups': {
        const cleanupEmail = getCurrentUserEmail();
        return fetch(`${API_BASE_URL}/functions/cleanupStalePopups`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({})
        }).then(r => r.json()).catch(err => {
          console.error('Error calling cleanupStalePopups:', err);
          return { success: false, error: err.message };
        });
      }
      default:
        return { success: true };
    }
  }
}

// Auth with API
class APIAuth {
  constructor() {
    this.currentUser = this.loadUser();
    this.token = this.loadToken();
  }

  loadUser() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(AUTH_USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  loadToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  saveAuth(user, token) {
    if (typeof window !== 'undefined') {
      // Save to unified keys
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    }
    this.currentUser = user;
    this.token = token || this.token;
  }

  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      // Clean up any legacy keys that might linger
      localStorage.removeItem('mock_auth_user');
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('redirect_after_login');
      localStorage.removeItem('device_id');
    }
    this.currentUser = null;
    this.token = null;
  }

  /**
   * Verify the current session with the server.
   * Returns the user object if valid, null otherwise.
   */
  async me() {
    // If no token stored, user is not logged in
    const token = this.loadToken();
    if (!token) {
      this.currentUser = null;
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        // Token is invalid or expired — clear auth
        console.warn('[APIAuth.me] Token validation failed, clearing auth');
        this.clearAuth();
        return null;
      }

      const user = await response.json();
      // Update local cache (but keep existing token)
      this.saveAuth(user, token);
      return user;
    } catch (error) {
      console.error('[APIAuth.me] Error validating token:', error);
      // Network error — return cached user so the app works offline
      return this.loadUser();
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Pass through email_not_verified flag for the Login page to handle
      if (errorData.email_not_verified) {
        const err = new Error(errorData.error || 'Email not verified');
        err.email_not_verified = true;
        err.email = errorData.email;
        throw err;
      }
      throw new Error(errorData.error || 'Login failed');
    }
    
    const data = await response.json();
    const { token, ...user } = data;
    this.saveAuth(user, token);
    return user;
  }

  async signup(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password,
        name: email.split('@')[0] 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Signup failed');
    }
    
    const data = await response.json();
    // Signup no longer returns a JWT — user must verify OTP first
    // Do NOT save auth here; the VerifyOtp page will handle that after verification
    return data;
  }

  async verifyOtp(email, otp) {
    if (!email || !otp) {
      throw new Error('Email and verification code are required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Verification failed');
    }
    
    const data = await response.json();
    const { token, message, ...user } = data;
    this.saveAuth(user, token);
    return { user, message };
  }

  async resendOtp(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to resend code');
    }
    
    return response.json();
  }

  async forgotPassword(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send reset email');
    }
    
    return response.json();
  }

  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reset password');
    }
    
    return response.json();
  }

  async logout(redirectUrl = null) {
    try {
      const userEmail = this.currentUser?.email;
      
      // Clear all auth state
      this.clearAuth();
      
      // Notify backend
      if (userEmail) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
        } catch (error) {
          console.warn('Backend logout failed (continuing):', error.message);
        }
      }
      
      // Redirect
      if (typeof window !== 'undefined') {
        const targetUrl = redirectUrl || window.location.origin;
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 100);
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = window.location.origin;
      }
    }
  }

  redirectToLogin(redirectUrl = null) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.token;
  }
}

// Logs with API
class APIAppLogs {
  async logUserInApp(pageName) {
    console.log(`User activity logged: ${pageName}`);
    return { success: true };
  }
}

// Main Base44 client with API
class APIBase44 {
  constructor() {
    this.auth = new APIAuth();
    this.integrations = new APIIntegrations();
    this.functions = new APIFunctions();
    this.appLogs = new APIAppLogs();
    
    // Create all entity types
    this.entities = {
      User: new APIEntity('User'),
      UserProfile: new APIEntity('UserProfile'),
      UserSubscription: new APIEntity('UserSubscription'),
      SubscriptionSettings: new APIEntity('SubscriptionSettings'),
      Message: new APIEntity('Message'),
      AccessCode: new APIEntity('AccessCode'),
      AboutVideo: new APIEntity('AboutVideo'),
      BlockedUser: new APIEntity('BlockedUser'),
      BroadcastMessage: new APIEntity('BroadcastMessage'),
      UserSession: new APIEntity('UserSession'),
      VideoSignal: new APIEntity('VideoSignal'),
      Reel: new APIEntity('Reel'),
      ProfileVideo: new APIEntity('ProfileVideo'),
    };
    
    // Service role for admin operations
    this.asServiceRole = {
      entities: this.entities,
      integrations: this.integrations,
    };
  }

  async initializeDefaultUser() {
    // Legacy demo auto-login is intentionally disabled.
    return this.auth.currentUser;
  }
}

export const base44 = new APIBase44();

// Initialize default user on page load (not module load)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      base44.initializeDefaultUser();
    });
  } else {
    base44.initializeDefaultUser();
  }
}
