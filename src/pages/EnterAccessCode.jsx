import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiUrl';

export default function EnterAccessCode() {
  const [user, setUser] = useState(null);
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    location.state?.returnTo ||
    new URLSearchParams(location.search).get('returnTo') ||
    '';
  const backTarget = returnTo || createPageUrl('Menu');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const redeemMutation = useMutation({
    mutationFn: async (codeValue) => {
      const codeStr = String(codeValue).trim().toUpperCase();
      console.log('🔑 [EnterAccessCode] Attempting to redeem code via secure endpoint:', codeStr);
      
      // Use the dedicated secure redeem endpoint instead of direct entity access
      const response = await fetch(`${getApiBaseUrl()}/access-code/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({ code: codeStr })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to redeem code');
      }

      console.log('🔑 [EnterAccessCode] Code redeemed successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
      toast.success('Access code redeemed successfully!');
      setTimeout(() => {
        navigate(returnTo || createPageUrl('Home'));
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (redeemMutation.isPending) return;
    if (!code.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    redeemMutation.mutate(code.trim());
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(backTarget)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Enter Access Code</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 flex items-center justify-center">
              <Key className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Redeem Access Code
            </h2>
            <p className="text-slate-600">
              Enter your access code to unlock premium features
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., ABC123XY)"
                className="text-center text-lg tracking-widest font-mono uppercase rounded-xl border-2 border-slate-200 focus:border-violet-400 h-14"
                maxLength={12}
                disabled={redeemMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={redeemMutation.isPending || !code.trim()}
              className="w-full h-12 text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl"
            >
              {redeemMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Redeem Code
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Access codes provide free access for a limited time period. 
              Contact an administrator to obtain a valid code.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}