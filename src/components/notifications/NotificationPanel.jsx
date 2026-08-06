import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Film, UserPlus, CalendarDays, Eye, Bell, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_AVATAR_TEMPLATE } from '@/lib/avatarTemplate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_ICON = {
  reel_posted: Film,
  new_signup: UserPlus,
  new_event: CalendarDays,
  profile_view: Eye,
};

export default function NotificationPanel({ notifications, isLoading, onMarkRead, onMarkAllRead, onDeleteAll, onClose }) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRowClick = (notification) => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (onClose) onClose();
    if (notification.link_url) {
      // The bell only lives in Home's header, so every notification click
      // originates from Home — pass this state so pages like Reels (whose
      // back button reads location.state.from) return there correctly.
      navigate(notification.link_url, { state: { from: 'Home' } });
    }
  };

  const handleConfirmDeleteAll = () => {
    onDeleteAll();
    setShowDeleteConfirm(false);
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
            const isSignup = notification.type === 'new_signup';
            const hasActor = !!notification.actor_email;
            const actorName = notification.actor_name || notification.actor_email?.split('@')[0] || 'Someone';

            return (
              <button
                key={notification.id}
                onClick={() => handleRowClick(notification)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors',
                  !notification.is_read && 'bg-violet-50'
                )}
              >
                {hasActor ? (
                  <img
                    src={notification.actor_avatar_url || DEFAULT_AVATAR_TEMPLATE}
                    alt={actorName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 border border-violet-100"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR_TEMPLATE; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {isSignup ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium text-slate-800 truncate">{actorName}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{notification.title}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium text-slate-800 truncate">{notification.title}</p>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      )}
                    </>
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

      {notifications.length > 0 && (
        <div className="flex-shrink-0 border-t border-slate-100 px-4 py-2.5">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete all notifications
          </button>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all of your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800"
            >
              Cancel
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
