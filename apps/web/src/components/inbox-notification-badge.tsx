'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAdminUnreadCount, getSuperAdminUnreadCount } from '@/lib/messaging-api';
import { Badge } from '@smartduka/ui';

interface InboxNotificationBadgeProps {
  className?: string;
}

export function InboxNotificationBadge({ className }: InboxNotificationBadgeProps) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !user) return;

    try {
      if (user.role === 'admin') {
        const data = await getAdminUnreadCount(token);
        setUnreadCount(data.unreadCount);
      } else if (user.role === 'super_admin') {
        const data = await getSuperAdminUnreadCount(token);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [token, user]);

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  if (unreadCount === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className={`h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}

// Hook for getting unread count
export function useInboxUnreadCount() {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !user) {
      setLoading(false);
      return;
    }

    try {
      if (user.role === 'admin') {
        const data = await getAdminUnreadCount(token);
        setUnreadCount(data.unreadCount);
      } else if (user.role === 'super_admin') {
        const data = await getSuperAdminUnreadCount(token);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
