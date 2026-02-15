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
  Phone,
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  Ban,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { useMpesaPayment, MpesaPhase, MpesaErrorCategory } from '@/hooks/use-mpesa-payment';

interface MpesaPaymentFlowEnhancedProps {
  isOpen: boolean;
  orderId: string;
  amount: number;
  customerName?: string;
  phoneNumber?: string;
  onSuccess: (receiptNumber: string) => void;
  onCancel: () => void;
  onBack?: () => void;
}

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

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

const maskPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
  }
  return phone;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isValidKenyanPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return (
    (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) ||
    (cleaned.length === 12 && cleaned.startsWith('254'))
  );
};

/**
 * Get icon for error category
 */
const getErrorIcon = (category: MpesaErrorCategory) => {
  switch (category) {
    case 'user_cancelled':
      return Ban;
    case 'wrong_pin':
      return Shield;
    case 'insufficient_funds':
      return CreditCard;
    case 'phone_unreachable':
      return WifiOff;
    case 'timeout':
      return Clock;
    case 'network_error':
      return Wifi;
    default:
      return AlertCircle;
  }
};

/**
 * Get color for error category
 */
const getErrorColor = (category: MpesaErrorCategory) => {
  switch (category) {
    case 'user_cancelled':
      return 'text-orange-500';
    case 'wrong_pin':
      return 'text-red-500';
    case 'insufficient_funds':
      return 'text-amber-500';
    case 'phone_unreachable':
      return 'text-gray-500';
    case 'timeout':
      return 'text-blue-500';
    default:
      return 'text-red-500';
  }
};

type Step = 'phone-input' | 'processing' | 'success' | 'error';

