import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function RefundPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const sections = [
    {
      title: 'Membership Fees and Billing',
      text: 'Certain features and services on Popupplay.fun require subscription or membership fees. Pricing is shown on the membership upgrade page and may change over time.'
    },
    {
      title: 'Recurring Charges Authorization',
      text: 'By subscribing, you authorize Popupplay.fun to process recurring payments (including monthly charges) using your selected payment method until cancellation is completed.'
    },
    {
      title: 'Managing or Cancelling Membership',
      text: 'To manage your subscription, update billing information, or cancel recurring payments, log into your account and visit the pricing area.'
    },
    {
      title: 'Cancellation Effect',
      text: 'Cancellation requests become effective after receipt and processing. Changes or cancellations may not affect charges already processed before we can reasonably act on your request.'
    },
    {
      title: 'No Refund Policy',
      text: 'Unless required by applicable law, all payments are final and non-refundable. No refunds or credits are issued for partially used billing periods, unused subscription time, or prepaid services.'
    },
    {
      title: 'Policy Violations and Account Termination',
      text: 'If a user violates Terms and Conditions, Community Guidelines, or applicable policies, Popupplay.fun may suspend or terminate the account without refund.'
    },
    {
      title: 'Payment Method Limitations',
      text: 'Refunds cannot be processed to expired, canceled, or invalid payment methods. Users are responsible for keeping payment information current.'
    },
    {
      title: 'Billing Questions',
      text: 'For subscription, billing, cancellation, or payment questions, contact Popupplay.fun customer support.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Refund Policy</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <ReceiptText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Popupplay.fun Refund Policy</h2>
              <p className="text-sm text-slate-500">Please review this policy before purchasing a subscription.</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Membership services may include recurring payments. By upgrading, you agree to the billing terms described below.
          </p>
        </motion.div>

        {sections.map((section, idx) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4"
          >
            <h3 className="text-base font-semibold text-slate-800 mb-2">{section.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{section.text}</p>
          </motion.section>
        ))}

        <p className="text-sm text-slate-600 mt-6">
          For additional information, contact us at{' '}
          <a className="text-violet-700 underline" href="mailto:contact@popupplay.fun">contact@popupplay.fun</a>.
        </p>
      </main>
    </div>
  );
}
