'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
} from '@smartduka/ui';
import { Printer, Mail } from 'lucide-react';
import { ReceiptData } from '@/lib/receipt-generator';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onPrint: () => void;
  onEmail?: () => void;
  isProcessing?: boolean;
}

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function ReceiptPreviewModal({
  isOpen,
  receipt,
  onPrint,
  onEmail,
  isProcessing = false,
}: ReceiptPreviewModalProps) {
  if (!receipt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md lg:max-w-6xl lg:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Progress Indicator */}
        <div className="mb-2 flex gap-2 flex-shrink-0">
          <div className="flex-1 h-1 bg-green-500 rounded" />
          <div className="flex-1 h-1 bg-green-500 rounded" />
          <div className="flex-1 h-1 bg-gray-300 rounded" />
        </div>

        <DialogHeader className="mb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg lg:text-xl">
            🧾 Receipt Preview
          </DialogTitle>
          <DialogDescription className="text-xs lg:text-sm">
            Step 2 of 3: Review receipt before printing
          </DialogDescription>
        </DialogHeader>

        {/* Landscape Layout for Desktop */}
        <div className="flex-1 overflow-hidden min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Receipt Preview (Main) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-3 lg:p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm overflow-y-auto flex-1">
              {/* Header */}
              <div className="text-center space-y-1">
                <p className="text-sm lg:text-base font-semibold text-muted-foreground">SmartDuka POS</p>
                <p className="text-xs lg:text-sm text-muted-foreground">Receipt</p>
              </div>

              <Separator />

              {/* Order Number & Date */}
              <div className="space-y-1 text-xs lg:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-semibold">{receipt.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">{formatDate(receipt.date)}</span>
                </div>
                {receipt.cashierName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cashier</span>
                    <span className="font-semibold">{receipt.cashierName}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-1">
                <p className="text-xs lg:text-sm font-semibold text-muted-foreground uppercase">Items</p>
                <div className="space-y-0.5">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-semibold text-right flex-shrink-0">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-1" />

              {/* Totals */}
              <div className="space-y-1 text-xs lg:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({receipt.taxRate ? (receipt.taxRate * 100).toFixed(1) : '2'}%)</span>
                  <span className="font-semibold">{formatCurrency(receipt.tax)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-base lg:text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(receipt.total)}
                  </span>
                </div>
              </div>

              <Separator className="my-1" />

              {/* Payment Info */}
              <div className="space-y-0.5 text-xs lg:text-sm">
                <p className="text-muted-foreground">Payment</p>
                <p className="font-semibold">
                  {receipt.paymentMethod === 'cash'
                    ? '💵 Cash'
                    : receipt.paymentMethod === 'card'
                    ? '💳 Card'
                    : receipt.paymentMethod === 'mpesa'
                    ? '📱 M-Pesa'
                    : receipt.paymentMethod}
                </p>
                {receipt.paymentMethod === 'cash' && receipt.amountTendered && (
                  <div className="space-y-0.5 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tendered</span>
                      <span className="font-semibold">{formatCurrency(receipt.amountTendered)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(receipt.change || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              {receipt.customerName && (
                <>
                  <Separator className="my-1" />
                  <div className="space-y-0.5 text-xs lg:text-sm">
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-semibold truncate">{receipt.customerName}</p>
                  </div>
                </>
              )}

              {/* Footer */}
              <Separator className="my-1" />
              <div className="text-center text-xs text-muted-foreground space-y-0.5">
                <p>Thank you!</p>
                <p>SmartDuka POS</p>
              </div>
            </div>
          </div>

          {/* Right Column - Action Summary (Desktop Only) */}
          <div className="hidden lg:flex flex-col gap-3">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2">Order Summary</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Items</span>
                  <span className="font-bold">{receipt.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Subtotal</span>
                  <span className="font-bold">{formatCurrency(receipt.subtotal)}</span>
                </div>
                <Separator className="my-1 bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-green-900 dark:text-green-100">Total</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(receipt.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Payment</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {receipt.paymentMethod === 'cash'
                  ? '💵'
                  : receipt.paymentMethod === 'card'
                  ? '💳'
                  : receipt.paymentMethod === 'mpesa'
                  ? '📱'
                  : '💰'}
              </p>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mt-1">
                {receipt.paymentMethod === 'cash'
                  ? 'Cash'
                  : receipt.paymentMethod === 'card'
                  ? 'Card'
                  : receipt.paymentMethod === 'mpesa'
                  ? 'M-Pesa'
                  : 'Other'}
              </p>
            </div>

            {/* Status Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-xs font-semibold text-purple-900 dark:text-purple-100">Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile First */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row gap-2 lg:gap-3 mt-4 lg:mt-6">
          <Button
            onClick={onPrint}
            disabled={isProcessing}
            className="flex-1 h-12 lg:h-14 text-base lg:text-lg font-bold order-1"
          >
            <Printer className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">🖨️ PRINT</span>
            <span className="sm:hidden">Print</span>
          </Button>

          {onEmail && (
            <Button
              onClick={onEmail}
              disabled={isProcessing}
              variant="outline"
              className="flex-1 h-12 lg:h-14 text-base lg:text-lg order-2"
            >
              <Mail className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">📧 EMAIL</span>
              <span className="sm:hidden">Email</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
