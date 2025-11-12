'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Badge, Separator } from '@smartduka/ui';
import { ShoppingCart, Trash2, Check, User } from 'lucide-react';

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

interface PaymentOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface POSCartCompactProps {
  cartItems: CartItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  selectedPaymentMethod: string | null;
  amountTendered: number;
  customerName: string;
  isCheckingOut: boolean;
  checkoutMessage: string | null;
  checkoutError: string | null;
  paymentOptions: PaymentOption[];
  shopSettings?: {
    tax?: {
      enabled: boolean;
      rate: number;
      name: string;
    };
  };
  onPaymentMethodSelect: (methodId: string) => void;
  onAmountTenderedChange: (amount: number) => void;
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
  selectedPaymentMethod,
  amountTendered,
  customerName,
  isCheckingOut,
  checkoutMessage,
  checkoutError,
  paymentOptions,
  shopSettings,
  onPaymentMethodSelect,
  onAmountTenderedChange,
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

      {/* Payment Methods - 2x2 Grid */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 border-b px-2 py-1">
          {!selectedPaymentMethod && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-1 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 mb-1">
              Select payment method
            </div>
          )}

          <div className="grid gap-1 grid-cols-2">
            {paymentOptions.map((option) => (
              <Button
                key={option.id}
                onClick={() => onPaymentMethodSelect(option.id)}
                variant={selectedPaymentMethod === option.id ? 'default' : 'outline'}
                size="sm"
                className={`
                  h-11 flex flex-col items-center justify-center gap-0
                  transition-all duration-200 relative text-xs
                  ${
                    selectedPaymentMethod === option.id
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:border-primary'
                  }
                `}
                aria-pressed={selectedPaymentMethod === option.id}
                aria-label={`Pay with ${option.label}`}
              >
                <option.icon className="h-4 w-4" />
                <span className="text-xs font-semibold leading-tight">{option.label}</span>
                {selectedPaymentMethod === option.id && (
                  <Check className="h-3 w-3 absolute top-0.5 right-0.5" />
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Cash Payment Input - Conditional */}
      {cartItems.length > 0 && selectedPaymentMethod === 'cash' && (
        <div className="flex-shrink-0 border-b px-2 py-1 space-y-0.5 bg-blue-50 dark:bg-blue-950">
          <label className="text-xs font-medium text-blue-900 dark:text-blue-100">
            Amount Tendered
          </label>
          <Input
            type="number"
            placeholder="Amount"
            value={amountTendered || ''}
            onChange={(e) => onAmountTenderedChange(Number(e.target.value) || 0)}
            className="text-sm font-semibold h-7"
            min="0"
            step="100"
          />
          {amountTendered > 0 && (
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Total:</span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </div>
              <div
                className={`flex justify-between font-semibold p-0.5 rounded text-xs ${
                  amountTendered >= total
                    ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'
                    : 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100'
                }`}
              >
                <span>Change:</span>
                <span>{formatCurrency(Math.max(0, amountTendered - total))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkout Button - Always at bottom */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 px-2 py-1">
          <Button
            className="w-full h-8 text-xs font-semibold"
            disabled={isCheckingOut || !selectedPaymentMethod}
            onClick={onCheckout}
            aria-label="Complete checkout"
          >
            {isCheckingOut ? 'Processing…' : 'Checkout'}
          </Button>
        </div>
      )}
    </div>
  );
}
