import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Login Form Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome to Pop Up Play</h1>
            <p className="text-slate-600 mt-2 text-sm">Sign in to continue</p>
          </div>

          {/* Email and Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
            <div className="flex justify-center gap-1 text-sm text-slate-600">
              <button
                type="button"
                onClick={() => navigate(createPageUrl('ForgotPassword'))}
                className="text-slate-700 hover:text-slate-900 font-medium"
              >
                Forgot password?
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => navigate(createPageUrl('Signup'))}
                className="text-slate-700 hover:text-slate-900 font-medium"
              >
                Need an account? Sign up
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
