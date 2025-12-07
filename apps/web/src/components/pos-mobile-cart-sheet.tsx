'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@smartduka/ui';
import { ShoppingCart, Trash2, User, X, Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react';

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface POSMobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  customerName: string;
  isCheckingOut: boolean;
  onCustomerNameChange: (name: string) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCheckout: () => void;
  onClearCart: () => void;
  /** Map of productId -> available stock for validation */
  productStocks?: Record<string, number>;
}

export function POSMobileCartSheet({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  totalDiscount,
  tax,
  total,
  customerName,
  isCheckingOut,
  onCustomerNameChange,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  onClearCart,
  productStocks = {},
}: POSMobileCartSheetProps) {
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Cart</h2>
              <p className="text-sm text-muted-foreground">{itemCount} items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCart}
                className="text-destructive hover:text-destructive"
              >
                Clear
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Your cart is empty</p>
              <p className="text-xs mt-1">Tap products to add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const maxStock = productStocks[item.productId] ?? Infinity;
                const isAtMaxStock = item.quantity >= maxStock;
                const availableMore = maxStock - item.quantity;
                
                return (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                >
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-primary font-semibold">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      {item.discount && item.discount > 0 && (
                        <span className="text-xs text-green-600">
                          -{formatCurrency(item.discount)}
                        </span>
                      )}
                      {/* Stock indicator */}
                      {maxStock !== Infinity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          availableMore <= 0 
                            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                            : availableMore <= 3
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {availableMore <= 0 ? 'Max' : `${availableMore} left`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (item.quantity > 1) {
                          onUpdateQuantity(item.productId, item.quantity - 1);
                        } else {
                          onRemoveItem(item.productId);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => !isAtMaxStock && onUpdateQuantity(item.productId, item.quantity + 1)}
                      disabled={isAtMaxStock}
                      className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                        isAtMaxStock 
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[70px]">
                    <p className="font-semibold text-sm">
                      {formatCurrency(item.unitPrice * item.quantity - (item.discount || 0))}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Customer Name Input */}
        {showCustomerInput && (
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomerInput(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Footer - Totals & Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
            {/* Customer toggle */}
            {!showCustomerInput && (
              <button
                onClick={() => setShowCustomerInput(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {customerName || 'Add customer name'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={() => {
                onCheckout();
                onClose();
              }}
              disabled={isCheckingOut || cartItems.length === 0}
              className="w-full h-14 text-lg font-semibold gap-2"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5" />
              {isCheckingOut ? 'Processing...' : `Pay ${formatCurrency(total)}`}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