export function MpesaPaymentFlowEnhanced({
  isOpen,
  orderId,
  amount,
  customerName,
  phoneNumber: initialPhoneNumber,
  onSuccess,
  onCancel,
  onBack,
}: MpesaPaymentFlowEnhancedProps) {
  const [step, setStep] = useState<Step>(initialPhoneNumber ? 'processing' : 'phone-input');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [autoInitiated, setAutoInitiated] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    status,
    phase,
    transaction,
    error,
    errorInfo,
    timeRemaining,
    progress,
    phaseMessage,
    initiatePayment,
    retryPayment,
    cancelPayment,
    reset,
    queryStatus,
    isLoading,
    isPending,
    isCompleted,
    isFailed,
    canRetry,
    canCancel,
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialPhoneNumber) {
        setPhoneNumber(initialPhoneNumber);
        setStep('processing');
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
    if (isOpen && initialPhoneNumber && orderId && !autoInitiated && step === 'processing') {
      setAutoInitiated(true);
      initiatePayment(orderId, initialPhoneNumber, amount, customerName);
    }
  }, [isOpen, initialPhoneNumber, orderId, amount, customerName, autoInitiated, step, initiatePayment]);

  // Update step based on status
  useEffect(() => {
    if (isPending || isLoading) {
      setStep('processing');
    } else if (isCompleted) {
      setStep('success');
    } else if (isFailed) {
      setStep('error');
    }
  }, [isPending, isLoading, isCompleted, isFailed]);

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 12);
    setPhoneNumber(cleaned);
    setPhoneError(null);
  };

  const handleSendStkPush = async () => {
    if (!phoneNumber) {
      setPhoneError('Please enter your M-Pesa phone number');
      return;
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      setPhoneError('Please enter a valid Kenyan phone number (07XX or 01XX)');
      return;
    }
    setStep('processing');
    await initiatePayment(orderId, phoneNumber, amount, customerName);
  };

  const handleRetry = async () => {
    setStep('phone-input');
    reset();
  };

  const handleCancel = async () => {
    if (canCancel) {
      await cancelPayment();
    }
    reset();
    onCancel();
  };

  const handleBack = () => {
    reset();
    onBack?.();
  };

  /**
   * Get phase-specific UI content
   */
  const getPhaseContent = () => {
    switch (phase) {
      case 'sending_request':
        return {
          icon: <Loader2 className="h-12 w-12 text-green-600 animate-spin" />,
          title: 'Sending Request',
          subtitle: 'Connecting to M-Pesa...',
          showProgress: true,
        };
      case 'waiting_prompt':
        return {
          icon: (
            <div className="relative">
              <Smartphone className="h-12 w-12 text-green-600" />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-ping" />
            </div>
          ),
          title: 'Check Your Phone',
          subtitle: 'An M-Pesa prompt should appear on your phone',
          showProgress: true,
        };
      case 'waiting_pin':
        return {
          icon: (
            <div className="relative">
              <Shield className="h-12 w-12 text-blue-600" />
              <Smartphone className="h-6 w-6 text-green-600 absolute -bottom-1 -right-1" />
            </div>
          ),
          title: 'Enter Your PIN',
          subtitle: 'Enter your M-Pesa PIN on your phone to complete payment',
          showProgress: true,
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />,
          title: 'Processing Payment',
          subtitle: 'M-Pesa is processing your payment...',
          showProgress: true,
        };
      case 'verifying':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-blue-600 animate-pulse" />,
          title: 'Verifying',
          subtitle: 'Confirming your payment...',
          showProgress: true,
        };
      default:
        return {
          icon: <Smartphone className="h-12 w-12 text-green-600 animate-pulse" />,
          title: 'Processing',
          subtitle: phaseMessage,
          showProgress: true,
        };
    }
  };

  const phaseContent = getPhaseContent();

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Phone Input Step */}
        {step === 'phone-input' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    onClick={handleBack}
                    className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="flex-1">
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    M-Pesa Payment
                  </DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Pay <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  M-Pesa Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="0712 345 678"
                  value={formatPhoneDisplay(phoneNumber)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`text-lg h-14 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  autoFocus
                />
                {phoneError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Quick Phone Prefixes */}
              <div className="flex gap-2 justify-center">
                {['0712', '0110', '0700', '0768'].map((prefix) => (
                  <button
                    key={prefix}
                    onClick={() => setPhoneNumber(prefix)}
                    className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 transition-colors font-medium"
                  >
                    {prefix}...
                  </button>
                ))}
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Secure M-Pesa Payment
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      You'll receive an STK push on your phone. Enter your M-Pesa PIN to complete.
                    </p>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <Button
                className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 rounded-xl"
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
              <Button variant="ghost" className="w-full" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span>M-Pesa Payment</span>
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">
                    {formatCurrency(amount)} • {maskPhone(phoneNumber)}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Animated Phase Icon */}
              <div className="flex justify-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 flex items-center justify-center">
                  {phaseContent.icon}
                </div>
              </div>

              {/* Phase Title & Message */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">{phaseContent.title}</h3>
                <p className="text-muted-foreground">{phaseContent.subtitle}</p>
              </div>

              {/* Progress Bar */}
              {phaseContent.showProgress && (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{phaseMessage}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className={`text-2xl font-mono font-bold ${timeRemaining < 30 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-sm text-muted-foreground">remaining</span>
              </div>

              {/* Phase-specific Instructions */}
              {phase === 'waiting_prompt' && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Didn't receive the prompt?</strong>
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                    <li>Check if your phone has network signal</li>
                    <li>Ensure M-Pesa is activated on your line</li>
                    <li>Try updating your SIM: dial *234*1*6#</li>
                  </ul>
                </div>
              )}

              {phase === 'waiting_pin' && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Enter your 4-digit M-Pesa PIN
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Never share your PIN with anyone. SmartDuka will never ask for your PIN.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Different Number
                </Button>
                {canCancel && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleCancel}
                  >
                    Cancel Payment
                  </Button>
                )}
              </div>

              {/* Help Link */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <HelpCircle className="h-4 w-4" />
                Having trouble?
              </button>

              {showHelp && (
                <div className="p-4 rounded-xl bg-muted/50 text-sm space-y-2">
                  <p className="font-medium">Common issues:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• <strong>No prompt:</strong> Check phone network and M-Pesa status</li>
                    <li>• <strong>Wrong PIN:</strong> You have 3 attempts before lockout</li>
                    <li>• <strong>Timeout:</strong> Respond within 60 seconds</li>
                    <li>• <strong>Balance:</strong> Ensure sufficient M-Pesa balance</li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                Payment Successful!
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Success Animation */}
              <div className="flex justify-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">
                  {formatCurrency(amount)}
                </p>
                <p className="text-muted-foreground mt-1">Payment received</p>
              </div>

              {/* Receipt Number */}
              {transaction?.mpesaReceiptNumber && (
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">M-Pesa Receipt</p>
                  <p className="font-mono font-bold text-2xl mt-1">
                    {transaction.mpesaReceiptNumber}
                  </p>
                </div>
              )}

              {/* Done Button */}
              <Button
                className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 rounded-xl"
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
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                Payment Failed
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
                  {errorInfo ? (
                    (() => {
                      const ErrorIcon = getErrorIcon(errorInfo.category);
                      return <ErrorIcon className={`h-12 w-12 ${getErrorColor(errorInfo.category)}`} />;
                    })()
                  ) : (
                    <X className="h-12 w-12 text-red-500" />
                  )}
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-red-600">
                  {errorInfo?.userMessage || error || 'Payment could not be completed'}
                </h3>
                {errorInfo?.suggestedAction && (
                  <p className="text-muted-foreground">
                    {errorInfo.suggestedAction}
                  </p>
                )}
              </div>

              {/* Error Details Card */}
              {errorInfo && (
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Error Type</span>
                    <span className="font-medium capitalize">
                      {errorInfo.category.replace('_', ' ')}
                    </span>
                  </div>
                  {errorInfo.code && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Error Code</span>
                      <span className="font-mono">{errorInfo.code}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {canRetry && (
                  <Button
                    className="w-full h-14 text-lg font-semibold rounded-xl"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Try Again
                  </Button>
                )}
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
