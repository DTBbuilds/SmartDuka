'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@smartduka/ui';
import { Clock, User, AlertCircle } from 'lucide-react';

interface ShiftInfoCardProps {
  cashierName: string;
  cashierId: string;
  shiftStartTime?: Date;
  totalSales?: number;
  transactionCount?: number;
  isOnline?: boolean;
}

export function ShiftInfoCard({
  cashierName,
  cashierId,
  shiftStartTime,
  totalSales = 0,
  transactionCount = 0,
  isOnline = true,
}: ShiftInfoCardProps) {
  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getShiftDuration = () => {
    if (!shiftStartTime) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - shiftStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <User className="h-3 w-3" />
            Shift
          </CardTitle>
          <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs py-0">
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 py-2">
        {/* Cashier Info - Compact */}
        <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-2">
          <p className="text-xs text-muted-foreground">Cashier</p>
          <p className="font-semibold text-xs">{cashierName}</p>
        </div>

        {/* Shift Duration - Compact */}
        {shiftStartTime && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Duration: {getShiftDuration()}
              </p>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {formatTime(shiftStartTime)}
            </p>
          </div>
        )}

        {/* Sales Summary - Compact Grid */}
        <div className="grid grid-cols-2 gap-1">
          <div className="rounded-md bg-green-50 dark:bg-green-950 p-2">
            <p className="text-xs text-green-700 dark:text-green-300">Sales</p>
            <p className="font-semibold text-xs text-green-900 dark:text-green-100">
              {formatCurrency(totalSales)}
            </p>
          </div>
          <div className="rounded-md bg-purple-50 dark:bg-purple-950 p-2">
            <p className="text-xs text-purple-700 dark:text-purple-300">Txns</p>
            <p className="font-semibold text-xs text-purple-900 dark:text-purple-100">
              {transactionCount}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
