import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, MapPin, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ChatConversation({ 
  otherUserEmail,
  otherProfile, 
  messages, 
  currentUserEmail,
  onBack,
  onSendMessage,
  onDeleteMessage,
  isSending 
}) {
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Mark messages as read
    const unreadMessages = messages.filter(
      m => m.receiver_email === currentUserEmail && !m.read
    );
    
    unreadMessages.forEach(msg => {
      base44.entities.Message.update(msg.id, { read: true });
    });
  }, [messages, currentUserEmail]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    
    await onSendMessage(newMessage);
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSendMessage('📷 Sent an image', file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = format(new Date(msg.created_date), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
          </Button>

          <Link to={createPageUrl('Profile') + `?user=${otherUserEmail}&back=Chat&chatWith=${otherUserEmail}`}>
            <img
              src={otherProfile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
              alt={otherProfile.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-violet-100 cursor-pointer hover:border-violet-300 transition-colors"
            />
          </Link>
        
        <div className="flex-1">
          <h2 className="font-semibold text-slate-800">{otherProfile.display_name}</h2>
          {otherProfile.is_popped_up ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Active now
            </div>
          ) : (
            <p className="text-xs text-slate-500">Offline</p>
          )}
        </div>

        {otherProfile.current_city && (
          <div className="hidden sm:flex items-center gap-1 text-sm text-purple-600">
            <MapPin className="w-4 h-4" />
            {otherProfile.current_city}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-100 to-rose-100 flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Say hello!</h3>
            <p className="text-sm text-slate-500">Start your conversation with {otherProfile.display_name}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                    {format(new Date(date), 'MMMM d, yyyy')}
                  </span>
                </div>
                
                <AnimatePresence>
                  {msgs.map((message, index) => {
                    const isOwn = message.sender_email === currentUserEmail;
                    const showAvatar = index === 0 || msgs[index - 1].sender_email !== message.sender_email;
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-2 mb-2 group",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && showAvatar && (
                          <Link to={createPageUrl('Profile') + `?user=${otherUserEmail}&back=Chat&chatWith=${otherUserEmail}`}>
                            <img
                              src={otherProfile.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
                              alt={otherProfile.display_name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-300 transition-all"
                            />
                          </Link>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        
                        <div className={cn("max-w-[70%] flex gap-2 items-start", isOwn ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn("flex flex-col relative", isOwn && "items-end")}>
                            {message.attachment_url && (
                              <div className="relative group/media">
                                {message.attachment_url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                                  <video
                                    src={message.attachment_url}
                                    controls
                                    className="rounded-xl mb-1 max-w-full shadow-sm max-h-64"
                                  />
                                ) : (
                                  <img
                                    src={message.attachment_url}
                                    alt="Attachment"
                                    className="rounded-xl mb-1 max-w-full shadow-sm"
                                  />
                                )}
                                <div className={cn(
                                  "absolute top-2 opacity-0 group-hover/media:opacity-100 transition-opacity",
                                  isOwn ? "right-2" : "left-2"
                                )}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7 rounded-full shadow-lg bg-white/90 hover:bg-white"
                                      >
                                        <MoreVertical className="h-4 w-4 text-slate-600" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOwn ? "end" : "start"}>
                                      <DropdownMenuItem 
                                        onClick={() => onDeleteMessage(message.id, false)}
                                        className="text-orange-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete for me
                                      </DropdownMenuItem>
                                      {isOwn && (
                                        <DropdownMenuItem 
                                          onClick={() => onDeleteMessage(message.id, true)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete for everyone
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            )}
                            
                            <div
                              className={cn(
                                "px-4 py-2 rounded-2xl shadow-sm",
                                isOwn
                                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                                  : "bg-white text-slate-800 border border-slate-200"
                              )}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                            
                            <span className="text-xs text-slate-400 mt-1 px-2">
                              {format(new Date(message.created_date), 'h:mm a')}
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                              >
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? "end" : "start"}>
                              <DropdownMenuItem 
                                onClick={() => onDeleteMessage(message.id, false)}
                                className="text-orange-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete for me
                              </DropdownMenuItem>
                              {isOwn && (
                                <DropdownMenuItem 
                                  onClick={() => onDeleteMessage(message.id, true)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete for everyone
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-end gap-2">
          <label className="flex-shrink-0 cursor-pointer">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className={cn(
              "w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors",
              uploading && "opacity-50 cursor-not-allowed"
            )}>
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-600" />
              )}
            </div>
          </label>
          
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-slate-200"
            disabled={isSending}
          />
          
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 flex-shrink-0"
            size="icon"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}