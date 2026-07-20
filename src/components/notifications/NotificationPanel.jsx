import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Film, UserPlus, CalendarDays, Eye, Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICON = {
  reel_posted: Film,
  new_signup: UserPlus,
  new_event: CalendarDays,
  profile_view: Eye,
};

export default function NotificationPanel({ notifications, isLoading, onMarkRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate();

  const handleRowClick = (notification) => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (onClose) onClose();
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
        <button
          onClick={() => onMarkAllRead()}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
        >
          Mark all read
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bell className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = TYPE_ICON[notification.type] || Bell;
            return (
              <button
                key={notification.id}
                onClick={() => handleRowClick(notification)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors',
                  !notification.is_read && 'bg-violet-50'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!notification.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-slate-800 truncate">{notification.title}</p>
                  </div>
                  {notification.message && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
