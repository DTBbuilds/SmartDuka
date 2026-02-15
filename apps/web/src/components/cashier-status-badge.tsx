'use client';

import { Badge } from '@smartduka/ui';

interface CashierStatusBadgeProps {
  status: 'online' | 'idle' | 'offline';
  lastActivity?: Date;
}

export function CashierStatusBadge({ status, lastActivity }: CashierStatusBadgeProps) {
  const statusConfig = {
    online: {
      label: 'Online',
      className: 'bg-green-100 text-green-800 border-green-300',
      dot: '🟢',
    },
    idle: {
      label: 'Idle',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dot: '🟡',
    },
    offline: {
      label: 'Offline',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      dot: '🔴',
    },
  };

  const config = statusConfig[status];

  const formatLastActivity = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return 'yesterday';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config.className}>
        <span className="mr-1">{config.dot}</span>
        {config.label}
      </Badge>
      {lastActivity && (
        <span className="text-xs text-muted-foreground">
          {formatLastActivity(lastActivity)}
        </span>
      )}
    </div>
  );
}
