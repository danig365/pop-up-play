import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import logoImage from '@/assets/logo.jpeg';
import PlayButtonRed from '@/assets/PlayButtonRed.jsx';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      console.log('[DEBUG GoogleAuth] Google login initiated');
      
      // Send the token to the backend
      const response = await fetch('http://localhost:3001/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: credentialResponse.credential || credentialResponse.access_token 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Google authentication failed');
      }

      const user = await response.json();
      console.log('[DEBUG GoogleAuth] ✅ Google auth successful:', user.email);
      
      // Save user to localStorage
      localStorage.setItem('mock_auth_user', JSON.stringify(user));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      await checkUserAuth();
      
      console.log('[DEBUG GoogleAuth] 🔄 Navigating to Home...');
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('[DEBUG GoogleAuth] ❌ Google auth error:', err);
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google authentication failed. Please try again.');
    },
    flow: 'implicit',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[DEBUG Login] 📝 handleLogin started');
      console.log('[DEBUG Login] Email:', email);
      
      // Login with email and password
      console.log('[DEBUG Login] Calling base44.auth.login()...');
      const user = await base44.auth.login(email, password);
      console.log('[DEBUG Login] ✅ base44.auth.login() returned:', user.email);
      
      // Check what's in localStorage
      const savedUser = localStorage.getItem('mock_auth_user');
      console.log('[DEBUG Login] localStorage mock_auth_user:', savedUser ? JSON.parse(savedUser).email : 'NOT FOUND');
      
      // Small delay to ensure localStorage is updated
      console.log('[DEBUG Login] Waiting 200ms...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // ⭐ CRITICAL: Call checkUserAuth to update AuthContext state
      console.log('[DEBUG Login] Calling checkUserAuth() to update AuthContext...');
      await checkUserAuth();
      console.log('[DEBUG Login] ✅ checkUserAuth() complete - AuthContext updated');
      
      // Now navigate - AuthContext should have isAuthenticated=true
      console.log('[DEBUG Login] 🔄 Navigating to Home...');
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('[DEBUG Login] ❌ Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Login Form Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <img 
              src={logoImage} 
              alt="Pop Up Play" 
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
            <p className="text-violet-600 mb-4 text-sm font-bold leading-relaxed">
              Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
            </p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <PlayButtonRed size={32} />
              <p className="text-blue-600 font-semibold text-sm">Click Here to Watch Promo</p>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Pop Up Play</h1>
            <p className="text-slate-500 mt-1 text-sm">Sign in to continue</p>
          </div>

          {/* Email and Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 h-11 rounded-lg border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 h-11 rounded-lg border-slate-200"
                />
              </div>
            </div>

            {error && (
              <motion.div
                className="bg-red-50 border border-red-200 rounded-lg p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 h-12 rounded-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-semibold py-3 h-12 rounded-lg transition-all border border-slate-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          {/* Footer Links */}
          <div className="mt-6 flex justify-between text-sm">
            <button
              type="button"
              onClick={() => navigate(createPageUrl('ForgotPassword'))}
              className="text-slate-600 hover:text-slate-900 hover:underline"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => navigate(createPageUrl('Signup'))}
              className="text-slate-600 hover:text-slate-900"
            >
              Need an account? <span className="font-semibold text-slate-900">Sign up</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
