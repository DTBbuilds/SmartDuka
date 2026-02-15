'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@smartduka/ui';
import {
  Smartphone,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useMpesaPayment, MpesaStatus } from '@/hooks/use-mpesa-payment';

interface MpesaPaymentFlowProps {
  isOpen: boolean;
  orderId: string;
  amount: number;
  customerName?: string;
  phoneNumber?: string; // Pre-filled phone number from payment modal
  onSuccess: (receiptNumber: string) => void;
  onCancel: () => void;
  onBack?: () => void;
}

/**
 * Format currency in Kenyan Shillings
 */
const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

/**
 * Format phone number for display (0712 345 678)
 */
const formatPhoneDisplay = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    const local = '0' + cleaned.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

/**
 * Mask phone number for privacy (0712***678)
 */
const maskPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
  }
  return phone;
};

/**
 * Format time remaining as MM:SS
 */
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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

type Step = 'phone-input' | 'waiting' | 'success' | 'error';

export function MpesaPaymentFlow({
  isOpen,
  orderId,
  amount,
  customerName,
  phoneNumber: initialPhoneNumber,
  onSuccess,
  onCancel,
  onBack,
}: MpesaPaymentFlowProps) {
  const [step, setStep] = useState<Step>(initialPhoneNumber ? 'waiting' : 'phone-input');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [autoInitiated, setAutoInitiated] = useState(false);

  const {
    status,
    transaction,
    error,
    timeRemaining,
    initiatePayment,
    retryPayment,
    cancelPayment,
    reset,
    isLoading,
    isPending,
    isCompleted,
    isFailed,
  } = useMpesaPayment({
    onSuccess: (txn) => {
      setStep('success');
      if (txn.mpesaReceiptNumber) {
        onSuccess(txn.mpesaReceiptNumber);
      }
    },
    onError: () => {
      setStep('error');
    },
    onExpired: () => {
      setStep('error');
    },
  });

  // Reset state when modal opens and auto-initiate if phone number is provided
  useEffect(() => {
    if (isOpen) {
      if (initialPhoneNumber) {
        setPhoneNumber(initialPhoneNumber);
        setStep('waiting');
        setAutoInitiated(false);
      } else {
        setStep('phone-input');
        setPhoneNumber('');
      }
      setPhoneError(null);
      reset();
    }
  }, [isOpen, initialPhoneNumber, reset]);

  // Auto-initiate payment if phone number was pre-filled
  useEffect(() => {
    if (isOpen && initialPhoneNumber && orderId && !autoInitiated && step === 'waiting') {
      setAutoInitiated(true);
      initiatePayment(orderId, initialPhoneNumber, amount, customerName);
    }
  }, [isOpen, initialPhoneNumber, orderId, amount, customerName, autoInitiated, step, initiatePayment]);

  // Update step based on status
  useEffect(() => {
    if (isPending) {
      setStep('waiting');
    } else if (isCompleted) {
      setStep('success');
    } else if (isFailed) {
      setStep('error');
    }
  }, [isPending, isCompleted, isFailed]);

  /**
   * Handle phone number input change
   */
  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit length
    const cleaned = value.replace(/\D/g, '').slice(0, 12);
    setPhoneNumber(cleaned);
    setPhoneError(null);
  };

  /**
   * Handle send STK push
   */
  const handleSendStkPush = async () => {
    // Validate phone number
    if (!phoneNumber) {
      setPhoneError('Please enter your M-Pesa phone number');
      return;
    }

    if (!isValidKenyanPhone(phoneNumber)) {
      setPhoneError('Please enter a valid Kenyan phone number (07XX or 01XX)');
      return;
    }

    // Initiate payment
    await initiatePayment(orderId, phoneNumber, amount, customerName);
  };

  /**
   * Handle retry payment
   */
  const handleRetry = async () => {
    setStep('phone-input');
    reset();
  };

  /**
   * Handle cancel
   */
  const handleCancel = async () => {
    if (isPending) {
      await cancelPayment();
    }
    reset();
    onCancel();
  };

  /**
   * Handle back to payment methods
   */
  const handleBack = () => {
    reset();
    onBack?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Phone Input Step */}
        {step === 'phone-input' && (
          <>
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    onClick={handleBack}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    M-Pesa Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Total: <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">M-Pesa Phone Number</label>
                <Input
                  type="tel"
                  placeholder="0712 345 678"
                  value={formatPhoneDisplay(phoneNumber)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`text-lg h-12 ${phoneError ? 'border-red-500' : ''}`}
                  autoFocus
                />
                {phoneError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {phoneError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              {/* Send Button */}
              <Button
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                onClick={handleSendStkPush}
                disabled={isLoading || !phoneNumber}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-5 w-5 mr-2" />
                    Send Payment Request
                  </>
                )}
              </Button>

              {/* Cancel Button */}
              <Button variant="outline" className="w-full" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Waiting Step */}
        {step === 'waiting' && (
          <>
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-blue-50 dark:bg-blue-950/30">
              <DialogTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Check Your Phone
              </DialogTitle>
              <DialogDescription className="text-sm">
                {formatCurrency(amount)} • {maskPhone(phoneNumber)}
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Animated Phone Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Smartphone className="h-12 w-12 text-blue-600 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <p className="font-medium">STK Push Sent!</p>
                <p className="text-sm text-muted-foreground">
                  Enter your M-Pesa PIN on your phone to complete the payment
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-2 text-lg font-mono">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className={timeRemaining < 60 ? 'text-red-500' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend to Different Number
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleCancel}
                >
                  Cancel Payment
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-green-50 dark:bg-green-950/30">
              <DialogTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Payment Successful!
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(amount)}
                </p>
                {transaction?.mpesaReceiptNumber && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">M-Pesa Receipt</p>
                    <p className="font-mono font-bold text-lg">
                      {transaction.mpesaReceiptNumber}
                    </p>
                  </div>
                )}
              </div>

              {/* Done Button */}
              <Button
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (transaction?.mpesaReceiptNumber) {
                    onSuccess(transaction.mpesaReceiptNumber);
                  }
                }}
              >
                <Check className="h-5 w-5 mr-2" />
                Done
              </Button>
            </div>
          </>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <>
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-red-50 dark:bg-red-950/30">
              <DialogTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Payment Failed
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="h-12 w-12 text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center space-y-2">
                <p className="font-medium text-red-600">
                  {status === 'expired' ? 'Payment Request Expired' : 'Payment Failed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {error || 'The payment could not be completed. Please try again.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                >
                  Use Different Payment Method
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
