// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';
import ChatList from '@/components/chat/ChatList';
import ChatConversation from '@/components/chat/ChatConversation';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [backUrl, setBackUrl] = useState(createPageUrl('Menu'));
  const queryClient = useQueryClient();

  // Check for user parameter in URL and determine back button destination
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userEmail = params.get('user');
    const fromParam = params.get('from');
    if (userEmail) {
      // Store it to select match once matches are loaded
      sessionStorage.setItem('chatWithUser', userEmail);
      // If coming from a profile page, return to that profile
      if (fromParam === 'profile') {
        const backToParam = params.get('backTo') || 'Menu';
        setBackUrl(createPageUrl('Profile') + `?user=${userEmail}&back=${backToParam}`);
      } else if (fromParam === 'onlinemembers') {
        // If coming from Online Members section
        setBackUrl(createPageUrl('OnlineMembers'));
      } else {
        // If coming from URL with user param (map popup), set back to Home
        setBackUrl(createPageUrl('Home'));
      }
    } else {
      // Otherwise, back to Menu
      setBackUrl(createPageUrl('Menu'));
    }
  }, []);

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

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const messages = await base44.entities.Message.list('-created_date', 1000);
      return messages.filter(m => 
        (m.sender_email === user.email || m.receiver_email === user.email) &&
        !m.deleted_for?.includes(user.email)
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
    if (targetUser && user?.email && targetUser !== user.email) {
      setSelectedConversation(targetUser);
      sessionStorage.removeItem('chatWithUser');
    }
  }, [user?.email]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
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

      // Send email notification to receiver (if they have it enabled)
      try {
        // Check if recipient has email notifications enabled
        const recipientProfile = profiles.find(p => p.user_email === selectedConversation);
        const emailNotificationsEnabled = recipientProfile?.email_notifications_enabled !== false;

        if (emailNotificationsEnabled) {
          const senderProfile = profiles.find(p => p.user_email === user.email);
          const senderName = senderProfile?.display_name || user.email.split('@')[0] || 'Someone';
          
          await fetch(`${getApiBaseUrl()}/email/send-chat-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail: selectedConversation,
              senderEmail: user.email,
              senderName: senderName,
              messageContent: content
            })
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the message if email fails
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMessages'] });
    }
  });

  const handleSendMessage = async (content, attachment_url = null) => {
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

    // Soft delete all messages for current user
    for (const message of messagesToDelete) {
      const deletedFor = message.deleted_for || [];
      if (!deletedFor.includes(user.email)) {
        await base44.entities.Message.update(message.id, {
          deleted_for: [...deletedFor, user.email]
        });
      }
    }

    // Clear selection if this was the selected conversation
    if (selectedConversation === otherUserEmail) {
      setSelectedConversation(null);
    }

    // Refresh messages
    queryClient.invalidateQueries({ queryKey: ['allMessages'] });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  const otherProfile = selectedConversation ? profiles.find((p) =>
    p.user_email === selectedConversation
  ) : null;

  return (
    <div className="h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
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
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid md:grid-cols-[380px,1fr] h-full bg-white shadow-xl overflow-hidden">
            {/* Chat List - Hidden on mobile when chat is selected */}
            <div className={`
              border-r border-slate-200 
              ${selectedConversation ? 'hidden md:block' : 'block'}
              h-full overflow-hidden
            `}>
              <ChatList
                conversations={conversations}
                profiles={profiles}
                selectedUserEmail={selectedConversation}
                onSelectConversation={setSelectedConversation}
                currentUserEmail={user.email}
                onDeleteConversation={handleDeleteConversation} />

            </div>

            {/* Conversation - Hidden on mobile when no chat selected */}
            <div className={`
              ${selectedConversation ? 'block' : 'hidden md:flex md:items-center md:justify-center'}
              h-full
            `}>
              {selectedConversation && otherProfile ?
              <ChatConversation
                otherUserEmail={selectedConversation}
                otherProfile={otherProfile}
                messages={conversationMessages}
                currentUserEmail={user.email}
                onBack={() => setSelectedConversation(null)}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
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