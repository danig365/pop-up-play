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
        className="rounded-full bg-slate-100 hover:bg-slate-200"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </Button>
    </Link>
  );
}