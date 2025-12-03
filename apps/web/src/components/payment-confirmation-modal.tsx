'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@smartduka/ui';
import { Check, X, Smartphone, Banknote, CreditCard, QrCode } from 'lucide-react';

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

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'mpesa': return Smartphone;
    case 'cash': return Banknote;
    case 'card': return CreditCard;
    case 'qr': return QrCode;
    default: return Banknote;
  }
};

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
  const PaymentIcon = getPaymentIcon(data.paymentMethod);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="flex gap-1 px-4 pt-3">
          <div className="flex-1 h-1 bg-primary rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <DialogHeader className="px-4 pt-2 pb-0">
          <DialogTitle className="text-base font-semibold">Confirm Payment</DialogTitle>
          <DialogDescription className="text-xs">Step 1 of 3</DialogDescription>
        </DialogHeader>

        {/* Compact Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Payment Method - Highlighted */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <PaymentIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Payment Method</p>
              <p className="text-lg font-bold">{data.paymentMethodLabel}</p>
            </div>
          </div>

          {/* Order Summary - Inline */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Items</p>
              <p className="font-semibold">{data.itemCount}</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Subtotal</p>
              <p className="font-semibold">{formatCurrency(data.subtotal)}</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Tax</p>
              <p className="font-semibold">{formatCurrency(data.tax)}</p>
            </div>
            <div className="p-2 rounded bg-green-100 dark:bg-green-900/50">
              <p className="text-green-700 dark:text-green-300 text-xs">Total</p>
              <p className="font-bold text-green-700 dark:text-green-300">{formatCurrency(data.total)}</p>
            </div>
          </div>

          {/* Customer (if any) */}
          {data.customerName && (
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold truncate">{data.customerName}</span>
            </div>
          )}

          {/* Cash Change Display */}
          {isCash && data.amountTendered !== undefined && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-700 dark:text-green-300">Tendered</span>
                <span className="font-bold">{formatCurrency(data.amountTendered)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-green-700 dark:text-green-300">Change</span>
                <span className="text-green-600 dark:text-green-400 text-lg">{formatCurrency(changeAmount)}</span>
              </div>
            </div>
          )}

          {/* Non-cash reminder */}
          {!isCash && (
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 text-center">
              Ensure customer has {data.paymentMethodLabel} ready
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 pt-0">
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 h-11 font-semibold"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Confirm
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="h-11"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
