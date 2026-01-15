/**
 * Real Authentication System - Uses PostgreSQL Backend
 */

class RealAuth {
  constructor() {
    this.currentUser = this.loadUser();
    this.token = this.loadToken();
    this.apiUrl = 'http://localhost:3001/api';
  }

  loadUser() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  }

  loadToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  saveUser(user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    this.currentUser = user;
  }

  saveToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    this.token = token;
  }

  async me() {
    try {
      console.log('🔄 [RealAuth.me] Checking current user...');
      console.log('🔄 [RealAuth.me] this.currentUser:', this.currentUser?.email);
      console.log('🔄 [RealAuth.me] this.token exists:', !!this.token);
      
      // Return the current user from memory
      if (this.currentUser && this.token) {
        console.log('✅ [RealAuth.me] Found user in memory:', this.currentUser.email);
        return this.currentUser;
      }
      
      // Try to load from localStorage
      const stored = this.loadUser();
      if (stored) {
        console.log('✅ [RealAuth.me] Found user in localStorage:', stored.email);
        return stored;
      }
      
      console.log('⚠️ [RealAuth.me] No user found, returning null');
      return null;
    } catch (error) {
      console.error('❌ [RealAuth.me] Error:', error);
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
        body: JSON.stringify({ email, password, name: email.split('@')[0] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const user = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role || 'user', // Get role from database
        created_at: data.created_date,
      };

      this.saveUser(user);
      this.saveToken(data.token);
      
      console.log('✅ Logged in as:', user.email, 'Role:', user.role);
      return user;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  async logout(redirectUrl = null) {
    console.log('🔄 [RealAuth.logout] Starting logout...');
    const userEmail = this.currentUser?.email;
    console.log('🔄 [RealAuth.logout] User email:', userEmail);
    
    // Clear auth state immediately
    console.log('🔄 [RealAuth.logout] Clearing localStorage...');
    localStorage.removeItem('mock_auth_user');
    localStorage.removeItem('mock_auth_token');
    localStorage.removeItem('redirect_after_login');
    localStorage.removeItem('device_id');
    this.currentUser = null;
    this.token = null;
    console.log('✅ [RealAuth.logout] Local cleanup complete');

    // Try to notify backend to clear sessions (fire and forget)
    if (userEmail) {
      try {
        console.log('🔄 [RealAuth.logout] Calling backend /api/auth/logout...');
        const response = await fetch(`${this.apiUrl}/auth/logout`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        
        console.log('🔄 [RealAuth.logout] Backend response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [RealAuth.logout] Backend logout response:', data);
        }
      } catch (error) {
        console.error('⚠️ [RealAuth.logout] Backend logout failed (continuing anyway):', error);
      }
    }

    // Finally, redirect
    if (typeof window !== 'undefined') {
      const targetUrl = window.location.origin;
      console.log('🔄 [RealAuth.logout] Redirecting to:', targetUrl);
      // Use setTimeout to ensure state updates are processed
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
