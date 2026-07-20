import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/apiUrl';

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useNotifications(userEmail) {
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationUnreadCount', userEmail],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({ count: 0 }));
      return data.count || 0;
    },
    enabled: !!userEmail,
    refetchInterval: 12000,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notificationsList', userEmail],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/notifications?limit=20`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userEmail && isPanelOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount', userEmail] });
    queryClient.invalidateQueries({ queryKey: ['notificationsList', userEmail] });
  };

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    },
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    },
    onSuccess: invalidate,
  });

  return {
    unreadCount,
    notifications,
    isLoading,
    isPanelOpen,
    setIsPanelOpen,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}

export default useNotifications;
