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

// Get current user email from session
function getCurrentUserEmail() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('mock_auth_user');
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

// Entity class for API-based CRUD operations
class APIEntity {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async list(sortBy = '', limit = 100) {
    const response = await fetch(`${API_BASE_URL}/entities/${this.tableName}?limit=${limit}`);
    if (!response.ok) throw new Error(`Failed to list ${this.tableName}`);
    return response.json();
  }

  async filter(criteria = {}) {
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/filter`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      }
    );
    if (!response.ok) throw new Error(`Failed to filter ${this.tableName}`);
    return response.json();
  }

  async findOne(criteria = {}) {
    const results = await this.filter(criteria);
    return results[0] || null;
  }

  async create(data) {
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Failed to create ${this.tableName}`);
      error.response = { data: errorData };
      throw error;
    }
    return response.json();
  }

  async update(id, data) {
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Failed to update ${this.tableName}`);
      error.response = { data: errorData };
      throw error;
    }
    return response.json();
  }

  async delete(id) {
    const response = await fetch(
      `${API_BASE_URL}/entities/${this.tableName}/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete ${this.tableName}`);
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
      // For now, create a data URL (in production, upload to cloud storage)
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            file_url: reader.result,
            file_name: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
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
          headers: { 
            'Content-Type': 'application/json',
            'x-user-email': userEmail || ''
          },
          body: JSON.stringify({ user_email: userEmail })
        }).then(r => r.json()).catch(err => {
          console.error('Error calling getSubscriptionStatus:', err);
          return { required: true, hasAccess: false, status: 'error' };
        });
      case 'popDownUser':
        return { success: true };
      default:
        return { success: true };
    }
  }
}

// Auth with API
class APIAuth {
  constructor() {
    this.currentUser = this.loadUser();
  }

  loadUser() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('mock_auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  saveUser(user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_auth_user', JSON.stringify(user));
    }
    this.currentUser = user;
  }

  async me() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[DEBUG apiBase44.me] Called');
        // Always check localStorage first in case user logged in elsewhere
        const freshUser = this.loadUser();
        console.log('[DEBUG apiBase44.me] Loaded from localStorage:', freshUser?.email || 'NOT FOUND');
        console.log('[DEBUG apiBase44.me] this.currentUser:', this.currentUser?.email || 'NOT SET');
        const result = freshUser || this.currentUser;
        console.log('[DEBUG apiBase44.me] Returning user:', result?.email || 'NULL');
        resolve(result);
      }, 100);
    });
  }

  async login(email, password) {
    console.log('[DEBUG apiBase44.login] Starting login with email:', email);
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
      console.log('[DEBUG apiBase44.login] Login failed:', errorData.error);
      throw new Error(errorData.error || 'Login failed');
    }
    
    const user = await response.json();
    console.log('[DEBUG apiBase44.login] Login response received:', user.email);
    console.log('[DEBUG apiBase44.login] Saving user to localStorage...');
    this.saveUser(user);
    console.log('[DEBUG apiBase44.login] Saved. Checking localStorage...');
    const checkSaved = this.loadUser();
    console.log('[DEBUG apiBase44.login] Verified in localStorage:', checkSaved?.email);
    return user;
  }

  async signup(email, password) {
    console.log('[DEBUG apiBase44.signup] Starting signup with email:', email);
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
      console.log('[DEBUG apiBase44.signup] Signup failed:', errorData.error);
      throw new Error(errorData.error || 'Signup failed');
    }
    
    const user = await response.json();
    console.log('[DEBUG apiBase44.signup] Signup response received:', user.email);
    console.log('[DEBUG apiBase44.signup] Saving user to localStorage...');
    this.saveUser(user);
    console.log('[DEBUG apiBase44.signup] Saved. Checking localStorage...');
    const checkSaved = this.loadUser();
    console.log('[DEBUG apiBase44.signup] Verified in localStorage:', checkSaved?.email);
    return user;
  }

  async forgotPassword(email) {
    console.log('[DEBUG apiBase44.forgotPassword] Starting forgot password with email:', email);
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
      console.log('[DEBUG apiBase44.forgotPassword] Forgot password failed:', errorData.error);
      throw new Error(errorData.error || 'Failed to send reset email');
    }
    
    const result = await response.json();
    console.log('[DEBUG apiBase44.forgotPassword] Reset email sent successfully');
    return result;
  }

  async resetPassword(token, newPassword) {
    console.log('[DEBUG apiBase44.resetPassword] Starting password reset');
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
      console.log('[DEBUG apiBase44.resetPassword] Reset password failed:', errorData.error);
      throw new Error(errorData.error || 'Failed to reset password');
    }
    
    const result = await response.json();
    console.log('[DEBUG apiBase44.resetPassword] Password reset successfully');
    return result;
  }

  async logout(redirectUrl = null) {
    try {
      // Get user email before clearing state
      const userEmail = this.currentUser?.email;
      
      // Clear local storage first
      localStorage.removeItem('mock_auth_user');
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('redirect_after_login');
      localStorage.removeItem('device_id');
      this.currentUser = null;
      
      // Try to clear sessions from backend
      if (userEmail) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
          console.log('✅ Backend logout response:', response.status);
        } catch (error) {
          console.warn('⚠️ Backend logout failed (continuing):', error.message);
        }
      }
      
      // Redirect or resolve
      if (typeof window !== 'undefined') {
        const targetUrl = redirectUrl || window.location.origin;
        console.log('🔄 Redirecting to:', targetUrl);
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 100);
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force redirect anyway
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
    return !!this.currentUser;
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
    };
    
    // Service role for admin operations
    this.asServiceRole = {
      entities: this.entities,
      integrations: this.integrations,
    };
  }

  async initializeDefaultUser() {
    // Auto-login with demo user if not already authenticated
    if (!this.auth.currentUser) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@example.com', name: 'Demo User' }),
        });
        
        if (response.ok) {
          const user = await response.json();
          this.auth.saveUser(user);
          return user;
        }
      } catch (error) {
        console.warn('Failed to auto-login with demo user:', error.message);
      }
    }
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
