import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Circle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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

export default function ChatList({ 
  conversations, 
  profiles, 
  selectedUserEmail,
  onSelectConversation,
  currentUserEmail,
  onDeleteConversation
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const getLastMessage = (conversation) => {
    if (!conversation.messages.length) return null;
    return conversation.messages.reduce((latest, msg) => 
      new Date(msg.created_date) > new Date(latest.created_date) ? msg : latest
    );
  };

  const getUnreadCount = (conversation) => {
    return conversation.messages.filter(m => 
      m.sender_email === conversation.otherUserEmail && 
      m.receiver_email === currentUserEmail &&
      !m.read
    ).length;
  };

  const getOtherUserProfile = (conversation) => {
    return profiles.find(p => p.user_email === conversation.otherUserEmail);
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const lastMsgA = getLastMessage(a);
    const lastMsgB = getLastMessage(b);
    if (!lastMsgA) return 1;
    if (!lastMsgB) return -1;
    return new Date(lastMsgB.created_date) - new Date(lastMsgA.created_date);
  });

  const handleDeleteClick = (e, conversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete && onDeleteConversation) {
      onDeleteConversation(conversationToDelete.otherUserEmail);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mb-4">
          <MessageCircle className="w-10 h-10 text-violet-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No conversations yet</h3>
        <p className="text-sm text-slate-500">Start chatting with people from the map!</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {sortedConversations.map((conversation) => {
        const otherProfile = getOtherUserProfile(conversation);
        const lastMessage = getLastMessage(conversation);
        const unreadCount = getUnreadCount(conversation);
        
        if (!otherProfile) return null;

        return (
          <motion.div
            key={conversation.otherUserEmail}
            className="relative group"
            whileHover={{ x: 4 }}
          >
            <button
              onClick={() => onSelectConversation(conversation.otherUserEmail)}
              className={cn(
                "w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100",
                selectedUserEmail === conversation.otherUserEmail && "bg-violet-50 hover:bg-violet-50"
              )}
            >
              <div className="relative">
                <img
                  src={otherProfile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
                  alt={otherProfile.display_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
                {otherProfile.is_popped_up && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {otherProfile.display_name}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                      {format(new Date(lastMessage.created_date), 'MMM d')}
                    </span>
                  )}
                </div>
                
                {lastMessage ? (
                  <p className={cn(
                    "text-sm truncate",
                    unreadCount > 0 ? "text-slate-800 font-medium" : "text-slate-500"
                  )}>
                    {lastMessage.sender_email === currentUserEmail && "You: "}
                    {lastMessage.content}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Start a conversation</p>
                )}
              </div>

              {unreadCount > 0 && (
                <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{unreadCount}</span>
                </div>
              )}
            </button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDeleteClick(e, conversation)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation for you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}