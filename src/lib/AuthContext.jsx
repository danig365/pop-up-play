import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Check if user is authenticated using mock auth
      await checkUserAuth();
      
      // Set default app settings for mock
      setAppPublicSettings({ id: 'app_default', public_settings: {} });
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('App state check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to load app'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      console.log('[DEBUG AuthContext.checkUserAuth] 🔄 Starting checkUserAuth...');
      const currentUser = await base44.auth.me();
      console.log('[DEBUG AuthContext.checkUserAuth] Got user:', currentUser?.email || 'NULL');
      
      if (currentUser) {
        console.log('[DEBUG AuthContext.checkUserAuth] ✅ User authenticated:', currentUser.email);
        setUser(currentUser);
        setIsAuthenticated(true);
        console.log('[DEBUG AuthContext.checkUserAuth] State updated - isAuthenticated=true');
      } else {
        console.log('[DEBUG AuthContext.checkUserAuth] ⚠️ No user found, setting isAuthenticated to false');
        setUser(null);
        setIsAuthenticated(false);
        console.log('[DEBUG AuthContext.checkUserAuth] State updated - isAuthenticated=false');
      }
      setIsLoadingAuth(false);
      console.log('[DEBUG AuthContext.checkUserAuth] ✅ checkUserAuth complete');
    } catch (error) {
      console.error('[DEBUG AuthContext.checkUserAuth] ❌ Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    // Pass null to redirect to home page (logout will handle redirect)
    base44.auth.logout(shouldRedirect ? null : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
