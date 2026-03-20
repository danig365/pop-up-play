import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NavigationMenu({ unreadCount = 0 }) {
  return (
    <Link to={createPageUrl('Menu')}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full bg-slate-100 hover:bg-slate-200 relative"
      >
        <Menu className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}