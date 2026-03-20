import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const OTP_LENGTH = 6;

export default function VerifyOtp() {
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { checkUserAuth } = useAuth();

  // Get email from navigation state
  const email = location.state?.email || '';

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate(createPageUrl('Signup'));
    }
  }, [email, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    setError('');

    // Focus appropriate input
    const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if all digits pasted
    if (pastedData.length === OTP_LENGTH) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpString) => {
    const code = otpString || otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await base44.auth.verifyOtp(email, code);
      setSuccessMessage(result.message || 'Email verified successfully!');
      
      // Small delay to show success, then navigate
      await new Promise(resolve => setTimeout(resolve, 800));
      await checkUserAuth();
      navigate(createPageUrl('Profile'));
    } catch (err) {
      console.error('[VerifyOtp] Error:', err);
      setError(err.message || 'Verification failed. Please try again.');
      // Clear OTP inputs on error
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');
    try {
      await base44.auth.resendOtp(email);
      setSuccessMessage('A new verification code has been sent to your email.');
      setResendCooldown(60);
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email 
    ? email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, domain) => 
        start + '*'.repeat(Math.min(middle.length, 5)) + domain
      )
    : '';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Signup'))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to sign up</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
            <p className="text-slate-500 mt-2 text-sm">
              We've sent a 6-digit code to<br />
              <span className="font-medium text-slate-700">{maskedEmail}</span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isLoading}
                className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all
                  ${digit ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white'}
                  ${error ? 'border-red-300 bg-red-50' : ''}
                  focus:border-purple-500 focus:ring-2 focus:ring-purple-200
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-red-700 text-center">{error}</p>
            </motion.div>
          )}

          {/* Success */}
          {successMessage && (
            <motion.div
              className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-green-700 text-center">{successMessage}</p>
            </motion.div>
          )}

          {/* Verify Button */}
          <Button
            onClick={() => handleVerify()}
            disabled={isLoading || otp.join('').length !== OTP_LENGTH}
            className="w-full bg-purple-900 hover:bg-purple-800 text-white font-semibold py-3 h-12 rounded-lg transition-all mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : isResending
                  ? 'Sending...'
                  : 'Resend code'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
