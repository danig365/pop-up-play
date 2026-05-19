import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const sections = [
    {
      title: '1. Acceptance of Terms',
      text: 'By accessing or using Popupplay.fun, you acknowledge and agree to these Terms and all related policies, guidelines, and notices posted on the platform. If you do not agree to these Terms, you may not use the Services.'
    },
    {
      title: '2. Eligibility and Access',
      text: 'You must be at least 18 years old, or the legal age required to access adult-oriented content in your jurisdiction, to use Popupplay.fun. We may request age verification and suspend or terminate accounts that fail to comply.'
    },
    {
      title: '3. Registration and Account Responsibility',
      items: [
        'All information provided must be accurate, current, and complete.',
        'You must maintain and update your account information.',
        'You are responsible for safeguarding your login credentials.',
        'You are responsible for all activity under your account.'
      ]
    },
    {
      title: '4. User Conduct and Community Standards',
      text: 'Users are solely responsible for content they upload, publish, or share through Popupplay.fun. Prohibited conduct includes harassment, illegal content, content involving minors, privacy violations, spam, scams, unauthorized automation, impersonation, exploitation, trafficking, and illegal solicitation. Popupplay.fun may remove violating content at its discretion.'
    },
    {
      title: '5. User Content and Licensing',
      text: 'Users retain ownership rights to their uploaded content. By posting content, you grant Popupplay.fun a non-exclusive, worldwide, royalty-free license to host, display, reproduce, process, adapt, and distribute content for operation and promotion of the Services.'
    },
    {
      title: '6. Moderation and Reporting',
      text: 'Popupplay.fun provides reporting tools for policy or legal violations. Reported content may be reviewed and removed. Automated moderation systems may also be used.'
    },
    {
      title: '7. Payments, Memberships, and Refunds',
      text: 'Some features require paid subscriptions or membership fees. Billing may be recurring until canceled. Cancellation stops future charges but does not create refunds for prior payments or unused subscription time unless required by law.'
    },
    {
      title: '8. Third-Party Services and Links',
      text: 'Popupplay.fun may include links to third-party websites or services. We do not control or assume responsibility for third-party content, products, or policies.'
    },
    {
      title: '9. Intellectual Property',
      text: 'Platform software, branding, logos, graphics, and proprietary materials are protected by intellectual property laws and remain the property of Popupplay.fun or its licensors.'
    },
    {
      title: '10. Disclaimer of Warranties',
      text: 'Services are provided on an AS IS and AS AVAILABLE basis. We do not guarantee uninterrupted operation, accuracy of user content, or error-free and secure services.'
    },
    {
      title: '11. Limitation of Liability',
      text: 'To the fullest extent permitted by law, Popupplay.fun and related parties are not liable for indirect, incidental, special, consequential, or punitive damages related to platform use.'
    },
    {
      title: '12. Privacy',
      text: 'Use of Popupplay.fun is also governed by our Privacy Policy. By using the Services, you consent to the collection and processing of information described there.'
    },
    {
      title: '13. Account Suspension and Termination',
      text: 'Popupplay.fun may suspend, restrict, or terminate any account at its discretion, with or without notice, for Terms violations or harmful conduct.'
    },
    {
      title: '14. Copyright Complaints',
      text: 'Popupplay.fun respects intellectual property rights and responds to valid complaints under applicable law, including DMCA-related notices.'
    },
    {
      title: '15. Governing Law',
      text: 'These Terms are governed by applicable law in the jurisdiction where Popupplay.fun operates, without regard to conflict-of-law principles.'
    },
    {
      title: '16. Changes to Terms',
      text: 'Popupplay.fun may update these Terms at any time. Continued use after updates constitutes acceptance of the revised Terms.'
    },
    {
      title: '17. Communications',
      text: 'By creating an account or using the Services, you consent to receive electronic communications including notices, updates, and service messages.'
    },
    {
      title: '18. Contact Information',
      text: 'For support, legal inquiries, or reports regarding violations, contact us at contact@popupplay.fun.'
    },
    {
      title: '19. Violations',
      text: 'Popupplay.fun may pursue available legal and equitable remedies for violations, including account termination, content removal, and cooperation with law enforcement where appropriate.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Terms and Conditions</h1>
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
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Welcome to Popupplay.fun</h2>
              <p className="text-sm text-slate-500">Please read these terms carefully before using the platform.</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Popupplay.fun is an online social networking and community platform for adults. By accessing or using the website,
            products, or services, you agree to be legally bound by these Terms and Conditions.
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
