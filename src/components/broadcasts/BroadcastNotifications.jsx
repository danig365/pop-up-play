import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function BroadcastNotifications({ userEmail }) {
  const { data: unreadBroadcasts = [] } = useQuery({
    queryKey: ['unreadBroadcasts', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const broadcasts = await base44.entities.UserBroadcast.filter({ 
        user_email: userEmail,
        read: false 
      });
      return broadcasts;
    },
    enabled: !!userEmail,
    refetchInterval: 10000
  });

  useEffect(() => {
    const checkNewBroadcasts = async () => {
      if (unreadBroadcasts.length === 0) return;

      for (const userBroadcast of unreadBroadcasts) {
        try {
          const broadcasts = await base44.entities.BroadcastMessage.filter({ 
            id: userBroadcast.broadcast_id 
          });
          
          if (broadcasts.length > 0) {
            const broadcast = broadcasts[0];
            toast.info(
              broadcast.subject || 'New message from admin',
              {
                description: broadcast.message,
                duration: 10000
              }
            );

            // Mark as read
            await base44.entities.UserBroadcast.update(userBroadcast.id, { read: true });
          }
        } catch (error) {
          console.error('Error displaying broadcast:', error);
        }
      }
    };

    checkNewBroadcasts();
  }, [unreadBroadcasts]);

  return null;
}