'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@smartduka/ui';
import { AlertCircle, Check, X } from 'lucide-react';

export interface PaymentConfirmationData {
  paymentMethod: string;
  paymentMethodLabel: string;
  subtotal: number;
  tax: number;
  total: number;
  amountTendered?: number;
  change?: number;
  customerName?: string;
  itemCount: number;
}

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  data: PaymentConfirmationData | null;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

export function PaymentConfirmationModal({
  isOpen,
  data,
  isProcessing = false,
  onConfirm,
  onCancel,
}: PaymentConfirmationModalProps) {
  if (!data) return null;

  const isCash = data.paymentMethod === 'cash';
  const changeAmount = data.change ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md lg:max-w-4xl lg:max-h-[90vh]">
        {/* Progress Indicator */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1 h-1.5 bg-green-500 rounded" />
          <div className="flex-1 h-1.5 bg-gray-300 rounded" />
          <div className="flex-1 h-1.5 bg-gray-300 rounded" />
        </div>

        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl lg:text-2xl">
            <AlertCircle className="h-6 w-6 text-blue-600" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription className="text-sm">
            Step 1 of 3: Review payment details
          </DialogDescription>
        </DialogHeader>

        {/* Landscape Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 overflow-y-auto max-h-[calc(90vh-200px)] lg:max-h-[400px]">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Customer Info */}
            {data.customerName && (
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer</p>
                <p className="text-lg font-semibold mt-1">{data.customerName}</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Summary</p>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">{data.itemCount} items</span>
                <span className="font-semibold">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Tax (2%)</span>
                <span className="font-semibold">{formatCurrency(data.tax)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Middle Column - Payment Method */}
          <div className="lg:col-span-1 flex flex-col justify-center">
            <div className="space-y-2 rounded-lg bg-blue-50 p-6 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 h-full flex flex-col justify-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</p>
              <p className="text-3xl lg:text-4xl font-bold text-blue-900 dark:text-blue-100 text-center">
                {data.paymentMethodLabel}
              </p>
            </div>
          </div>

          {/* Right Column - Cash Details or Warning */}
          <div className="lg:col-span-1">
            {isCash && data.amountTendered !== undefined ? (
              <div className="space-y-3 rounded-lg bg-green-50 p-4 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 h-full flex flex-col justify-center">
                <div className="flex justify-between text-base">
                  <span className="text-green-700 dark:text-green-300">Amount Tendered</span>
                  <span className="font-bold text-green-900 dark:text-green-100 text-lg">
                    {formatCurrency(data.amountTendered)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-green-700 dark:text-green-300">Total Due</span>
                  <span className="font-bold text-green-900 dark:text-green-100 text-lg">
                    {formatCurrency(data.total)}
                  </span>
                </div>
                <Separator className="my-3 bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between text-2xl font-bold">
                  <span className="text-green-700 dark:text-green-300">Change</span>
                  <span className="text-green-900 dark:text-green-100">
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
              </div>
            ) : !isCash ? (
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950 h-full flex items-center justify-center">
                <p className="text-base text-amber-900 dark:text-amber-100 text-center">
                  ℹ️ Ensure customer has {data.paymentMethodLabel} available before proceeding
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 lg:mt-8">
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 h-14 lg:h-16 text-base lg:text-lg font-bold"
          >
            {isProcessing ? (
              <>
                <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-6 w-6" />
                ✓ CONFIRM
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 h-14 lg:h-16 text-base lg:text-lg"
          >
            <X className="mr-2 h-5 w-5" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
