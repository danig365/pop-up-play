import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function BlockButton({ targetUserEmail, currentUserEmail, variant = "outline" }) {
  const queryClient = useQueryClient();

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) return [];
      return base44.entities.BlockedUser.filter({ blocker_email: currentUserEmail });
    },
    enabled: !!currentUserEmail
  });

  const isBlocked = blockedUsers.some(b => b.blocked_email === targetUserEmail);

  const blockMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.BlockedUser.create({
        blocker_email: currentUserEmail,
        blocked_email: targetUserEmail
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
      toast.success('User blocked');
    },
    onError: () => {
      toast.error('Failed to block user');
    }
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      const blockRecord = blockedUsers.find(b => b.blocked_email === targetUserEmail);
      if (blockRecord) {
        await base44.entities.BlockedUser.delete(blockRecord.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
      toast.success('User unblocked');
    },
    onError: () => {
      toast.error('Failed to unblock user');
    }
  });

  const handleToggleBlock = () => {
    if (isBlocked) {
      unblockMutation.mutate();
    } else {
      blockMutation.mutate();
    }
  };

  const isPending = blockMutation.isPending || unblockMutation.isPending;

  if (isBlocked) {
    return (
      <Button
        onClick={handleToggleBlock}
        disabled={isPending}
        variant={variant}
        size="sm"
        className="gap-2"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Ban className="w-4 h-4" />
        )}
        Unblock
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2">
          <Ban className="w-4 h-4" />
          Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block this user?</AlertDialogTitle>
          <AlertDialogDescription>
            You won't see this user's profile, and they won't be able to contact you or see when you're active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggleBlock} disabled={isPending} className="text-black">
            {isPending ? 'Blocking...' : 'Block User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}