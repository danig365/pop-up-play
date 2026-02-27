import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSubscription } from '@/lib/SubscriptionContext';
import { Lock, CreditCard, Key, X, Sparkles, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function PaywallModal() {
  const { paywallOpen, paywallFeature, paywallReturnTo, closePaywall } = useSubscription();
  const navigate = useNavigate();
  const isReelsPaywall = /reels/i.test(paywallFeature || '');

  const getReturnToWithReopen = () => {
    const fallbackReturnTo = paywallReturnTo || `${window.location.pathname}${window.location.search || ''}`;
    if (!isReelsPaywall) return fallbackReturnTo;

    const [path, search = ''] = fallbackReturnTo.split('?');
    const params = new URLSearchParams(search);
    params.set('reopenPaywall', '1');
    params.set('paywallFeature', paywallFeature || 'view reels');

    const nextSearch = params.toString();
    return nextSearch ? `${path}?${nextSearch}` : path;
  };

  const handleViewPlans = () => {
    closePaywall();
    navigate(createPageUrl('Pricing'), {
      state: { returnTo: getReturnToWithReopen() },
    });
  };

  const handleEnterCode = () => {
    closePaywall();
    navigate(createPageUrl('EnterAccessCode'), {
      state: { returnTo: paywallReturnTo || `${window.location.pathname}${window.location.search || ''}` },
    });
  };

  const handleBackToMenu = () => {
    closePaywall();
    navigate(createPageUrl('Menu'));
  };

  return (
    <AnimatePresence>
      {paywallOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePaywall}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
              {/* Header gradient */}
              <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-6 pt-8 pb-10 text-center relative">
                {isReelsPaywall ?
                <button
                  onClick={handleBackToMenu}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                  </button> :
                <button
                  onClick={closePaywall}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                  </button>
                }
                
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  Premium Feature
                </h2>
                <p className="text-sm text-violet-200">
                  Subscribe to {paywallFeature || 'unlock this feature'}
                </p>
              </div>

              {/* Body */}
              <div className="px-6 -mt-4">
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100">
                  <div className="flex items-start gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">What you'll get</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          Unlimited messaging & chat
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          Video verification calls
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          Pop Up on the map
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          Post & interact with reels
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          Full profile access
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pt-5 pb-6 space-y-3">
                <Button
                  onClick={handleViewPlans}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 rounded-xl text-base font-semibold shadow-lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  View Plans
                </Button>
                
                <Button
                  onClick={handleEnterCode}
                  variant="outline"
                  className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 py-5 rounded-xl text-sm font-medium"
                >
                  <Key className="w-4 h-4 mr-2" />
                  I have an access code
                </Button>

                <button
                  onClick={closePaywall}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
