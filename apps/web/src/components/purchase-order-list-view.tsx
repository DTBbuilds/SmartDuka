'use client';

import { Button } from '@smartduka/ui';
import { Eye, Truck, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrder {
  _id: string;
  purchaseNumber: string;
  supplierId: {
    _id: string;
    name: string;
  };
  items: PurchaseOrderItem[];
  totalCost: number;
  status: 'pending' | 'received' | 'cancelled';
  expectedDeliveryDate?: string;
  createdAt: string;
}

interface PurchaseOrderListViewProps {
  purchases: PurchaseOrder[];
  onStatusChange?: (id: string, status: string) => void;
}

export function PurchaseOrderListView({ purchases, onStatusChange }: PurchaseOrderListViewProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900';
      case 'received':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (purchases.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Truck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No purchase orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {purchases.map((po) => (
        <div
          key={po._id}
          className={`rounded-lg border p-3 transition-all hover:shadow-md ${getStatusColor(po.status)}`}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{po.purchaseNumber}</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(po.status)}`}>
                  {po.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{po.supplierId?.name || 'Unknown Supplier'}</p>
            </div>

            {/* Cost */}
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm">{formatCurrency(po.totalCost)}</p>
              <p className="text-xs text-muted-foreground">{po.items?.length || 0} items</p>
            </div>
          </div>

          {/* Details Row */}
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>📅 {formatDate(po.createdAt)}</span>
              {po.expectedDeliveryDate && (
                <span>🚚 {formatDate(po.expectedDeliveryDate)}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              {po.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => router.push(`/purchases/${po._id}/receive`)}
                  title="Receive order"
                >
                  <Truck className="h-3.5 w-3.5 mr-1" />
                  Receive
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => router.push(`/purchases/${po._id}`)}
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="More options"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Items Preview (first 2 items) */}
          {po.items && po.items.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
              {po.items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">{item.productName}</span>
                  <span className="flex-shrink-0 ml-2">
                    {item.quantity} × {formatCurrency(item.unitCost)}
                  </span>
                </div>
              ))}
              {po.items.length > 2 && (
                <p className="text-xs text-muted-foreground italic">+{po.items.length - 2} more items</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
