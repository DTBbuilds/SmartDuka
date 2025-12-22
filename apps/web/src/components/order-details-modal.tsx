'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
} from '@smartduka/ui';
import {
  Printer,
  MessageCircle,
  Download,
  X,
  Phone,
  MapPin,
  Building2,
  Receipt,
  User,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentRecord {
  method: string;
  amount: number;
  reference?: string;
  status?: string;
  mpesaReceiptNumber?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'void';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  payments: PaymentRecord[];
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  notes?: string;
  transactionType?: 'sale' | 'void' | 'return' | 'refund';
  discountAmount?: number;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

const formatCurrency = (value: number) =>
  `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentLabel = (method?: string) => {
  switch (method) {
    case 'mpesa': return 'M-Pesa';
    case 'send_money': return 'Send Money';
    case 'cash': return 'Cash';
    case 'card': return 'Card';
    case 'qr': return 'QR Pay';
    case 'stripe': return 'Stripe';
    case 'bank': return 'Bank Transfer';
    default: return method || 'Unknown';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'void': return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'void': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'partial': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  shopName = 'SmartDuka',
  shopAddress,
  shopPhone,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate a simple text receipt for download
    const receiptText = generateReceiptText(order, shopName, shopAddress, shopPhone);
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    const receiptText = generateReceiptText(order, shopName, shopAddress, shopPhone);
    const encodedText = encodeURIComponent(receiptText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Order Details
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="px-4 py-3 space-y-4 flex-1 overflow-y-auto min-h-0">
          
          {/* Shop Header */}
          <div className="text-center py-3 border-b-2 border-dashed border-muted">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">{shopName}</h2>
            </div>
            {shopAddress && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                {shopAddress}
              </p>
            )}
            {shopPhone && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" />
                {shopPhone}
              </p>
            )}
          </div>

          {/* Order Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-primary">{order.orderNumber}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1 capitalize">{order.status}</span>
                </Badge>
                <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                  <span className="capitalize">{order.paymentStatus}</span>
                </Badge>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{formatDate(order.createdAt)}</p>
              <p className="text-muted-foreground">{formatTime(order.createdAt)}</p>
            </div>
          </div>

          {/* Cashier & Customer Info */}
          <div className="flex gap-2 text-sm">
            {order.cashierName && (
              <div className="flex-1 p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Served by</p>
                <p className="font-medium">{order.cashierName}</p>
              </div>
            )}
            {order.customerName && (
              <div className="flex-1 p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium truncate">{order.customerName}</p>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary/10 px-3 py-2 text-sm font-semibold flex justify-between">
              <span className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                Items ({order.items.length})
              </span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center px-3 py-2.5 text-sm hover:bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <span className="font-semibold ml-2">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(order.tax)}</span>
            </div>
            {order.refundAmount && order.refundAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Refund</span>
                <span>-{formatCurrency(order.refundAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dashed">
              <span>TOTAL</span>
              <span className="text-green-600">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Info */}
          {order.payments && order.payments.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Payment Details
              </p>
              <div className="space-y-2">
                {order.payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{getPaymentLabel(payment.method)}</span>
                      {payment.mpesaReceiptNumber && (
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          ({payment.mpesaReceiptNumber})
                        </span>
                      )}
                      {payment.reference && !payment.mpesaReceiptNumber && (
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          ({payment.reference})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="px-4 pb-4 pt-3 border-t flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="h-12 flex flex-col items-center justify-center gap-1"
            >
              <Printer className="h-4 w-4" />
              <span className="text-xs">Print</span>
            </Button>
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              size="sm"
              className="h-12 flex flex-col items-center justify-center gap-1 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="h-12 flex flex-col items-center justify-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs">Download</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateReceiptText(
  order: Order,
  shopName: string,
  shopAddress?: string,
  shopPhone?: string
): string {
  const lines: string[] = [];
  const divider = '================================';
  
  lines.push(divider);
  lines.push(shopName.toUpperCase());
  if (shopAddress) lines.push(shopAddress);
  if (shopPhone) lines.push(`Tel: ${shopPhone}`);
  lines.push(divider);
  lines.push('');
  lines.push(`Order: ${order.orderNumber}`);
  lines.push(`Date: ${formatDate(order.createdAt)} ${formatTime(order.createdAt)}`);
  lines.push(`Status: ${order.status.toUpperCase()}`);
  if (order.cashierName) lines.push(`Cashier: ${order.cashierName}`);
  if (order.customerName) lines.push(`Customer: ${order.customerName}`);
  lines.push('');
  lines.push(divider);
  lines.push('ITEMS');
  lines.push(divider);
  
  order.items.forEach(item => {
    lines.push(`${item.name}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}`);
  });
  
  lines.push('');
  lines.push(divider);
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  if (order.discountAmount && order.discountAmount > 0) {
    lines.push(`Discount: -${formatCurrency(order.discountAmount)}`);
  }
  lines.push(`Tax: ${formatCurrency(order.tax)}`);
  lines.push(divider);
  lines.push(`TOTAL: ${formatCurrency(order.total)}`);
  lines.push(divider);
  
  if (order.payments && order.payments.length > 0) {
    lines.push('');
    lines.push('PAYMENT');
    order.payments.forEach(p => {
      let paymentLine = `${getPaymentLabel(p.method)}: ${formatCurrency(p.amount)}`;
      if (p.mpesaReceiptNumber) paymentLine += ` (${p.mpesaReceiptNumber})`;
      lines.push(paymentLine);
    });
  }
  
  lines.push('');
  lines.push(divider);
  lines.push('Thank you for your purchase!');
  lines.push(divider);
  
  return lines.join('\n');
}
