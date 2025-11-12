'use client';

import React from 'react';
import { Button } from '@smartduka/ui';
import { Pause, X, Percent, Plus, ShoppingCart, Receipt } from 'lucide-react';

interface POSCheckoutBarProps {
  cartItemsCount: number;
  isCheckingOut: boolean;
  onHoldSale: () => void;
  onClearCart: () => void;
  onApplyDiscount: () => void;
  onAddManualItem: () => void;
  onOpenScanner: () => void;
  onCheckout: () => void;
  onOpenReceipt: () => void;
}

export function POSCheckoutBar({
  cartItemsCount,
  isCheckingOut,
  onHoldSale,
  onClearCart,
  onApplyDiscount,
  onAddManualItem,
  onOpenScanner,
  onCheckout,
  onOpenReceipt,
}: POSCheckoutBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40">
      <div className="max-w-full px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
        {/* Left side - Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={onHoldSale}
            disabled={cartItemsCount === 0}
            className="gap-2"
            title="Hold current sale (Ctrl+H)"
          >
            <Pause className="h-4 w-4" />
            <span className="hidden sm:inline">Hold Sale</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClearCart}
            disabled={cartItemsCount === 0}
            className="gap-2"
            title="Clear cart (Ctrl+C)"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onApplyDiscount}
            disabled={cartItemsCount === 0}
            className="gap-2"
            title="Apply discount (Ctrl+D)"
          >
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Discount</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onAddManualItem}
            className="gap-2"
            title="Add manual item"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Manual Item</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenScanner}
            className="gap-2"
            title="Open scanner (Ctrl+S)"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Scanner</span>
          </Button>
        </div>

        {/* Right side - Main action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReceipt}
            className="gap-2"
            title="View receipt"
          >
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Receipt</span>
          </Button>

          <Button
            size="lg"
            onClick={onCheckout}
            disabled={isCheckingOut || cartItemsCount === 0}
            className="gap-2 px-6"
            title="Complete checkout (Ctrl+Enter)"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{isCheckingOut ? 'Processing…' : 'Checkout'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
