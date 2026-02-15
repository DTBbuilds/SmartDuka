'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Textarea, Badge, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@smartduka/ui';
import { ShoppingCart, Trash2, Check } from 'lucide-react';

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

interface POSCartSidebarProps {
  cartItems: CartItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  selectedPaymentMethod: string | null;
  amountTendered: number;
  customerName: string;
  orderNotes: string;
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
  onOrderNotesChange: (notes: string) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export function POSCartSidebar({
  cartItems,
  subtotal,
  totalDiscount,
  tax,
  total,
  selectedPaymentMethod,
  amountTendered,
  customerName,
  orderNotes,
  isCheckingOut,
  checkoutMessage,
  checkoutError,
  paymentOptions,
  shopSettings,
  onPaymentMethodSelect,
  onAmountTenderedChange,
  onCustomerNameChange,
  onOrderNotesChange,
  onRemoveItem,
  onCheckout,
}: POSCartSidebarProps) {
  const taxRate = shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0;
  const taxName = shopSettings?.tax?.name || 'VAT';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Cart Card - Scrollable Items */}
      <Card className="border-dashed flex-1 flex flex-col min-h-0 mb-2">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg">Cart</CardTitle>
              <CardDescription className="text-xs">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{formatCurrency(subtotal)}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-1 flex-1 flex flex-col overflow-y-auto min-h-0">
          {checkoutMessage && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-1.5 text-xs text-green-700 dark:text-green-300">
              {checkoutMessage}
            </div>
          )}
          {checkoutError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-1.5 text-xs text-red-600 dark:text-red-400">
              {checkoutError}
            </div>
          )}

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto rounded-md border min-h-[80px]">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="text-xs uppercase text-muted-foreground sticky top-0 bg-background">
                  <TableHead className="px-2 py-1">Item</TableHead>
                  <TableHead className="w-12 text-center px-1 py-1">Qty</TableHead>
                  <TableHead className="w-16 text-right px-1 py-1">Price</TableHead>
                  <TableHead className="w-8 text-center px-1 py-1">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  cartItems.map((item) => (
                    <TableRow key={item.productId} className="text-xs group hover:bg-slate-50 dark:hover:bg-slate-900">
                      <TableCell className="font-medium px-2 py-1 truncate">{item.name}</TableCell>
                      <TableCell className="text-center px-1 py-1">{item.quantity}</TableCell>
                      <TableCell className="text-right px-1 py-1">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </TableCell>
                      <TableCell className="text-center px-1 py-1">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Customer Info - Hidden on Desktop, Compact on Mobile */}
          {cartItems.length > 0 && (
            <div className="hidden lg:grid gap-1">
              <Input
                placeholder="Customer (optional)"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                className="text-xs h-8"
              />
              <Textarea
                placeholder="Notes (optional)"
                value={orderNotes}
                onChange={(e) => onOrderNotesChange(e.target.value)}
                className="text-xs resize-none h-12"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Payment & Checkout Section - Always Visible */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 border-t pt-1.5 space-y-1.5 bg-background">
          {/* Totals Summary - Compact */}
          <div className="px-2 space-y-0.25 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}

            {shopSettings?.tax?.enabled && (
              <div className="flex justify-between">
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

          {/* Payment Method Buttons - 2x2 Grid */}
          <div className="grid gap-1 grid-cols-2 px-2">
            {paymentOptions.map((option) => (
              <Button
                key={option.id}
                onClick={() => onPaymentMethodSelect(option.id)}
                variant={selectedPaymentMethod === option.id ? 'default' : 'outline'}
                size="sm"
                className={`
                  h-12 flex flex-col items-center justify-center gap-0.5
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
                <option.icon className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">{option.label}</span>
                {selectedPaymentMethod === option.id && (
                  <Check className="h-3 w-3 absolute top-1 right-1" />
                )}
              </Button>
            ))}
          </div>

          {/* Cash Payment - Amount Tendered Input */}
          {selectedPaymentMethod === 'cash' && (
            <div className="space-y-0.5 p-1.5 mx-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-900">
              <label className="text-xs font-medium text-blue-900 dark:text-blue-100">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Amount"
                value={amountTendered || ''}
                onChange={(e) => onAmountTenderedChange(Number(e.target.value) || 0)}
                className="text-sm font-semibold h-8"
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
                    className={`flex justify-between font-semibold p-1 rounded text-xs ${
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

          {/* Checkout Button */}
          <Button
            className="w-full h-9 text-xs font-semibold mx-2"
            style={{ width: 'calc(100% - 1rem)' }}
            disabled={isCheckingOut || cartItems.length === 0 || !selectedPaymentMethod}
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

