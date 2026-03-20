import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Information We Collect',
      content: [
        { subtitle: 'a. Information You Provide', text: 'Account details (name, email, date of birth, gender, preferences), profile information (photos, bio, interests), messages and communications sent through the app, payment information (processed securely through third-party providers), and any other content you voluntarily submit.' },
        { subtitle: 'b. Information Collected Automatically', text: 'Device information (device type, operating system, unique identifiers), IP address and general location data, usage data (features used, interaction patterns, session duration), cookies and similar tracking technologies.' },
        { subtitle: 'c. Location Data', text: 'With your consent, we collect your precise or approximate location to show nearby users and enable location-based features. You can disable location access through your device settings at any time.' },
      ]
    },
    {
      title: '2. How We Use Your Information',
      items: [
        'Create and manage your account',
        'Match and connect you with other users',
        'Personalize your experience',
        'Process transactions and subscriptions',
        'Send important service-related communications',
        'Improve app performance and develop new features',
        'Enforce our Terms of Service and protect user safety',
        'Comply with legal obligations',
      ]
    },
    {
      title: '3. Sharing Your Information',
      content: [
        { subtitle: 'Other Users', text: 'Your profile information (name, photos, bio, preferences) is visible to other users based on your privacy settings.' },
        { subtitle: 'Service Providers', text: 'We share data with trusted third parties who help us operate the app (e.g., hosting, payment processing, analytics).' },
        { subtitle: 'Legal Compliance', text: 'We may disclose information if required by law, regulation, or legal process.' },
        { subtitle: 'Safety', text: 'We may share information to protect users, investigate violations, or prevent fraud.' },
      ],
      note: 'We do not sell your personal information to third parties.'
    },
    {
      title: '4. Data Retention',
      text: 'We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.'
    },
    {
      title: '5. Your Rights and Choices',
      items: [
        'Access, update, or delete your personal data',
        'Opt out of marketing communications',
        'Disable location tracking via device settings',
        'Request a copy of your data',
        'Withdraw consent where applicable',
      ],
      note: 'To exercise any of these rights, contact us at contact@popupplay.fun.'
    },
    {
      title: '6. Security',
      text: 'We implement industry-standard security measures to protect your data. However, no system is 100% secure, and we cannot guarantee absolute security.'
    },
    {
      title: '7. Children\'s Privacy',
      text: 'Pop Up Play is not intended for users under the age of 18. We do not knowingly collect data from minors. If we become aware of such data, we will delete it promptly.'
    },
    {
      title: '8. Third-Party Links',
      text: 'Our app may contain links to third-party websites or services. We are not responsible for their privacy practices and encourage you to review their policies.'
    },
    {
      title: '9. Changes to This Policy',
      text: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of Pop Up Play after changes constitutes your acceptance of the updated policy.'
    },
    {
      title: '10. Contact Us',
      text: 'If you have questions, concerns, or requests regarding this Privacy Policy, please contact us at:',
      contact: {
        email: 'contact@popupplay.fun',
        app: 'Pop Up Play',
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Privacy Policy</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Intro */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pop Up Play</h2>
                <p className="text-sm text-slate-500">Effective Date: March 6, 2026</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Pop Up Play ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and safeguard your personal information when you use our mobile application and related services (collectively, the "App").
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              By using Pop Up Play, you agree to the practices described in this policy. If you do not agree, please do not use the App.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-3">{section.title}</h3>

              {/* Text paragraph */}
              {section.text && (
                <p className="text-slate-600 leading-relaxed">{section.text}</p>
              )}

              {/* Subsections with subtitle + text */}
              {section.content && section.content.map((sub, sIdx) => (
                <div key={sIdx} className="mb-3 last:mb-0">
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">{sub.subtitle}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{sub.text}</p>
                </div>
              ))}

              {/* Bullet list */}
              {section.items && (
                <ul className="space-y-2 mt-2">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx} className="flex items-start gap-2 text-slate-600 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* Note */}
              {section.note && (
                <p className="text-sm text-purple-600 font-medium mt-3">{section.note}</p>
              )}

              {/* Contact info */}
              {section.contact && (
                <div className="mt-3 bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${section.contact.email}`} className="text-purple-600 underline">
                      {section.contact.email}
                    </a>
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-medium">App:</span> {section.contact.app}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
