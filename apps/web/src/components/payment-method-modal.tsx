'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
} from '@smartduka/ui';
import {
  Smartphone,
  Banknote,
  CreditCard,
  QrCode,
  Check,
  X,
  ArrowRight,
  Phone,
  Building2,
} from 'lucide-react';

export interface PaymentOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  primary?: boolean;
}

// Default payment options with M-Pesa and Cash prioritized
export const defaultPaymentOptions: PaymentOption[] = [
  {
    id: 'mpesa',
    label: 'M-Pesa',
    icon: Smartphone,
    description: 'Mobile money payment',
    primary: true,
  },
  {
    id: 'cash',
    label: 'Cash',
    icon: Banknote,
    description: 'Cash payment',
    primary: true,
  },
  {
    id: 'stripe',
    label: 'Card/Bank',
    icon: Building2,
    description: 'Stripe card & bank payments',
    primary: true,
  },
  {
    id: 'card',
    label: 'Card',
    icon: CreditCard,
    description: 'Debit/Credit card',
  },
  {
    id: 'qr',
    label: 'QR Pay',
    icon: QrCode,
    description: 'Scan to pay',
  },
];

interface PaymentMethodModalProps {
  isOpen: boolean;
  total: number;
  itemCount: number;
  customerName?: string;
  customerPhone?: string;
  paymentOptions?: PaymentOption[];
  onConfirm: (paymentMethod: string, amountTendered?: number, phoneNumber?: string) => void;
  onCancel: () => void;
}

/**
 * Validate Kenyan phone number
 */
const isValidKenyanPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  // Accept 07XX, 01XX (10 digits) or 2547XX, 2541XX (12 digits)
  return (
    (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) ||
    (cleaned.length === 12 && cleaned.startsWith('254'))
  );
};

/**
 * Format phone number for display
 */
const formatPhoneDisplay = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

export function PaymentMethodModal({
  isOpen,
  total,
  itemCount,
  customerName,
  customerPhone: initialPhone,
  paymentOptions = defaultPaymentOptions,
  onConfirm,
  onCancel,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone || '');
  const [phoneError, setPhoneError] = useState<string>('');
  const [step, setStep] = useState<'select' | 'cash-input' | 'mpesa-input'>('select');

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    if (methodId === 'cash') {
      // For cash, show amount input step
      setStep('cash-input');
      setAmountTendered(0);
    } else if (methodId === 'mpesa') {
      // For M-Pesa, show phone input step
      setStep('mpesa-input');
      setPhoneError('');
    } else {
      // For other methods, confirm immediately
      onConfirm(methodId);
      resetState();
    }
  };

  const handleMpesaConfirm = () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      setPhoneError('Enter a valid Kenyan phone number (07XX or 01XX)');
      return;
    }
    setPhoneError('');
    onConfirm('mpesa', undefined, phoneNumber);
    resetState();
  };

  const handleCashConfirm = () => {
    if (amountTendered >= total) {
      onConfirm('cash', amountTendered);
      resetState();
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMethod(null);
    setAmountTendered(0);
    setPhoneError('');
  };

  const resetState = () => {
    setSelectedMethod(null);
    setAmountTendered(0);
    setPhoneNumber(initialPhone || '');
    setPhoneError('');
    setStep('select');
  };

  const handleClose = () => {
    resetState();
    onCancel();
  };

  const change = Math.max(0, amountTendered - total);
  const isAmountSufficient = amountTendered >= total;

  // Quick amount buttons for cash
  const quickAmounts = [
    Math.ceil(total / 100) * 100, // Round up to nearest 100
    Math.ceil(total / 500) * 500, // Round up to nearest 500
    Math.ceil(total / 1000) * 1000, // Round up to nearest 1000
    total, // Exact amount
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  // Separate primary and secondary payment options
  const primaryOptions = paymentOptions.filter(o => o.primary);
  const secondaryOptions = paymentOptions.filter(o => !o.primary);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {step === 'select' ? (
          <>
            {/* Header */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-muted/30">
              <DialogTitle className="text-lg">Select Payment Method</DialogTitle>
              <DialogDescription className="text-sm">
                {itemCount} item{itemCount !== 1 ? 's' : ''} • Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                {customerName && <span className="block text-xs mt-0.5">Customer: {customerName}</span>}
              </DialogDescription>
            </DialogHeader>

            {/* Primary Payment Options - Large buttons */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {primaryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMethodSelect(option.id)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <option.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{option.label}</p>
                      {option.description && (
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Secondary Payment Options - Smaller buttons */}
              {secondaryOptions.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Other methods</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {secondaryOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleMethodSelect(option.id)}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
                      >
                        <option.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Cancel Button */}
            <div className="px-4 pb-4">
              <Button variant="outline" size="sm" onClick={handleClose} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        ) : step === 'cash-input' ? (
          <>
            {/* Cash Input Step */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-green-600" />
                    Cash Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Received</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amountTendered || ''}
                  onChange={(e) => setAmountTendered(Number(e.target.value) || 0)}
                  className="text-xl font-bold h-14 text-center"
                  min="0"
                  step="100"
                  autoFocus
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={amountTendered === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmountTendered(amount)}
                    className="text-xs"
                  >
                    {amount >= 1000 ? `${amount / 1000}K` : amount}
                  </Button>
                ))}
              </div>

              {/* Change Display */}
              {amountTendered > 0 && (
                <div
                  className={`p-3 rounded-lg text-center ${
                    isAmountSufficient
                      ? 'bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800'
                      : 'bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {isAmountSufficient ? 'Change to give' : 'Amount short'}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isAmountSufficient
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {isAmountSufficient
                      ? formatCurrency(change)
                      : `-${formatCurrency(total - amountTendered)}`}
                  </p>
                </div>
              )}

              {/* Confirm Button */}
              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!isAmountSufficient}
                onClick={handleCashConfirm}
              >
                <Check className="h-5 w-5 mr-2" />
                Confirm Payment
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* M-Pesa Phone Input Step */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                    M-Pesa Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Customer Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError('');
                  }}
                  className={`text-xl font-bold h-14 text-center ${
                    phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                  autoFocus
                />
                {phoneError && (
                  <p className="text-sm text-red-500">{phoneError}</p>
                )}
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  An STK push will be sent to this number. The customer will enter their M-Pesa PIN to complete payment.
                </p>
              </div>

              {/* Phone Format Examples */}
              <div className="flex gap-2 justify-center">
                {['0712', '0110', '0700'].map((prefix) => (
                  <button
                    key={prefix}
                    onClick={() => setPhoneNumber(prefix)}
                    className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {prefix}...
                  </button>
                ))}
              </div>

              {/* Confirm Button */}
              <Button
                className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
                onClick={handleMpesaConfirm}
                disabled={!phoneNumber.trim()}
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Send STK Push
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
