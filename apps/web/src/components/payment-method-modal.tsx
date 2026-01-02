'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  Shield,
  Send,
} from 'lucide-react';
import { StripePaymentModal } from './stripe-payment-form';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';

export interface PaymentOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  primary?: boolean;
}

// Default payment options with M-Pesa, Send Money, and Cash prioritized
export const defaultPaymentOptions: PaymentOption[] = [
  {
    id: 'mpesa',
    label: 'M-Pesa',
    icon: Smartphone,
    description: 'STK Push payment',
    primary: true,
  },
  {
    id: 'send_money',
    label: 'Send Money',
    icon: Send,
    description: 'Direct M-Pesa transfer',
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

interface MpesaConfigStatus {
  isConfigured: boolean;
  isVerified: boolean;
  isEnabled: boolean;
  shortCode?: string;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  total: number;
  itemCount: number;
  customerName?: string;
  customerPhone?: string;
  paymentOptions?: PaymentOption[];
  mpesaConfigStatus?: MpesaConfigStatus | null;
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
  mpesaConfigStatus,
  onConfirm,
  onCancel,
}: PaymentMethodModalProps) {
  const { token } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone || '');
  const [phoneError, setPhoneError] = useState<string>('');
  const [step, setStep] = useState<'select' | 'cash-input' | 'mpesa-input' | 'card-input' | 'send-money-input'>('select');
  const [sendMoneyReference, setSendMoneyReference] = useState<string>('');
  const [sendMoneyConfirmed, setSendMoneyConfirmed] = useState<boolean>(false);
  
  // Stripe payment state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const handleMethodSelect = async (methodId: string) => {
    setSelectedMethod(methodId);
    
    if (methodId === 'cash') {
      // For cash, show amount input step
      setStep('cash-input');
      setAmountTendered(0);
    } else if (methodId === 'mpesa') {
      // Check M-Pesa config status before proceeding
      if (!mpesaConfigStatus?.isConfigured) {
        setPhoneError('M-Pesa is not configured. Go to Settings → Payments → M-Pesa to set up your credentials.');
        setStep('mpesa-input');
        return;
      }
      if (!mpesaConfigStatus?.isEnabled) {
        setPhoneError('M-Pesa payments are disabled. Enable M-Pesa in Settings → Payments.');
        setStep('mpesa-input');
        return;
      }
      if (!mpesaConfigStatus?.isVerified) {
        setPhoneError('M-Pesa credentials not verified. Verify your credentials in Settings → Payments → M-Pesa.');
        setStep('mpesa-input');
        return;
      }
      // For M-Pesa, show phone input step
      setStep('mpesa-input');
      setPhoneError('');
    } else if (methodId === 'send_money') {
      // For Send Money, show confirmation step
      setStep('send-money-input');
      setSendMoneyReference('');
      setSendMoneyConfirmed(false);
    } else if (methodId === 'stripe' || methodId === 'card') {
      // For card/stripe, create payment intent and show card form
      setStep('card-input');
      setStripeError(null);
      await createStripePaymentIntent();
    } else {
      // For other methods (QR, etc.), confirm immediately
      onConfirm(methodId);
      resetState();
    }
  };

  // Create Stripe payment intent
  const createStripePaymentIntent = async () => {
    setIsCreatingPaymentIntent(true);
    setStripeError(null);
    
    try {
      // First get the Stripe publishable key
      const configRes = await fetch(`${config.apiUrl}/stripe/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!configRes.ok) {
        throw new Error('Failed to get Stripe configuration');
      }
      
      const stripeConfig = await configRes.json();
      setStripePublishableKey(stripeConfig.publishableKey);
      
      // Create payment intent
      const res = await fetch(`${config.apiUrl}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to cents
          currency: 'kes',
          description: `POS Payment - ${itemCount} item(s)`,
          metadata: {
            customerName: customerName || 'Walk-in Customer',
            itemCount: String(itemCount),
          },
        }),
      });
      
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }
      
      const { clientSecret } = data;
      setStripeClientSecret(clientSecret);
    } catch (err: any) {
      console.error('Stripe payment intent error:', err);
      setStripeError(err.message || 'Failed to initialize card payment');
    } finally {
      setIsCreatingPaymentIntent(false);
    }
  };

  // Handle successful Stripe payment
  const handleStripeSuccess = (paymentIntentId: string) => {
    onConfirm('card', undefined, undefined);
    resetState();
  };

  // Handle Stripe payment error
  const handleStripeError = (error: string) => {
    setStripeError(error);
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

  const handleSendMoneyConfirm = () => {
    if (!sendMoneyConfirmed) {
      return;
    }
    // Pass send_money as payment method with optional reference
    onConfirm('send_money', total, sendMoneyReference || undefined);
    resetState();
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
    setStripeClientSecret(null);
    setStripeError(null);
    setSendMoneyReference('');
    setSendMoneyConfirmed(false);
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
                {primaryOptions.map((option) => {
                  // Check if M-Pesa is not configured
                  const isMpesaDisabled = option.id === 'mpesa' && (
                    !mpesaConfigStatus?.isConfigured || 
                    !mpesaConfigStatus?.isEnabled || 
                    !mpesaConfigStatus?.isVerified
                  );
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleMethodSelect(option.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 group relative ${
                        isMpesaDisabled 
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-400' 
                          : 'border-border bg-card hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      {isMpesaDisabled && (
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                          Setup
                        </div>
                      )}
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                        isMpesaDisabled 
                          ? 'bg-amber-100 dark:bg-amber-900/50 group-hover:bg-amber-200 dark:group-hover:bg-amber-900' 
                          : 'bg-primary/10 group-hover:bg-primary/20'
                      }`}>
                        <option.icon className={`h-6 w-6 ${isMpesaDisabled ? 'text-amber-600' : 'text-primary'}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{option.label}</p>
                        {isMpesaDisabled ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Not configured</p>
                        ) : option.description && (
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
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
        ) : step === 'card-input' ? (
          <>
            {/* Card Payment Step */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Card Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              {isCreatingPaymentIntent ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-muted-foreground">Preparing secure payment...</p>
                </div>
              ) : stripeError ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-center">
                    <p className="text-sm font-medium">{stripeError}</p>
                  </div>
                  <Button variant="outline" onClick={() => createStripePaymentIntent()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Secure payment powered by Stripe</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click below to enter your card details
                  </p>
                </div>
              )}
            </div>

            {/* Stripe Payment Modal */}
            <StripePaymentModal
              isOpen={!!stripeClientSecret && !isCreatingPaymentIntent}
              clientSecret={stripeClientSecret}
              amount={Math.round(total * 100)}
              currency="kes"
              publishableKey={stripePublishableKey}
              title="Complete Card Payment"
              description={customerName ? `Payment for ${customerName}` : undefined}
              onSuccess={handleStripeSuccess}
              onClose={handleBack}
              onError={handleStripeError}
            />
          </>
        ) : step === 'send-money-input' ? (
          <>
            {/* Send Money Confirmation Step */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-orange-50 dark:bg-orange-950/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5 text-orange-600" />
                    Send Money Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              {/* Instructions */}
              <div className="p-4 rounded-lg bg-orange-100 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  Customer sends money directly via M-Pesa
                </p>
                <ol className="text-xs text-orange-700 dark:text-orange-300 space-y-1 list-decimal list-inside">
                  <li>Customer opens M-Pesa on their phone</li>
                  <li>Selects &quot;Send Money&quot; option</li>
                  <li>Enters shop&apos;s phone number</li>
                  <li>Enters amount: <strong>{formatCurrency(total)}</strong></li>
                  <li>Confirms with M-Pesa PIN</li>
                </ol>
              </div>

              {/* M-Pesa Transaction Code (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  M-Pesa Transaction Code (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., SLK7XXXXXX"
                  value={sendMoneyReference}
                  onChange={(e) => setSendMoneyReference(e.target.value.toUpperCase())}
                  className="text-lg font-mono h-12 text-center uppercase"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the M-Pesa confirmation code from customer&apos;s message for records
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sendMoneyConfirmed}
                  onChange={(e) => setSendMoneyConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <p className="text-sm font-medium">I confirm payment received</p>
                  <p className="text-xs text-muted-foreground">
                    Check this after verifying the M-Pesa message or transaction
                  </p>
                </div>
              </label>

              {/* Confirm Button */}
              <Button
                className="w-full h-12 text-base font-semibold bg-orange-600 hover:bg-orange-700"
                onClick={handleSendMoneyConfirm}
                disabled={!sendMoneyConfirmed}
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Sale
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
