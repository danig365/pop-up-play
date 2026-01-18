import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

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
            <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
            <p className="text-violet-600 mt-4 text-sm font-bold leading-relaxed">
              Connect and play with couples, singles, and alternative lifestyle lovers—right now, not tomorrow, not next week but right now.
            </p>
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
        </motion.div>
      </motion.div>
    </div>
  );
}
