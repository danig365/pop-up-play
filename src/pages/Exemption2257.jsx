import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Exemption2257() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const sections = [
    {
      title: 'Third-Party Content Disclaimer',
      text: 'The operators of Popupplay.fun are not the producers of depictions of actual or simulated sexually explicit conduct submitted by third-party users or members. Popupplay.fun is limited to transmission, storage, hosting, retrieval, formatting, and display of user-submitted content.'
    },
    {
      title: 'Community Platform Notice',
      text: 'Popupplay.fun is a community-driven platform for user-generated adult-oriented content. We make reasonable efforts to review and monitor content, but cannot guarantee that all content is always fully accurate or compliant.'
    },
    {
      title: 'Compliance Procedures',
      items: [
        'Users must confirm they are at least 18 years old (or legal age in their jurisdiction) before account creation or uploads.',
        'Users can report content that may violate laws, policies, or community standards.',
        'Automated moderation and filtering may be used to detect prohibited content before publication.',
        'Moderation teams may review content and remove material that violates Terms or applicable laws.'
      ]
    },
    {
      title: 'User Responsibility',
      text: 'Users are solely responsible for content they upload, publish, or share and for any consequences resulting from those actions. By submitting content, users confirm compliance with applicable laws and platform Terms of Use.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">2257 Exemption</h1>
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
              <ShieldAlert className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">2257 Exemption Statement</h2>
              <p className="text-sm text-slate-500">Compliance statement for user-generated content operations.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            In accordance with applicable law, Popupplay.fun operates as an intermediary platform for user-generated content and does not act as the producer of third-party submissions.
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
            {section.text && <p className="text-sm text-slate-600 leading-relaxed">{section.text}</p>}
            {section.items && (
              <ul className="space-y-2 mt-2">
                {section.items.map((item) => (
                  <li key={item} className="text-sm text-slate-600">- {item}</li>
                ))}
              </ul>
            )}
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
