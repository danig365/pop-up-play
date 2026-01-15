import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function EnterAccessCode() {
  const [user, setUser] = useState(null);
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: mySubscription } = useQuery({
    queryKey: ['userSubscription', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const subs = await base44.entities.UserSubscription.filter({
        user_email: user.email
      });
      return subs[0] || null;
    },
    enabled: !!user
  });

  const redeemMutation = useMutation({
    mutationFn: async (codeValue) => {
      const code = String(codeValue);
      console.log('🔑 [EnterAccessCode] Attempting to redeem code:', code);
      
      const codes = await base44.entities.AccessCode.filter({ 
        code: code.toUpperCase(),
        is_used: false
      });
      
      console.log('🔑 [EnterAccessCode] Filter result:', codes);
      
      if (codes.length === 0) {
        throw new Error('Invalid or already used code');
      }

      const accessCode = codes[0];
      
      if (accessCode.valid_until && new Date(accessCode.valid_until) < new Date()) {
        throw new Error('This code has expired');
      }

      console.log('🔑 [EnterAccessCode] Marking code as used...');
      await base44.entities.AccessCode.update(accessCode.id, {
        is_used: true,
        used_by: user.email,
        used_at: new Date().toISOString()
      });
      console.log('🔑 [EnterAccessCode] Code marked as used');

      console.log('🔑 [EnterAccessCode] Creating/updating subscription...');
      if (mySubscription) {
        console.log('🔑 [EnterAccessCode] Updating existing subscription:', mySubscription.id);
        await base44.entities.UserSubscription.update(mySubscription.id, {
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: accessCode.valid_until
        });
      } else {
        console.log('🔑 [EnterAccessCode] Creating new subscription...');
        await base44.entities.UserSubscription.create({
          user_email: user.email,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: accessCode.valid_until
        });
      }
      console.log('🔑 [EnterAccessCode] Subscription created/updated');

      return accessCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      toast.success('Access code redeemed successfully!');
      setTimeout(() => {
        navigate(createPageUrl('Home'));
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    // @ts-ignore - mutationFn accepts string parameter
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
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
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