'use client';

import { useState, useEffect } from 'react';
import { Button, Badge } from '@smartduka/ui';
import { X, TrendingUp, TrendingDown, Package, Calendar, User, FileText, RefreshCw } from 'lucide-react';
import { CartLoader } from '@/components/ui/cart-loader';
import { config } from '@/lib/config';

interface StockAdjustment {
  _id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  description?: string;
  reference?: string;
  previousStock?: number;
  newStock?: number;
  adjustedBy?: string;
  adjustedByName?: string;
  createdAt: string;
}

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  token: string;
}

const REASON_LABELS: Record<string, string> = {
  recount: 'Physical Recount',
  correction: 'Correction/Error Fix',
  damage: 'Damaged Goods',
  loss: 'Lost/Missing',
  theft: 'Theft/Shrinkage',
  expired: 'Expired Products',
  return: 'Customer Return',
  received: 'Stock Received',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  sale: 'Sale',
  other: 'Other',
};

const REASON_COLORS: Record<string, string> = {
  damage: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  loss: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  theft: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  recount: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  correction: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  return: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  transfer_in: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transfer_out: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  sale: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function StockHistoryModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentStock,
  token,
}: StockHistoryModalProps) {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory();
    }
  }, [isOpen, productId]);

  const fetchHistory = async () => {
    if (!token || !productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.apiUrl}/stock/adjustments/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stock history');
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock history');
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate summary stats
  const totalAdded = adjustments.filter(a => a.delta > 0).reduce((sum, a) => sum + a.delta, 0);
  const totalRemoved = adjustments.filter(a => a.delta < 0).reduce((sum, a) => sum + Math.abs(a.delta), 0);
  const netChange = totalAdded - totalRemoved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Stock History</h2>
              <p className="text-sm text-muted-foreground truncate max-w-[300px]">{productName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-border bg-muted/10">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current Stock</p>
            <p className="text-xl font-bold text-foreground">{currentStock}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Added</p>
            <p className="text-xl font-bold text-green-600">+{totalAdded}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Removed</p>
            <p className="text-xl font-bold text-red-600">-{totalRemoved}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net Change</p>
            <p className={`text-xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? '+' : ''}{netChange}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <CartLoader size="md" title="Loading stock history..." />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchHistory}>
                Try Again
              </Button>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-center">
                No stock adjustments recorded for this product yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Stock changes from sales and manual adjustments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div
                  key={adj._id}
                  className="flex items-start gap-3 p-3 border border-border rounded-xl hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${adj.delta > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {adj.delta > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${adj.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.delta > 0 ? '+' : ''}{adj.delta}
                      </span>
                      <Badge className={`text-xs ${REASON_COLORS[adj.reason] || 'bg-gray-100 text-gray-700'}`}>
                        {REASON_LABELS[adj.reason] || adj.reason}
                      </Badge>
                      {adj.reference && (
                        <span className="text-xs text-muted-foreground font-mono">#{adj.reference}</span>
                      )}
                    </div>
                    
                    {adj.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{adj.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(adj.createdAt).toLocaleDateString()} {new Date(adj.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {adj.previousStock !== undefined && adj.newStock !== undefined && (
                        <span className="text-xs">
                          {adj.previousStock} → {adj.newStock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''} recorded
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
