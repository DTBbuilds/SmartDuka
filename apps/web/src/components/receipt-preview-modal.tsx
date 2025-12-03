'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@smartduka/ui';
import { Printer, MessageCircle, Download, Mail, Check, Phone, MapPin, Building2, Receipt } from 'lucide-react';
import { ReceiptData, shareViaWhatsApp, printReceipt, downloadReceipt } from '@/lib/receipt-generator';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onPrint: () => void;
  onEmail?: () => void;
  isProcessing?: boolean;
}

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const formatDate = (date: Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (date: Date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentLabel = (method?: string) => {
  switch (method) {
    case 'mpesa': return '📱 M-Pesa';
    case 'cash': return '💵 Cash';
    case 'card': return '💳 Card';
    case 'qr': return '📲 QR Pay';
    default: return method || 'Unknown';
  }
};

export function ReceiptPreviewModal({
  isOpen,
  receipt,
  onPrint,
  onEmail,
  isProcessing = false,
}: ReceiptPreviewModalProps) {
  if (!receipt) return null;

  const handleWhatsApp = () => {
    shareViaWhatsApp(receipt);
  };

  const handleDownload = () => {
    downloadReceipt(receipt);
  };

  const handlePrint = () => {
    printReceipt(receipt);
    onPrint();
  };

  const shopName = receipt.shopName || 'SmartDuka';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Receipt for Order #{receipt.orderNumber}</DialogTitle>
        
        {/* Progress Bar */}
        <div className="flex gap-1 px-4 pt-3">
          <div className="flex-1 h-1 bg-primary rounded-full" />
          <div className="flex-1 h-1 bg-primary rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
        </div>

        {/* Scrollable Receipt Content */}
        <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto min-h-0">
          
          {/* Shop Header - Attractive branding */}
          <div className="text-center py-3 border-b-2 border-dashed border-muted">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">{shopName}</h2>
            </div>
            {receipt.shopAddress && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                {receipt.shopAddress}
              </p>
            )}
            {receipt.shopPhone && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" />
                {receipt.shopPhone}
              </p>
            )}
            {receipt.shopTaxPin && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">PIN:</span> {receipt.shopTaxPin}
              </p>
            )}
          </div>

          {/* Receipt Title & Order Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Sale Complete</p>
                <p className="text-xs text-muted-foreground">Order #{receipt.orderNumber}</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium">{formatDate(receipt.date)}</p>
              <p className="text-muted-foreground">{formatTime(receipt.date)}</p>
            </div>
          </div>

          {/* Cashier & Customer Info */}
          <div className="flex gap-2 text-xs">
            {receipt.cashierName && (
              <div className="flex-1 p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">Served by</p>
                <p className="font-medium">{receipt.cashierName}</p>
              </div>
            )}
            {receipt.customerName && (
              <div className="flex-1 p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium truncate">{receipt.customerName}</p>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary/10 px-3 py-2 text-xs font-semibold flex justify-between">
              <span className="flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                Items ({receipt.items.length})
              </span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-border max-h-[180px] overflow-y-auto">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs hover:bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <span className="font-semibold ml-2 text-sm">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-muted/20 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discount && receipt.discount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Tax {receipt.taxRate ? `(${(receipt.taxRate * 100).toFixed(0)}%)` : ''}
              </span>
              <span className="font-medium">{formatCurrency(receipt.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-dashed">
              <span>TOTAL</span>
              <span className="text-green-600">{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Payment Method</p>
                <p className="font-semibold text-sm">{getPaymentLabel(receipt.paymentMethod)}</p>
              </div>
              {receipt.mpesaReceiptNumber && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">M-Pesa Ref</p>
                  <p className="font-mono text-xs font-medium">{receipt.mpesaReceiptNumber}</p>
                </div>
              )}
            </div>
            {receipt.paymentMethod === 'cash' && receipt.amountTendered && (
              <div className="flex gap-4 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800 text-xs">
                <div>
                  <span className="text-muted-foreground">Tendered: </span>
                  <span className="font-medium">{formatCurrency(receipt.amountTendered)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Change: </span>
                  <span className="font-bold text-green-600">{formatCurrency(receipt.change || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Message */}
          <div className="text-center py-2 border-t border-dashed">
            <p className="text-xs text-muted-foreground italic">
              {receipt.footerMessage || 'Thank you for your purchase!'}
            </p>
            {receipt.shopPhone && (
              <p className="text-xs text-muted-foreground mt-1">
                Questions? Call us at {receipt.shopPhone}
              </p>
            )}
          </div>
        </div>

        {/* Receipt Actions - Fixed at bottom */}
        <div className="px-4 pb-4 space-y-2 flex-shrink-0 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Receipt Actions</p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={handlePrint}
              disabled={isProcessing}
              size="sm"
              className="h-14 flex flex-col items-center justify-center gap-1"
            >
              <Printer className="h-4 w-4" />
              <span className="text-xs">Print</span>
            </Button>
            <Button
              onClick={handleWhatsApp}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="h-14 flex flex-col items-center justify-center gap-1 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="h-14 flex flex-col items-center justify-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs">Download</span>
            </Button>
            {onEmail && (
              <Button
                onClick={onEmail}
                disabled={isProcessing}
                variant="outline"
                size="sm"
                className="h-14 flex flex-col items-center justify-center gap-1"
              >
                <Mail className="h-4 w-4" />
                <span className="text-xs">Email</span>
              </Button>
            )}
            {!onEmail && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-14 flex flex-col items-center justify-center gap-1 opacity-50"
              >
                <Mail className="h-4 w-4" />
                <span className="text-xs">Email</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
