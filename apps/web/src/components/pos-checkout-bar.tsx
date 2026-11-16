'use client';

import React, { useState } from 'react';
import { Button } from '@smartduka/ui';
import { Pause, X, Percent, Plus, ShoppingCart, Receipt, QrCode, Trash2, Tag, ScanLine, History } from 'lucide-react';
import { cn } from '@smartduka/ui';

interface POSCheckoutBarProps {
  cartItemsCount: number;
  cartTotal?: number;
  isCheckingOut: boolean;
  receiptsCount?: number;
  onHoldSale: () => void;
  onClearCart: () => void;
  onApplyDiscount: () => void;
  onAddManualItem: () => void;
  onOpenScanner: () => void;
  onCheckout: () => void;
  onOpenReceiptsHistory: () => void;
  formatCurrency?: (amount: number) => string;
}

export function POSCheckoutBar({
  cartItemsCount,
  cartTotal = 0,
  isCheckingOut,
  receiptsCount = 0,
  onHoldSale,
  onClearCart,
  onApplyDiscount,
  onAddManualItem,
  onOpenScanner,
  onCheckout,
  onOpenReceiptsHistory,
  formatCurrency = (v) => `KSh ${v.toLocaleString()}`,
}: POSCheckoutBarProps) {
  const [pressedButton, setPressedButton] = useState<string | null>(null);

  const handleButtonPress = (buttonId: string, callback: () => void) => {
    setPressedButton(buttonId);
    setTimeout(() => setPressedButton(null), 150);
    callback();
  };

  return (
    <>
      {/* Desktop: Full bottom bar */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40">
        <div className="max-w-full px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          {/* Left side - Action buttons */}
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleButtonPress('hold', onHoldSale)}
              disabled={cartItemsCount === 0}
              className={cn(
                "gap-1.5 h-9 transition-all duration-150 hover:scale-105 active:scale-95",
                pressedButton === 'hold' && "scale-95 bg-yellow-100"
              )}
              title="Hold current sale (F3)"
              aria-label="Hold current sale"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Hold</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-background rounded border">F3</kbd>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleButtonPress('clear', onClearCart)}
              disabled={cartItemsCount === 0}
              className={cn(
                "gap-1.5 h-9 transition-all duration-150 hover:scale-105 active:scale-95 hover:bg-red-50 hover:text-red-600 hover:border-red-200",
                pressedButton === 'clear' && "scale-95 bg-red-100"
              )}
              title="Clear cart (F4)"
              aria-label="Clear cart"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-background rounded border">F4</kbd>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleButtonPress('discount', onApplyDiscount)}
              disabled={cartItemsCount === 0}
              className={cn(
                "gap-1.5 h-9 transition-all duration-150 hover:scale-105 active:scale-95 hover:bg-green-50 hover:text-green-600 hover:border-green-200",
                pressedButton === 'discount' && "scale-95 bg-green-100"
              )}
              title="Apply discount (F7)"
              aria-label="Apply discount"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Discount</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-background rounded border">F7</kbd>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleButtonPress('scanner', onOpenScanner)}
              className={cn(
                "gap-1.5 h-9 transition-all duration-150 hover:scale-105 active:scale-95 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200",
                pressedButton === 'scanner' && "scale-95 bg-blue-100"
              )}
              title="Open barcode scanner (F5)"
              aria-label="Open barcode scanner"
            >
              <ScanLine className="h-3.5 w-3.5" />
              <span>Scan</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-background rounded border">F5</kbd>
            </Button>
          </div>

          {/* Right side - Main action buttons */}
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleButtonPress('receipts', onOpenReceiptsHistory)}
              className={cn(
                "gap-1.5 h-9 relative transition-all duration-150 hover:scale-105 active:scale-95",
                pressedButton === 'receipts' && "scale-95"
              )}
              title="View receipts history (F8)"
              aria-label={`View receipts history, ${receiptsCount} receipts`}
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-background rounded border">F8</kbd>
              {receiptsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full animate-in zoom-in">
                  {receiptsCount > 99 ? '99+' : receiptsCount}
                </span>
              )}
            </Button>

            <Button
              size="lg"
              onClick={() => handleButtonPress('checkout', onCheckout)}
              disabled={isCheckingOut || cartItemsCount === 0}
              className={cn(
                "gap-2 px-6 h-11 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl",
                pressedButton === 'checkout' && "scale-95"
              )}
              title="Complete checkout (F2)"
              aria-label={`Checkout ${cartItemsCount} items for ${formatCurrency(cartTotal)}`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{isCheckingOut ? 'Processing...' : `Checkout`}</span>
              {cartItemsCount > 0 && !isCheckingOut && (
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              )}
              <kbd className="hidden xl:inline-block ml-2 px-1.5 py-0.5 text-xs bg-primary-foreground/20 rounded">F2</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: fixed checkout summary only. Scanner and receipts live in the
          sticky POS header, so they no longer cover the product grid. */}
      {cartItemsCount > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => handleButtonPress('mobile-checkout', onCheckout)}
            disabled={isCheckingOut}
            aria-label={`Review cart: ${cartItemsCount} items totaling ${formatCurrency(cartTotal)}`}
            className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
              <ShoppingCart aria-hidden="true" className="h-5 w-5 shrink-0" />
              {isCheckingOut ? 'Processing…' : `Review cart · ${cartItemsCount} item${cartItemsCount === 1 ? '' : 's'}`}
            </span>
            <span className="shrink-0 text-base font-bold tabular-nums">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </>
  );
}
