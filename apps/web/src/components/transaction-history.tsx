'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@smartduka/ui';
import { History, TrendingUp } from 'lucide-react';

export interface Transaction {
  id: string;
  timestamp: Date;
  amount: number;
  itemCount: number;
  paymentMethod: string;
  customerName?: string;
  status: 'completed' | 'pending' | 'failed';
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  maxItems?: number;
}

export function TransactionHistory({
  transactions,
  maxItems = 5,
}: TransactionHistoryProps) {
  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
      default:
        return 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    }
  };

  const recentTransactions = transactions.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Transactions
          </CardTitle>
          {transactions.length > 0 && (
            <Badge variant="outline">
              {transactions.length} today
            </Badge>
          )}
        </div>
        <CardDescription>Latest sales from this session</CardDescription>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-md border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {transaction.customerName || 'Walk-in'}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(transaction.status)}`}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{transaction.itemCount} items</span>
                      <span>•</span>
                      <span>{transaction.paymentMethod}</span>
                      <span>•</span>
                      <span>{formatTime(transaction.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length > maxItems && (
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              +{transactions.length - maxItems} more transaction(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
