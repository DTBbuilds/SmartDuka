'use client';

import React from 'react';
import { Button } from '@smartduka/ui';
import { Pause, X, Percent, Plus, ShoppingCart, Receipt, QrCode } from 'lucide-react';

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
  formatCurrency = (v) => `Ksh ${v.toLocaleString()}`,
}: POSCheckoutBarProps) {
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
              onClick={onHoldSale}
              disabled={cartItemsCount === 0}
              className="gap-1.5 h-9"
              title="Hold current sale"
              aria-label="Hold current sale"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Hold</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onClearCart}
              disabled={cartItemsCount === 0}
              className="gap-1.5 h-9"
              title="Clear cart"
              aria-label="Clear cart"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onApplyDiscount}
              disabled={cartItemsCount === 0}
              className="gap-1.5 h-9"
              title="Apply discount"
              aria-label="Apply discount"
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Discount</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenScanner}
              className="gap-1.5 h-9"
              title="Open barcode scanner"
              aria-label="Open barcode scanner"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Scanner</span>
            </Button>
          </div>

          {/* Right side - Main action buttons */}
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenReceiptsHistory}
              className="gap-1.5 h-9 relative"
              title="View receipts history"
              aria-label={`View receipts history, ${receiptsCount} receipts`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Receipts</span>
              {receiptsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                  {receiptsCount > 99 ? '99+' : receiptsCount}
                </span>
              )}
            </Button>

            <Button
              size="lg"
              onClick={onCheckout}
              disabled={isCheckingOut || cartItemsCount === 0}
              className="gap-2 px-6 h-11"
              title="Complete checkout (Ctrl+Enter)"
              aria-label={`Checkout ${cartItemsCount} items for ${formatCurrency(cartTotal)}`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{isCheckingOut ? 'Processing...' : `Checkout`}</span>
              {cartItemsCount > 0 && !isCheckingOut && (
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Floating action buttons - cleaner, minimal */}
      <div className="lg:hidden fixed bottom-4 right-4 left-4 z-40 flex items-center gap-2">
        {/* Scanner Button */}
        <button
          onClick={onOpenScanner}
          className="w-12 h-12 rounded-full bg-slate-800 dark:bg-slate-700 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title="Open scanner"
        >
          <QrCode className="h-5 w-5" />
        </button>

        {/* Receipts Button */}
        <button
          onClick={onOpenReceiptsHistory}
          className="w-12 h-12 rounded-full bg-slate-600 dark:bg-slate-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform relative"
          title="View receipts"
        >
          <Receipt className="h-5 w-5" />
          {receiptsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
              {receiptsCount > 9 ? '9+' : receiptsCount}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Main Checkout Button - Large, prominent */}
        {cartItemsCount > 0 && (
          <button
            onClick={onCheckout}
            disabled={isCheckingOut}
            className={`h-14 px-6 rounded-full shadow-xl flex items-center gap-3 active:scale-95 transition-all ${
              isCheckingOut 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90'
            } text-primary-foreground`}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-white text-primary rounded-full">
                {cartItemsCount}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs opacity-80">
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </span>
              <span className="font-bold text-sm">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </button>
        )}
      </div>
    </>
  );
}
