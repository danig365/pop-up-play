import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Loader2, Copy, Key, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AccessCodeManager() {
  const [user, setUser] = useState(null);
  const [validityDays, setValidityDays] = useState(30);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUser(currentUser);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: accessCodes = [], isLoading } = useQuery({
    queryKey: ['accessCodes'],
    queryFn: () => base44.entities.AccessCode.list('-created_date'),
    enabled: !!user
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validityDays);
      
      console.log('📝 [AccessCodeManager] Generating code:', code);
      console.log('📝 [AccessCodeManager] Valid until:', validUntil.toISOString());
      console.log('📝 [AccessCodeManager] Created by:', user.email);
      
      const result = await base44.entities.AccessCode.create({
        code,
        valid_until: validUntil.toISOString(),
        created_by: user.email,
        is_used: false
      });
      
      console.log('✅ [AccessCodeManager] Code created:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success('Access code generated!');
    },
    onError: (error) => {
      console.error('❌ [AccessCodeManager] Error generating code:', error);
      toast.error(error.message || 'Failed to generate code');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (codeId) => base44.entities.AccessCode.delete(codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success('Code deleted');
    },
    onError: (error) => {
      console.error('❌ [AccessCodeManager] Error deleting code:', error);
      toast.error(error.message || 'Failed to delete code');
    }
  });

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Access Code Manager</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Generate New Code */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-800">Generate New Code</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="validity">Validity Period (Days)</Label>
              <Input
                id="validity"
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                className="mt-1 rounded-xl border-slate-200"
              />
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Generate Code
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Existing Codes */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Generated Codes</h2>

          {accessCodes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No codes generated yet
            </div>
          ) : (
            <div className="space-y-3">
              {accessCodes.map((accessCode) => {
                const isExpired = accessCode.valid_until ? new Date(accessCode.valid_until) < new Date() : false;
                
                return (
                  <div
                    key={accessCode.id}
                    className={`p-4 rounded-xl border-2 ${
                      accessCode.is_used
                        ? 'border-slate-200 bg-slate-50'
                        : isExpired
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-violet-200 bg-violet-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-bold text-slate-800 tracking-wider">
                          {accessCode.code}
                        </code>
                        {!accessCode.is_used && !isExpired && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(accessCode.code)}
                            className="h-8 w-8"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(accessCode.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        accessCode.is_used
                          ? 'bg-slate-200 text-slate-700'
                          : isExpired
                          ? 'bg-orange-200 text-orange-700'
                          : 'bg-green-200 text-green-700'
                      }`}>
                        {accessCode.is_used ? 'Used' : isExpired ? 'Expired' : 'Active'}
                      </span>
                      {accessCode.valid_until && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Valid until {format(new Date(accessCode.valid_until), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {accessCode.is_used && accessCode.used_by && (
                      <div className="mt-2 text-xs text-slate-500">
                        Used by {accessCode.used_by}{accessCode.used_at && ` on ${format(new Date(accessCode.used_at), 'MMM d, yyyy HH:mm')}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}