// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

export default function Broadcast() {
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState(null);
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

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      console.log('📢 [Broadcast] Fetching recent broadcasts...');
      const { getApiBaseUrl } = await import('@/lib/apiUrl');
      const response = await fetch(`${getApiBaseUrl()}/broadcast/recent`);
      if (!response.ok) throw new Error('Failed to fetch broadcasts');
      const data = await response.json();
      console.log('📢 [Broadcast] Got broadcasts:', data);
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000 // Refetch every 5 seconds
  });

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
      toast.success(`Broadcast sent to ${data.recipients} users!`);
      setSubject('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
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

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (broadcastId) => {
      console.log('📢 [Broadcast] Deleting broadcast:', broadcastId);
      const response = await fetch(`${getApiBaseUrl()}/entities/BroadcastMessage/${broadcastId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete broadcast');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Broadcast deleted');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setDeleteDialogOpen(false);
      setBroadcastToDelete(null);
    },
    onError: (error) => {
      console.error('❌ [Broadcast] Error deleting:', error);
      toast.error(error.message || 'Failed to delete broadcast');
    }
  });

  const handleDeleteClick = (broadcast) => {
    setBroadcastToDelete(broadcast);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (broadcastToDelete) {
      deleteBroadcastMutation.mutate(broadcastToDelete.id);
    }
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
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
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
                  Send Broadcast to All Users
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Broadcast History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Broadcasts</h2>
          
          {broadcasts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500">No broadcasts sent yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <Card key={broadcast.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {broadcast.subject && (
                        <h3 className="font-semibold text-slate-800 mb-1">{broadcast.subject}</h3>
                      )}
                      <p className="text-sm text-slate-600 mb-2">{broadcast.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{new Date(broadcast.created_date).toLocaleString()}</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent to {broadcast.recipient_count} users
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(broadcast)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Broadcast Message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this broadcast message from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteBroadcastMutation.isPending}
            >
              {deleteBroadcastMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}