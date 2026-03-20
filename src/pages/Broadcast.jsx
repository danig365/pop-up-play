// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function Broadcast() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

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

  const sendBroadcastMutation = useMutation({
    mutationFn: async ({ subject, message }) => {
      console.log('📢 [Broadcast] Sending broadcast with subject:', subject);
      const { getApiBaseUrl } = await import('@/lib/apiUrl');
      
      const response = await fetch(`${getApiBaseUrl()}/broadcast/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({ subject, message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send broadcast');
      }

      const data = await response.json();
      console.log('📢 [Broadcast] Broadcast response:', data);
      
      return data.data;
    },
    onSuccess: (data) => {
      console.log('📢 [Broadcast] Success! Data:', data);
      const message = data.emails_sent !== undefined 
        ? `Broadcast sent to ${data.recipients} users! Emails sent: ${data.emails_sent}`
        : `Broadcast sent to ${data.recipients} users!`;
      toast.success(message);
      setSubject('');
      setMessage('');
    },
    onError: (error) => {
      console.error('❌ [Broadcast] Error:', error);
      toast.error(error.message || 'Failed to send broadcast');
    }
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendBroadcastMutation.mutate({ subject, message });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800">Broadcast Messages</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Compose Broadcast */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Send New Broadcast</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">📧 Email Notifications Enabled</p>
                  <p className="text-xs text-blue-700 mt-1">All users with email notifications enabled will receive this message via email.</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="subject" className="text-slate-600">Subject (Optional)</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
                className="mt-1 rounded-xl border-slate-200"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-slate-600">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to all users..."
                className="mt-1 rounded-xl border-slate-200 resize-none"
                rows={6}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={sendBroadcastMutation.isPending}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {sendBroadcastMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                  Sending to all users...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2 text-white" />
                  Send Broadcast & Emails to All Users
                </>
              )}
            </Button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}