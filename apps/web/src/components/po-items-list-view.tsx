'use client';

import { Input } from '@smartduka/ui';
import { AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';

export interface POItem {
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
}

interface POItemsListViewProps {
  items: POItem[];
  onUpdateReceivedQuantity?: (index: number, quantity: number) => void;
  isEditable?: boolean;
  maxHeight?: string;
}

export function POItemsListView({
  items,
  onUpdateReceivedQuantity,
  isEditable = false,
  maxHeight = 'max-h-96',
}: POItemsListViewProps) {
  const getItemStatus = (item: POItem) => {
    if (item.receivedQuantity === item.orderedQuantity) {
      return { type: 'complete', label: 'Complete', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' };
    } else if (item.receivedQuantity < item.orderedQuantity) {
      return { type: 'shortage', label: 'Shortage', icon: TrendingDown, color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { type: 'excess', label: 'Excess', icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalOrdered = items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalCost = items.reduce((sum, item) => sum + item.receivedQuantity * item.unitCost, 0);

  return (
    <div className="space-y-3">
      {/* Scrollable Items List */}
      <div className={`${maxHeight} overflow-y-auto border rounded-lg bg-slate-50 dark:bg-slate-950/50`}>
        <div className="space-y-0">
          {items.map((item, index) => {
            const status = getItemStatus(item);
            const StatusIcon = status.icon;
            const shortageAmount = item.orderedQuantity - item.receivedQuantity;

            return (
              <div
                key={index}
                className="border-b last:border-b-0 p-3 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                    <p className="text-xs text-muted-foreground">Product ID: {item.productId}</p>
                  </div>
                  <div className={`flex items-center gap-1 flex-shrink-0 ${status.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-xs font-medium">{status.label}</span>
                  </div>
                </div>

                {/* Item Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {/* Ordered Quantity */}
                  <div className="bg-white dark:bg-slate-900 rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">Ordered</p>
                    <p className="font-semibold text-sm">{item.orderedQuantity} units</p>
                  </div>

                  {/* Unit Cost */}
                  <div className="bg-white dark:bg-slate-900 rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">Unit Cost</p>
                    <p className="font-semibold text-sm">{formatCurrency(item.unitCost)}</p>
                  </div>
                </div>

                {/* Received Quantity Input */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Received Quantity</label>
                  {isEditable ? (
                    <Input
                      type="number"
                      min="0"
                      max={item.orderedQuantity}
                      value={item.receivedQuantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        onUpdateReceivedQuantity?.(index, value);
                      }}
                      className={`h-9 text-sm ${
                        item.receivedQuantity !== item.orderedQuantity
                          ? 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
                          : 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      }`}
                    />
                  ) : (
                    <div className="h-9 flex items-center px-3 bg-white dark:bg-slate-900 rounded border border-input text-sm font-medium">
                      {item.receivedQuantity} units
                    </div>
                  )}
                </div>

                {/* Shortage/Excess Alert */}
                {item.receivedQuantity !== item.orderedQuantity && (
                  <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${
                    item.receivedQuantity < item.orderedQuantity
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {item.receivedQuantity < item.orderedQuantity
                        ? `Shortage: ${shortageAmount} unit${shortageAmount !== 1 ? 's' : ''}`
                        : `Excess: ${Math.abs(shortageAmount)} unit${Math.abs(shortageAmount) !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}

                {/* Item Total */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Item Total:</span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(item.receivedQuantity * item.unitCost)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-4 space-y-2 border">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Ordered</p>
            <p className="font-semibold text-lg">{totalOrdered}</p>
            <p className="text-xs text-muted-foreground">units</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Received</p>
            <p className={`font-semibold text-lg ${
              totalReceived === totalOrdered
                ? 'text-green-600 dark:text-green-400'
                : totalReceived < totalOrdered
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {totalReceived}
            </p>
            <p className="text-xs text-muted-foreground">units</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="font-semibold text-lg">{formatCurrency(totalCost)}</p>
          </div>
        </div>

        {/* Completion Status */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completion Status</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    totalReceived === totalOrdered
                      ? 'bg-green-500'
                      : totalReceived < totalOrdered
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  }`}
                  style={{
                    width: `${totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium w-12 text-right">
                {totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
