// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';
import ChatList from '@/components/chat/ChatList';
import ChatConversation from '@/components/chat/ChatConversation';
import { useSubscription } from '@/lib/SubscriptionContext';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
const sanitizeEmail = (email) => (email || '').trim();

const resolveSectionBackUrl = (rawBackTo) => {
  const fallback = createPageUrl('Menu');
  const value = String(rawBackTo || '').trim();

  if (!value) return fallback;
  if (value.startsWith('/')) return value;

  const normalized = value.toLowerCase();
  if (normalized === 'chat' || normalized.startsWith('chat?')) {
    return fallback;
  }

  return createPageUrl(value);
};

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [backUrl, setBackUrl] = useState(createPageUrl('Menu'));
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guardAction } = useSubscription();
  const chatParams = new URLSearchParams(location.search);
  const openedFromProfile = chatParams.get('from') === 'profile';

  // Check for user parameter in URL and determine back button destination
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userEmail = params.get('user');
    const fromParam = params.get('from');
    const returnToParam = params.get('returnTo');
    if (userEmail) {
      const cleanUserEmail = sanitizeEmail(userEmail);
      // Store it to select match once matches are loaded
      sessionStorage.setItem('chatWithUser', cleanUserEmail);
      // If coming from a profile page, return to that exact profile route when available.
      if (fromParam === 'profile') {
        const profileFallback =
          createPageUrl('Profile') +
          `?user=${encodeURIComponent(cleanUserEmail)}` +
          `&back=${encodeURIComponent(params.get('backTo') || 'Home')}`;

        if (returnToParam) {
          try {
            const decodedReturnTo = String(returnToParam);
            if (decodedReturnTo.startsWith('/')) {
              setBackUrl(decodedReturnTo);
            } else {
              setBackUrl(profileFallback);
            }
          } catch {
            setBackUrl(profileFallback);
          }
        } else {
          setBackUrl(profileFallback);
        }
      } else if (fromParam === 'onlinemembers') {
        // If coming from Online Members section
        setBackUrl(createPageUrl('OnlineMembers'));
      } else if (fromParam === 'allprofiles') {
        // If coming from All Profiles section
        setBackUrl(createPageUrl('AllProfiles'));
      } else {
        // If coming from URL with user param (map popup), set back to Home
        setBackUrl(createPageUrl('Home'));
      }
    } else {
      // Otherwise, back to Menu
      setBackUrl(createPageUrl('Menu'));
    }
  }, [location.search]);

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

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.BlockedUser.filter({ blocker_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['allMessages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Fetch sent and received separately so we get ALL of the current user's messages
      // regardless of how many total messages exist in the DB (avoids the global 1000-message limit)
      const [sent, received] = await Promise.all([
        base44.entities.Message.filter({ sender_email: user.email }),
        base44.entities.Message.filter({ receiver_email: user.email }),
      ]);
      const merged = new Map();
      [...sent, ...received].forEach(m => merged.set(m.id, m));
      return Array.from(merged.values()).filter(
        m => !m.deleted_for?.includes(user.email)
      );
    },
    enabled: !!user?.email,
    refetchInterval: 10000
  });

  // Create conversation list from messages
  const conversations = React.useMemo(() => {
    if (!user?.email || !allMessages.length) return [];
    
    const conversationMap = new Map();
    
    allMessages.forEach(msg => {
      const otherEmail = msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
      
      // Skip blocked users
      if (blockedUsers.some(b => b.blocked_email === otherEmail)) return;
      
      if (!conversationMap.has(otherEmail)) {
        conversationMap.set(otherEmail, {
          otherUserEmail: otherEmail,
          messages: []
        });
      }
      conversationMap.get(otherEmail).messages.push(msg);
    });
    
    return Array.from(conversationMap.values());
  }, [allMessages, user?.email, blockedUsers]);

  // Auto-select conversation if user parameter provided
  useEffect(() => {
    const targetUser = sessionStorage.getItem('chatWithUser');
    if (targetUser && user?.email && normalizeEmail(targetUser) !== normalizeEmail(user.email)) {
      setSelectedConversation(targetUser);
      sessionStorage.removeItem('chatWithUser');
    }
  }, [user?.email]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 2000),
    refetchInterval: 30000
  });

  const conversationMessages = React.useMemo(() => {
    if (!selectedConversation) return [];
    const conv = conversations.find(c => c.otherUserEmail === selectedConversation);
    return conv ? conv.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) : [];
  }, [conversations, selectedConversation]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachment_url }) => {
      const message = await base44.entities.Message.create({
        sender_email: user.email,
        receiver_email: selectedConversation,
        content,
        attachment_url
      });

      // Email notification is now handled server-side automatically when a Message is created

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMessages'] });
    }
  });

  const handleSendMessage = async (content, attachment_url = null) => {
    if (!guardAction('send messages')) return;
    await sendMessageMutation.mutateAsync({ content, attachment_url });
  };

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        // Permanently delete the message
        await base44.entities.Message.delete(messageId);
      } else {
        // Soft delete - add current user to deleted_for array
        const message = conversationMessages.find(m => m.id === messageId);
        const deletedFor = message.deleted_for || [];
        await base44.entities.Message.update(messageId, {
          deleted_for: [...deletedFor, user.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMessages'] });
    }
  });

  const handleDeleteMessage = (messageId, deleteForEveryone) => {
    deleteMessageMutation.mutate({ messageId, deleteForEveryone });
  };

  const handleDeleteConversation = async (otherUserEmail) => {
    // Find all messages in this conversation
    const messagesToDelete = allMessages.filter(m => 
      (m.sender_email === user.email && m.receiver_email === otherUserEmail) ||
      (m.receiver_email === user.email && m.sender_email === otherUserEmail)
    );

    // Soft delete all messages for current user.
    // Also mark received unread messages as read so the badge count reflects reality —
    // the badge queries filter by read: false and don't check deleted_for.
    for (const message of messagesToDelete) {
      const deletedFor = message.deleted_for || [];
      const updates = { deleted_for: [...new Set([...deletedFor, user.email])] };
      // If this user received this message and it's still unread, mark it read
      if (message.receiver_email === user.email && !message.read) {
        updates.read = true;
      }
      await base44.entities.Message.update(message.id, updates);
    }

    // Clear selection if this was the selected conversation
    if (selectedConversation === otherUserEmail) {
      setSelectedConversation(null);
    }

    // Refresh messages and badge counts
    queryClient.invalidateQueries({ queryKey: ['allMessages'] });
    queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    queryClient.invalidateQueries({ queryKey: ['unreadMessagesList'] });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  const otherProfile = selectedConversation ?
    profiles.find((p) => normalizeEmail(p.user_email) === normalizeEmail(selectedConversation)) || {
      user_email: selectedConversation,
      display_name: selectedConversation.split('@')[0],
      avatar_url: null,
      is_popped_up: false,
      current_city: ''
    } : null;

  return (
    <div className="flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-gradient-to-br from-violet-50 via-white to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100 flex-shrink-0">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center gap-3 px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <Link to={backUrl}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <MessageCircle className="w-6 h-6 text-violet-600" />
          <h1 className="text-violet-600 text-xl font-bold">Messages</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto h-full min-h-0 w-full max-w-7xl min-w-0">
          <div className="grid h-full min-h-0 min-w-0 overflow-hidden bg-white shadow-xl md:grid-cols-[380px,1fr]">
            {/* Chat List - Hidden on mobile when chat is selected */}
            <div className={`
              border-r border-slate-200 
              ${selectedConversation ? 'hidden md:block' : 'block'}
              h-full min-h-0 min-w-0 overflow-hidden
            `}>
              <ChatList
                conversations={conversations}
                profiles={profiles}
                selectedUserEmail={selectedConversation}
                onSelectConversation={setSelectedConversation}
                currentUserEmail={user.email}
                onDeleteConversation={handleDeleteConversation}
                isLoading={messagesLoading} />

            </div>

            {/* Conversation - Hidden on mobile when no chat selected */}
            <div className={`
              ${selectedConversation ? 'block' : 'hidden md:flex md:items-center md:justify-center'}
              h-full min-h-0 min-w-0 overflow-hidden
            `}>
              {selectedConversation && otherProfile ?
              <ChatConversation
                otherUserEmail={selectedConversation}
                otherProfile={otherProfile}
                messages={conversationMessages}
                currentUserEmail={user.email}
                onBack={() => {
                  if (openedFromProfile) {
                    navigate(backUrl);
                    return;
                  }
                  setSelectedConversation(null);
                }}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onMessagesRead={() => {
                  queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
                  queryClient.invalidateQueries({ queryKey: ['unreadMessagesList'] });
                }}
                isSending={sendMessageMutation.isPending} /> :


              <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-slate-500">
                    Choose a conversation to start chatting
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      </main>
    </div>);

}