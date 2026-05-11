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

      {/* Mobile: Floating action buttons - cleaner, minimal */}
      <div className="lg:hidden fixed bottom-4 right-4 left-4 z-40 flex items-center gap-2">
        {/* Scanner Button - Enhanced with ripple effect */}
        <button
          onClick={() => handleButtonPress('mobile-scanner', onOpenScanner)}
          className={cn(
            "w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg flex items-center justify-center transition-all duration-200",
            "hover:scale-110 hover:shadow-xl active:scale-95",
            pressedButton === 'mobile-scanner' && "scale-90"
          )}
          title="Open scanner"
        >
          <ScanLine className="h-6 w-6" />
        </button>

        {/* Receipts Button */}
        <button
          onClick={() => handleButtonPress('mobile-receipts', onOpenReceiptsHistory)}
          className={cn(
            "w-14 h-14 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg flex items-center justify-center transition-all duration-200 relative",
            "hover:scale-110 hover:shadow-xl active:scale-95",
            pressedButton === 'mobile-receipts' && "scale-90"
          )}
          title="View receipts"
        >
          <History className="h-6 w-6" />
          {receiptsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full animate-bounce">
              {receiptsCount > 9 ? '9+' : receiptsCount}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Main Checkout Button - Large, prominent with animation */}
        {cartItemsCount > 0 && (
          <button
            onClick={() => handleButtonPress('mobile-checkout', onCheckout)}
            disabled={isCheckingOut}
            className={cn(
              "h-16 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300",
              "hover:scale-105 hover:shadow-primary/25",
              isCheckingOut 
                ? 'bg-slate-400 cursor-not-allowed scale-95' 
                : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary',
              pressedButton === 'mobile-checkout' && "scale-90",
              "text-primary-foreground"
            )}
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-white text-primary rounded-full shadow-sm">
                {cartItemsCount}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs opacity-90 font-medium">
                {isCheckingOut ? 'Processing...' : 'Tap to Pay'}
              </span>
              <span className="font-bold text-lg">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </button>
        )}
      </div>
    </>
  );
}
