'use client';

import React, { useState } from 'react';
import { Button, Input, Badge, Separator } from '@smartduka/ui';
import { ShoppingCart, Trash2, User } from 'lucide-react';

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  categoryId?: string;
}

interface POSCartCompactProps {
  cartItems: CartItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  customerName: string;
  isCheckingOut: boolean;
  checkoutMessage: string | null;
  checkoutError: string | null;
  shopSettings?: {
    tax?: {
      enabled: boolean;
      rate: number;
      name: string;
    };
  };
  onCustomerNameChange: (name: string) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export function POSCartCompact({
  cartItems,
  subtotal,
  totalDiscount,
  tax,
  total,
  customerName,
  isCheckingOut,
  checkoutMessage,
  checkoutError,
  shopSettings,
  onCustomerNameChange,
  onRemoveItem,
  onCheckout,
}: POSCartCompactProps) {
  const taxRate = shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0;
  const taxName = shopSettings?.tax?.name || 'VAT';
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  return (
    <div className="w-full flex flex-col overflow-hidden flex-shrink-0">
      {/* Cart Summary Header - Compact */}
      <div className="flex-shrink-0 bg-background border-b p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ShoppingCart className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Cart</p>
              <p className="text-xs text-muted-foreground">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
            {formatCurrency(subtotal)}
          </Badge>
        </div>
      </div>

      {/* Messages - Compact */}
      {(checkoutMessage || checkoutError) && (
        <div className="flex-shrink-0 px-2 py-1 space-y-1">
          {checkoutMessage && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-1 text-xs text-green-700 dark:text-green-300">
              {checkoutMessage}
            </div>
          )}
          {checkoutError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-1 text-xs text-red-600 dark:text-red-400">
              {checkoutError}
            </div>
          )}
        </div>
      )}

      {/* Cart Items - Fixed Height, Scrollable */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 h-[120px] overflow-y-auto border-b px-2 py-1">
          <div className="space-y-0.5">
            {cartItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between text-xs p-1 hover:bg-slate-50 dark:hover:bg-slate-900 rounded group"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-muted-foreground">{item.quantity}x @ {formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="font-semibold whitespace-nowrap">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveItem(item.productId)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {cartItems.length === 0 && (
        <div className="flex-shrink-0 h-[80px] flex items-center justify-center border-b text-muted-foreground">
          <p className="text-xs">No items in cart</p>
        </div>
      )}

      {/* Totals - Compact */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 border-b px-2 py-1.5 space-y-0">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}

          {shopSettings?.tax?.enabled && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{taxName} ({(taxRate * 100).toFixed(1)}%)</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
          )}

          <Separator className="my-0.5" />
          <div className="flex justify-between text-xs font-bold bg-primary/5 p-1 rounded">
            <span>Total Due</span>
            <span className="text-primary text-sm">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {/* Customer Info Button - Only when items exist */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 px-2 py-1 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomerInfo(!showCustomerInfo)}
            className="w-full h-7 text-xs"
          >
            <User className="h-3 w-3 mr-1" />
            {customerName ? `Customer: ${customerName}` : 'Add Customer Info'}
          </Button>

          {/* Customer Info Input - Conditional */}
          {showCustomerInfo && (
            <div className="mt-1 space-y-1">
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                className="text-xs h-7"
              />
            </div>
          )}
        </div>
      )}

      {/* Checkout Button - Always at bottom */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 px-2 py-2">
          <Button
            className="w-full h-10 text-sm font-semibold"
            disabled={isCheckingOut}
            onClick={onCheckout}
            aria-label="Complete checkout"
          >
            {isCheckingOut ? 'Processing…' : `Checkout • ${formatCurrency(total)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
