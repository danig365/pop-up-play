import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell({ userEmail }) {
  const {
    unreadCount,
    notifications,
    isLoading,
    isPanelOpen,
    setIsPanelOpen,
    markRead,
    markAllRead,
    deleteAll,
  } = useNotifications(userEmail);

  return (
    <Popover open={isPanelOpen} onOpenChange={setIsPanelOpen}>
      <PopoverTrigger asChild>
        <div className="inline-flex flex-col items-center gap-0.5 cursor-pointer">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-slate-100 hover:bg-slate-200 relative"
          >
            <Bell className="w-5 h-5 text-violet-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
          <span className="text-[10px] font-medium leading-none text-violet-600">Alerts</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoading}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDeleteAll={deleteAll}
          onClose={() => setIsPanelOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
