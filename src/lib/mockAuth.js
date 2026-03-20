/**
 * Real Authentication System - Uses PostgreSQL Backend
 * NOTE: This module is kept for backward compatibility.
 * The primary auth module is apiBase44.js (APIAuth class).
 * Both now use the same unified localStorage keys.
 */

const AUTH_USER_KEY = 'popup_auth_user';
const AUTH_TOKEN_KEY = 'popup_auth_token';

class RealAuth {
  constructor() {
    this.currentUser = this.loadUser();
    this.token = this.loadToken();
    this.apiUrl = 'http://localhost:3001/api';
  }

  loadUser() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  loadToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  saveUser(user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
    this.currentUser = user;
  }

  saveToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    this.token = token;
  }

  async me() {
    try {
      // Return the current user from memory
      if (this.currentUser && this.token) {
        return this.currentUser;
      }
      
      // Try to load from localStorage
      const stored = this.loadUser();
      if (stored) {
        return stored;
      }
      
      return null;
    } catch (error) {
      console.error('[RealAuth.me] Error:', error);
    }
    return null;
  }

  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const { token, ...user } = data;

      this.saveUser(user);
      this.saveToken(token);
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(redirectUrl = null) {
    const userEmail = this.currentUser?.email;
    
    // Clear all auth state (unified + legacy keys)
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('mock_auth_user');
    localStorage.removeItem('mock_auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('redirect_after_login');
    localStorage.removeItem('device_id');
    this.currentUser = null;
    this.token = null;

    // Notify backend
    if (userEmail) {
      try {
        await fetch(`${this.apiUrl}/auth/logout`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
      } catch (error) {
        console.warn('[RealAuth.logout] Backend logout failed (continuing):', error.message);
      }
    }

    // Redirect
    if (typeof window !== 'undefined') {
      const targetUrl = window.location.origin;
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);
    }
  }

  redirectToLogin(redirectUrl = null) {
    const returnUrl = redirectUrl || window.location.href;
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirect_after_login', returnUrl);
      window.location.href = window.location.origin + '?action=login';
    }
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.token;
  }
}

export const mockAuth = new RealAuth();
