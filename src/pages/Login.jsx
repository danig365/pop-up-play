import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import logoImage from '@/assets/logo.jpeg';

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
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Pop Up Play</h1>
            <p className="text-slate-500 mt-1 text-sm">Sign in to continue</p>
            <p className="text-violet-600 mt-4 text-sm font-bold leading-relaxed">
              Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
            </p>
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
