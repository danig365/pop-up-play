// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Mail, User, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getApiBaseUrl } from '@/lib/apiUrl';

const API_BASE_URL = getApiBaseUrl();

export default function Contact() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData((prev) => ({
          ...prev,
          name: currentUser.name || '',
          email: currentUser.email || '',
        }));
      } catch (err) {
        // Allow non-logged-in users to use the contact form
      }
    };
    loadUser();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }

    setSending(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('popup_auth_token');
      if (token) headers.Authorization = `Bearer ${token}`;
      if (user?.email) headers['x-user-email'] = user.email;

      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSent(true);
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h2>
          <p className="text-slate-600 mb-8">
            Thank you for reaching out. We'll get back to you as soon as possible.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setSent(false);
                setFormData((prev) => ({ ...prev, subject: '', message: '' }));
              }}
              variant="outline"
              className="w-full py-5 rounded-xl border-2 border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              Send Another Message
            </Button>
            <Button
              onClick={() => navigate(createPageUrl('Menu'))}
              className="w-full py-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              Back to Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(createPageUrl('Menu'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Contact Us</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-cyan-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Get In Touch</h2>
          <p className="text-slate-600">
            Have a question, feedback, or need help? Send us a message and we'll get back to you.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-6 space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
              <User className="w-4 h-4" /> Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400"
              required
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-slate-700 font-medium">
              Subject (optional)
            </Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What's this about?"
              className="rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700 font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Message
            </Label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Type your message here..."
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:ring-violet-400 focus:outline-none focus:ring-2 resize-none"
              required
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={sending}
            className="w-full py-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-base font-semibold"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </motion.form>

        <motion.p
          className="text-center text-sm text-slate-500 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          You can also reach us at{' '}
          <a href="mailto:contact@popupplay.fun" className="text-violet-600 hover:underline">
            contact@popupplay.fun
          </a>
        </motion.p>
      </main>
    </div>
  );
}
