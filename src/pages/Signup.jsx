import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      console.log('[DEBUG GoogleAuth] Google signup initiated');
      
      // Send the token to the backend
      const response = await fetch(`${window.__apiUrl}/auth/google`, {
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

  const googleSignup = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google authentication failed. Please try again.');
    },
    flow: 'implicit',
  });

  const validateForm = () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('[DEBUG Signup] 📝 handleSignup started');
      console.log('[DEBUG Signup] Email:', email);

      // Call signup endpoint
      console.log('[DEBUG Signup] Calling base44.auth.signup()...');
      const user = await base44.auth.signup(email, password);
      console.log('[DEBUG Signup] ✅ base44.auth.signup() returned:', user.email);

      // Check what's in localStorage
      const savedUser = localStorage.getItem('mock_auth_user');
      console.log('[DEBUG Signup] localStorage mock_auth_user:', savedUser ? JSON.parse(savedUser).email : 'NOT FOUND');

      // Small delay to ensure localStorage is updated
      console.log('[DEBUG Signup] Waiting 200ms...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Call checkUserAuth to update AuthContext state
      console.log('[DEBUG Signup] Calling checkUserAuth() to update AuthContext...');
      await checkUserAuth();
      console.log('[DEBUG Signup] ✅ checkUserAuth() complete - AuthContext updated');

      // Navigate to Home
      console.log('[DEBUG Signup] 🔄 Navigating to Home...');
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('[DEBUG Signup] ❌ Signup error:', err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Signup Form Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Back to Sign In Link */}
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Login'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to sign in</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-violet-600 mb-4 text-sm font-bold leading-relaxed">
              Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or sign up with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            onClick={() => googleSignup()}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-semibold py-2 rounded-lg transition-all border border-slate-200 flex items-center justify-center gap-2"
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
            Sign up with Google
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
