'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useBillingHistory } from '@/hooks/use-subscription';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { 
  AlertTriangle, CreditCard, Clock, Shield, RefreshCw, 
  Smartphone, Send, X, Phone, Loader2, Check, 
  ShoppingCart, Package, Users, BarChart3, UserCircle,
  LogOut, ExternalLink, ArrowRight, Banknote, Copy, Mail,
  AlertCircle, CheckCircle2, ArrowLeftRight, RotateCcw
} from 'lucide-react';
import Link from 'next/link';

/**
 * SubscriptionBlocker Component
 * 
 * Full-page blocker that prevents ALL shop activities when subscription is:
 * - Expired (trial or paid)
 * - Suspended (non-payment past grace period)
 * - Cancelled
 * 
 * Shows a prominent renewal prompt and blocks all access to shop features.
 * Only allows access to subscription/payment pages.
 */
export function SubscriptionBlocker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { subscription, loading, refetch } = useSubscription();
  const { pendingInvoices, initiatePayment, loading: billingLoading, refetch: refetchBilling } = useBillingHistory();
  const [isBlocked, setIsBlocked] = useState(false);
  // Track if we've done the initial subscription check - prevents flashing
  const [hasInitialized, setHasInitialized] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');
  const [blockTitle, setBlockTitle] = useState<string>('');
  
  // Payment verification in progress state
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [verificationSubmittedAt, setVerificationSubmittedAt] = useState<Date | null>(null);
  const [fastPollingActive, setFastPollingActive] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'send_money' | 'card' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Send Money specific state
  const [sendMoneyReference, setSendMoneyReference] = useState('');
  const [senderPhoneNumber, setSenderPhoneNumber] = useState('');
  const [referenceSubmitted, setReferenceSubmitted] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  
  // Official SmartDuka Send Money number
  const SMARTDUKA_SEND_MONEY_NUMBER = '0729983567';

  // Check if there's a pending verification invoice
  const hasPendingVerification = pendingInvoices?.some(
    (inv) => inv.status === 'pending_verification'
  ) || false;

  // Get the pending verification invoice details
  const pendingVerificationInvoice = pendingInvoices?.find(
    (inv) => inv.status === 'pending_verification'
  );

  // Check if subscription is expired by date (even if status hasn't updated)
  const isExpiredByDate = () => {
    if (!subscription?.currentPeriodEnd) return false;
    const periodEnd = new Date(subscription.currentPeriodEnd);
    return new Date() > periodEnd;
  };

  // Validate Kenyan phone number
  const isValidKenyanPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return (
      (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) ||
      (cleaned.length === 12 && cleaned.startsWith('254'))
    );
  };

  useEffect(() => {
    // Don't process during initial load - wait for data
    if (loading && !hasInitialized) return;
    
    // Mark as initialized once we've loaded at least once
    if (!loading && !hasInitialized) {
      setHasInitialized(true);
    }
    
    // Super admins bypass subscription checks
    if (user?.role === 'super_admin') {
      setIsBlocked(false);
      return;
    }

    // No subscription - let other guards handle this
    if (!subscription) {
      setIsBlocked(false);
      return;
    }

    // Check subscription status
    const status = subscription.status;
    const expiredByDate = isExpiredByDate();

    // Determine if we should block and why
    // IMPORTANT: Only FREE trial status with remaining days should NOT be blocked
    // All paid plans that are overdue/expired MUST be blocked immediately
    const planCode = subscription.planCode?.toLowerCase();
    
    // Only actual trial status with remaining time is exempt - NOT starter or other paid plans
    const isActiveTrial = status === 'trial' && !expiredByDate;
    
    if (isActiveTrial) {
      // Active trial period - allow access
      setIsBlocked(false);
    } else if (status === 'expired' || status === 'suspended' || status === 'cancelled' || status === 'past_due') {
      // IMMEDIATE blocking for any non-active subscription status
      // No grace period - block immediately when payment is overdue
      setIsBlocked(true);
      if (status === 'expired') {
        setBlockTitle('Subscription Expired');
        setBlockReason('Your subscription has expired. Please renew to continue using SmartDuka.');
      } else if (status === 'suspended') {
        setBlockTitle('Account Suspended');
        setBlockReason('Your account has been suspended due to non-payment. Please pay your outstanding balance to restore access.');
      } else if (status === 'past_due') {
        setBlockTitle('Payment Required');
        setBlockReason('Your subscription payment is overdue. All shop operations are blocked until payment is completed. Please pay now to restore access.');
      } else {
        setBlockTitle('Subscription Cancelled');
        setBlockReason('Your subscription has been cancelled. Please reactivate to continue using SmartDuka.');
      }
    } else if (expiredByDate && (status === 'active' || status === 'trial')) {
      // IMMEDIATE blocking when period expires (even if status hasn't updated yet)
      setIsBlocked(true);
      setBlockTitle('Subscription Period Ended');
      setBlockReason('Your subscription period has ended. Please make a payment to continue using SmartDuka.');
    } else if (status === 'pending_payment') {
      setIsBlocked(true);
      setBlockTitle('Payment Required');
      setBlockReason('Your subscription is pending payment. Please complete payment to activate your account.');
    } else {
      setIsBlocked(false);
    }
  }, [loading, subscription, user, hasInitialized]);

  // Update verification pending state based on invoice status
  useEffect(() => {
    if (hasPendingVerification) {
      setIsVerificationPending(true);
      // If we just submitted and now see pending_verification, start fast polling
      if (referenceSubmitted && !fastPollingActive) {
        setFastPollingActive(true);
        setVerificationSubmittedAt(new Date());
      }
    } else if (subscription?.status === 'active') {
      // Payment was verified and subscription is active
      setIsVerificationPending(false);
      setFastPollingActive(false);
      setVerificationSubmittedAt(null);
    }
  }, [hasPendingVerification, subscription?.status, referenceSubmitted, fastPollingActive]);

  // Fast polling after payment submission (every 5 seconds for first 2 minutes, then every 15 seconds)
  useEffect(() => {
    if (!fastPollingActive) return;
    
    const timeSinceSubmit = verificationSubmittedAt 
      ? Date.now() - verificationSubmittedAt.getTime() 
      : 0;
    
    // Use faster polling for first 2 minutes
    const pollInterval = timeSinceSubmit < 120000 ? 5000 : 15000;
    
    const interval = setInterval(() => {
      refetch();
      refetchBilling();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fastPollingActive, verificationSubmittedAt, refetch, refetchBilling]);

  // Regular refresh for blocked state (every 30 seconds)
  useEffect(() => {
    if (!isBlocked || fastPollingActive) return;
    
    const interval = setInterval(() => {
      refetch();
      refetchBilling();
    }, 30000);

    return () => clearInterval(interval);
  }, [isBlocked, fastPollingActive, refetch, refetchBilling]);

  // Handle M-Pesa payment
  const handleMpesaPayment = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      setPhoneError('Enter a valid Kenyan phone number (07XX or 01XX)');
      return;
    }
    
    // Get the pending invoice
    const invoice = pendingInvoices?.[0];
    if (!invoice) {
      setPaymentError('No pending invoice found. Please contact support.');
      return;
    }

    setPhoneError('');
    setProcessing(true);
    setPaymentError(null);
    
    try {
      const result = await initiatePayment(invoice.id, phoneNumber);
      if (result.success) {
        setPaymentSuccess(true);
        // Refetch subscription after a delay to check for payment
        setTimeout(() => {
          refetch();
        }, 5000);
      } else {
        setPaymentError(result.message || 'Payment failed. Please try again.');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  const resetPaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
    setPhoneNumber('');
    setPhoneError('');
    setPaymentError(null);
    setPaymentSuccess(false);
    setSendMoneyReference('');
    setSenderPhoneNumber('');
    setReferenceSubmitted(false);
    setCopiedNumber(false);
  };

  // Copy phone number to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Submit send money reference for verification
  const handleSendMoneySubmit = async () => {
    if (!sendMoneyReference.trim()) {
      setPaymentError('Please enter the M-Pesa transaction code');
      return;
    }
    
    if (!senderPhoneNumber.trim()) {
      setPaymentError('Please enter the phone number you used to send money');
      return;
    }
    
    // Validate sender phone number
    if (!isValidKenyanPhone(senderPhoneNumber)) {
      setPaymentError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }
    
    setProcessing(true);
    setPaymentError(null);
    
    try {
      // Submit reference code for super admin verification
      const invoice = pendingInvoices?.[0];
      if (!invoice) {
        setPaymentError('No pending invoice found. Please contact support.');
        return;
      }
      
      // Call API to record send money payment attempt using existing manual payment endpoint
      const result = await api.post<{ success: boolean; message: string; mpesaReceiptNumber?: string }>(
        '/subscriptions/payments/manual/confirm',
        {
          invoiceId: invoice.id,
          mpesaReceiptNumber: sendMoneyReference.trim().toUpperCase(),
          senderPhoneNumber: senderPhoneNumber.trim(),
          paidAmount: pendingAmount,
        }
      );
      
      if (result.success) {
        setReferenceSubmitted(true);
        setPaymentSuccess(true);
        // Start fast polling immediately
        setFastPollingActive(true);
        setVerificationSubmittedAt(new Date());
        // Immediately refresh to get updated invoice status
        await refetchBilling();
        await refetch();
      } else {
        setPaymentError(result.message || 'Failed to submit payment. Please contact support.');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to submit payment reference. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

  // Get display name for subscription plan
  const getDisplayPlanName = () => {
    if (!subscription) return 'N/A';
    // For daily billing cycle, show "Daily Plan"
    if (subscription.billingCycle === 'daily' || subscription.planCode === 'daily') {
      return 'Daily Plan';
    }
    return subscription.planName || 'N/A';
  };

  // CRITICAL FIX: Don't render children during initial load
  // This prevents the flash where users briefly see protected content
  if (!hasInitialized && loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isBlocked) {
    return <>{children}</>;
  }

  // Calculate correct renewal amount based on plan and billing cycle
  // Priority: pending invoice amount > current subscription price based on billing cycle
  const getCorrectRenewalAmount = () => {
    // If there's a pending invoice that matches current plan, use it
    const pendingInvoice = pendingInvoices?.[0];
    if (pendingInvoice && pendingInvoice.totalAmount > 0) {
      // Validate the invoice amount makes sense for the plan
      // Daily plan = 99, Starter monthly = 1000, etc.
      const invoiceAmount = pendingInvoice.totalAmount;
      
      // If subscription has currentPrice and it's different from daily price (99),
      // prefer subscription's currentPrice for monthly/annual plans
      if (subscription?.currentPrice && subscription.currentPrice > 99) {
        return subscription.currentPrice;
      }
      return invoiceAmount;
    }
    
    // Fallback to subscription's current price
    return subscription?.currentPrice || 0;
  };
  
  const pendingAmount = getCorrectRenewalAmount();
  const formatCurrency = (value: number) => `KES ${value.toLocaleString('en-KE')}`;

  // Detect if this is an expired trial that needs to upgrade to a paid plan
  // Trial subscriptions have 0 amount, so after trial ends, they need to choose a plan
  const isExpiredTrial = (
    subscription?.planCode?.toLowerCase() === 'trial' || 
    subscription?.status === 'trial' ||
    (subscription?.currentPrice === 0 && pendingAmount === 0)
  ) && isBlocked;

  // Calculate time since verification submitted for display
  const getTimeSinceSubmit = () => {
    if (!verificationSubmittedAt) return null;
    const seconds = Math.floor((Date.now() - verificationSubmittedAt.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  // Show Payment Verification in Progress UI instead of blocked screen
  if (hasPendingVerification || isVerificationPending) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 overflow-auto">
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Banner - Blue/Success theme */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 md:p-8 text-white">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Payment Verification in Progress</h1>
                  <p className="text-white/90 mt-2 text-base md:text-lg">
                    Your payment has been submitted and is being verified
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Status Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 text-lg">Payment Submitted Successfully</h3>
                    <p className="text-blue-700 mt-1">
                      We have received your payment reference and it is now awaiting verification by our team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Amount</span>
                    <p className="font-semibold text-gray-900 text-lg">
                      {formatCurrency(pendingVerificationInvoice?.totalAmount || pendingAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Invoice</span>
                    <p className="font-semibold text-gray-900">
                      {pendingVerificationInvoice?.invoiceNumber || 'N/A'}
                    </p>
                  </div>
                  {pendingVerificationInvoice?.mpesaReceiptNumber && (
                    <div className="col-span-2">
                      <span className="text-gray-500">M-Pesa Reference</span>
                      <p className="font-mono font-semibold text-gray-900">
                        {pendingVerificationInvoice.mpesaReceiptNumber}
                      </p>
                    </div>
                  )}
                  {verificationSubmittedAt && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Submitted</span>
                      <p className="font-medium text-gray-900">{getTimeSinceSubmit()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* What's Happening */}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Payment submitted</p>
                      <p className="text-sm text-gray-500">Your M-Pesa transaction has been recorded</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Verification in progress</p>
                      <p className="text-sm text-gray-500">Our team is verifying your payment</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Account activation</p>
                      <p className="text-sm text-gray-400">Your account will be activated automatically</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-refresh indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <RefreshCw className={`w-4 h-4 ${fastPollingActive ? 'animate-spin' : ''}`} />
                <span>
                  {fastPollingActive 
                    ? 'Checking for updates every few seconds...' 
                    : 'This page will automatically update when verified'}
                </span>
              </div>

              {/* Contact Support */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Verification usually takes a few minutes. If you have questions:
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <a href="mailto:smartdukainfo@gmail.com" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="w-4 h-4" />
                    smartdukainfo@gmail.com
                  </a>
                  <a href="tel:0729983567" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Phone className="w-4 h-4" />
                    0729983567
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    refetch();
                    refetchBilling();
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </button>
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show special UI for expired trial - prompt to choose a paid plan
  if (isExpiredTrial) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 overflow-auto">
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Banner - Purple/Blue theme for trial end */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 md:p-8 text-white">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Your Free Trial Has Ended</h1>
                  <p className="text-white/90 mt-2 text-base md:text-lg">
                    Thank you for trying SmartDuka! Choose a plan to continue using all features.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Trial Summary */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 text-lg">14-Day Trial Completed</h3>
                    <p className="text-purple-700 mt-1">
                      Your free trial period has ended. To continue managing your shop with SmartDuka, 
                      please select a subscription plan that fits your business needs.
                    </p>
                  </div>
                </div>
              </div>

              {/* What You Get */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">What&apos;s included in paid plans:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: ShoppingCart, label: 'Point of Sale' },
                    { icon: Package, label: 'Inventory Management' },
                    { icon: BarChart3, label: 'Sales Reports' },
                    { icon: Users, label: 'Employee Management' },
                    { icon: UserCircle, label: 'Customer Records' },
                    { icon: CreditCard, label: 'M-Pesa Integration' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <item.icon className="w-4 h-4 text-gray-500" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href="/settings?tab=subscription&autoOpen=true&action=change-plan"
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-3 text-lg shadow-lg"
              >
                <CreditCard className="w-6 h-6" />
                Choose a Plan
                <ArrowRight className="w-5 h-5" />
              </Link>

              {/* Plan options preview */}
              <div className="text-center text-sm text-gray-500">
                <p>Plans starting from <strong className="text-gray-900">KES 1,000/month</strong></p>
                <p className="mt-1">Daily, monthly, and annual billing options available</p>
              </div>

              {/* Other Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => refetch()}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              {/* Support */}
              <div className="bg-blue-50 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Need help choosing a plan?</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <a 
                    href="mailto:smartdukainfo@gmail.com" 
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-900"
                  >
                    <Mail className="w-4 h-4" />
                    smartdukainfo@gmail.com
                  </a>
                  <a 
                    href="tel:0729983567" 
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-900"
                  >
                    <Phone className="w-4 h-4" />
                    0729983567
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render full-page blocker with improved layout
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
        {/* Main container - wider on desktop */}
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl md:text-3xl font-bold">{blockTitle}</h1>
                <p className="text-white/90 mt-1 text-base md:text-lg">{blockReason}</p>
              </div>
              {pendingAmount > 0 && (
                <div className="bg-white/20 rounded-xl px-6 py-3 text-center flex-shrink-0">
                  <p className="text-sm text-white/80">Amount Due</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatCurrency(pendingAmount)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Horizontal layout on desktop */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              
              {/* Left Column - Status Info */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  Subscription Status
                </h2>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Plan</span>
                    <span className="font-semibold text-gray-900">{getDisplayPlanName()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Status</span>
                    <span className={`font-semibold capitalize px-2 py-0.5 rounded-full text-sm ${
                      subscription?.status === 'expired' ? 'bg-red-100 text-red-700' :
                      subscription?.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {subscription?.status || 'Unknown'}
                    </span>
                  </div>
                  {subscription?.currentPeriodEnd && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Period Ended</span>
                      <span className="font-medium text-gray-900">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Blocked Features */}
                <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                  <h3 className="font-semibold text-red-800 mb-3 text-sm">Currently Blocked:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: ShoppingCart, label: 'Sales & POS' },
                      { icon: Package, label: 'Inventory' },
                      { icon: Users, label: 'Employees' },
                      { icon: BarChart3, label: 'Reports' },
                      { icon: UserCircle, label: 'Customers' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-red-700 text-sm">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Column - Payment Options */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  Make Payment
                </h2>
                
                <div className="space-y-3">
                  {/* M-Pesa STK Push - DISABLED */}
                  <div
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                  >
                    <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-600">M-Pesa STK Push</p>
                      <p className="text-sm text-red-500">Not configured - Use Send Money</p>
                    </div>
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Send Money - RECOMMENDED */}
                  <button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentMethod('send_money');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-all group relative"
                  >
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Recommended
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Send Money</p>
                      <p className="text-sm text-gray-500">Send to {SMARTDUKA_SEND_MONEY_NUMBER}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Card Payment - Opens payment modal directly */}
                  <button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentMethod('card');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Pay with Card</p>
                      <p className="text-sm text-gray-500">Debit/Credit card via Stripe</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* View All Options */}
                  <Link
                    href="/settings?tab=subscription"
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">More Options</p>
                      <p className="text-sm text-gray-500">Plans & billing history</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Right Column - Quick Actions */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Quick Actions
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => refetch()}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left"
                  >
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Refresh Status</p>
                      <p className="text-xs text-gray-500">Check if payment was received</p>
                    </div>
                  </button>

                  {/* Switch Plan Button - opens plan selection modal directly */}
                  <button
                    onClick={() => {
                      // Navigate to settings with action to open plan modal immediately
                      router.push('/settings?tab=subscription&action=change-plan&autoOpen=true');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all text-left"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Switch Plan</p>
                      <p className="text-xs text-gray-500">Change to a different plan</p>
                    </div>
                  </button>

                  <Link
                    href="/settings?tab=subscription"
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left"
                  >
                    <Shield className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Subscription Details</p>
                      <p className="text-xs text-gray-500">View plan & billing info</p>
                    </div>
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left"
                  >
                    <LogOut className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Sign Out</p>
                      <p className="text-xs text-gray-500">Log out of your account</p>
                    </div>
                  </button>
                </div>

                {/* Support */}
                <div className="bg-blue-50 rounded-xl p-4 mt-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">Need help?</p>
                  <div className="space-y-2">
                    <a 
                      href="mailto:smartdukainfo@gmail.com" 
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      <Mail className="w-4 h-4" />
                      smartdukainfo@gmail.com
                    </a>
                    <a 
                      href="tel:0729983567" 
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      <Phone className="w-4 h-4" />
                      0729983567
                    </a>
                    <a 
                      href="tel:0104160502" 
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      <Phone className="w-4 h-4" />
                      0104160502
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal - Optimized for all screen sizes */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className={`p-4 text-white ${paymentMethod === 'mpesa' ? 'bg-green-600' : paymentMethod === 'card' ? 'bg-blue-600' : 'bg-orange-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {paymentMethod === 'mpesa' ? (
                    <Smartphone className="w-6 h-6" />
                  ) : paymentMethod === 'card' ? (
                    <CreditCard className="w-6 h-6" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                  <h3 className="font-semibold text-lg">
                    {paymentMethod === 'mpesa' ? 'M-Pesa Payment' : paymentMethod === 'card' ? 'Card Payment' : 'Send Money'}
                  </h3>
                </div>
                <button
                  onClick={resetPaymentModal}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable with max height */}
            <div className="p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {paymentSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Payment Initiated!</h4>
                  <p className="text-gray-600 mb-4">
                    {paymentMethod === 'mpesa' 
                      ? 'Check your phone for the M-Pesa prompt and enter your PIN.'
                      : 'Once you complete the transfer, your account will be activated.'
                    }
                  </p>
                  <button
                    onClick={() => {
                      resetPaymentModal();
                      refetch();
                    }}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : paymentMethod === 'send_money' ? (
                <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                  {!referenceSubmitted ? (
                    <>
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Send Money Instructions
                          </h4>
                          <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
                            <li>Open M-Pesa on your phone</li>
                            <li>Select <strong>"Send Money"</strong></li>
                            <li>Enter phone number:</li>
                          </ol>
                          
                          {/* Phone number with copy button */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 bg-white border-2 border-green-300 rounded-lg p-3 text-center">
                              <span className="text-xl sm:text-2xl font-bold text-green-800 font-mono tracking-wider">
                                {SMARTDUKA_SEND_MONEY_NUMBER}
                              </span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(SMARTDUKA_SEND_MONEY_NUMBER)}
                              className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              {copiedNumber ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                          {copiedNumber && (
                            <p className="text-xs text-green-600 text-center mt-1">Copied!</p>
                          )}
                          
                          <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside mt-3" start={4}>
                            <li>Enter amount: <strong>{formatCurrency(pendingAmount)}</strong></li>
                            <li>Enter your M-Pesa PIN to confirm</li>
                            <li>Enter the transaction code below</li>
                          </ol>
                        </div>
                      </div>

                      {/* Right Column - Input Form */}
                      <div className="space-y-4">
                        {/* Reference Code Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            M-Pesa Transaction Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="E.G., SLK7XXXXXX"
                            value={sendMoneyReference}
                            onChange={(e) => {
                              setSendMoneyReference(e.target.value.toUpperCase());
                              setPaymentError(null);
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono text-center uppercase focus:border-green-500 focus:ring-2 focus:ring-green-200"
                            maxLength={15}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the code from your M-Pesa confirmation message (e.g., SLK7XXXXXX)
                          </p>
                        </div>

                        {/* Sender Phone Number Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="tel"
                              placeholder="0712345678"
                              value={senderPhoneNumber}
                              onChange={(e) => {
                                setSenderPhoneNumber(e.target.value.replace(/[^0-9]/g, ''));
                                setPaymentError(null);
                              }}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                              maxLength={12}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the phone number you used to send the money
                          </p>
                        </div>

                        {paymentError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            {paymentError}
                          </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> After submitting, our team will verify your payment within <strong>1-5 minutes</strong>. 
                            You will receive an email confirmation once verified.
                          </p>
                        </div>

                        <button
                          onClick={handleSendMoneySubmit}
                          disabled={processing || !sendMoneyReference.trim() || !senderPhoneNumber.trim()}
                          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5" />
                              Submit for Verification
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">Payment Submitted!</h4>
                      <p className="text-gray-600 mb-2">
                        Reference: <span className="font-mono font-bold">{sendMoneyReference}</span>
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Our team will verify your payment within 1-5 minutes. 
                        You&apos;ll receive an email confirmation once verified.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                        <p><strong>Contact us if you need help:</strong></p>
                        <p>📧 smartdukainfo@gmail.com</p>
                        <p>📞 0729983567 / 0104160502</p>
                      </div>
                      <button
                        onClick={async () => {
                          // Close modal and refresh data to show verification screen
                          setShowPaymentModal(false);
                          // Force refetch to get updated invoice status
                          await refetchBilling();
                          await refetch();
                          // Set verification pending state manually in case refetch timing issues
                          setIsVerificationPending(true);
                        }}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Clock className="w-5 h-5" />
                        View Verification Status
                      </button>
                    </div>
                  )}
                </div>
              ) : paymentMethod === 'card' ? (
                <div className="space-y-4">
                  {/* Card Payment - Redirect to Stripe checkout */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800">Card Payment</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Pay securely with Visa, Mastercard, and more
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600">Amount to pay:</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(pendingAmount)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Secured by Stripe - 256-bit encryption</p>
                  </div>

                  <button
                    onClick={() => {
                      // Navigate to settings subscription tab with card payment action
                      router.push('/settings?tab=subscription&action=pay-card&autoOpen=true');
                      resetPaymentModal();
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pay with Card
                  </button>

                  <p className="text-xs text-center text-gray-500">
                    You'll be redirected to complete the card payment
                  </p>

                  <button
                    onClick={resetPaymentModal}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : paymentMethod === 'mpesa' ? (
                <div className="space-y-4">
                  {/* STK Push is not configured - show message and redirect to Send Money */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-800">M-Pesa STK Push Not Available</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          STK Push payment is not configured yet. Please use the <strong>Send Money</strong> option instead.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">Send money directly to:</p>
                    <p className="text-2xl font-bold text-green-700 font-mono">0729983567</p>
                    <p className="text-xs text-green-600 mt-1">SmartDuka Payments</p>
                  </div>

                  <button
                    onClick={() => setPaymentMethod('send_money')}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Use Send Money Instead
                  </button>

                  <button
                    onClick={resetPaymentModal}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-2">Send Money Instructions</h4>
                    <ol className="text-sm text-orange-700 space-y-2 list-decimal list-inside">
                      <li>Go to M-Pesa on your phone</li>
                      <li>Select &quot;Send Money&quot;</li>
                      <li>Enter phone: <span className="font-mono font-semibold">0708 953 022</span></li>
                      <li>Amount: <span className="font-semibold">{formatCurrency(pendingAmount)}</span></li>
                      <li>Enter your M-Pesa PIN</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                    <p className="font-medium">After sending:</p>
                    <p>Your account will be activated automatically within 5 minutes. Click &quot;I&apos;ve Sent&quot; below.</p>
                  </div>

                  <button
                    onClick={() => {
                      setPaymentSuccess(true);
                      setTimeout(() => refetch(), 3000);
                    }}
                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    I&apos;ve Sent the Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to check if subscription is blocking access
 */
export function useSubscriptionBlocked() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();

  const isBlocked = () => {
    if (loading) return false;
    if (user?.role === 'super_admin') return false;
    if (!subscription) return false;

    const status = subscription.status;
    
    // Check if expired by date
    if (subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      if (new Date() > periodEnd) return true;
    }

    // Check status
    return ['expired', 'suspended', 'cancelled', 'pending_payment'].includes(status);
  };

  return {
    isBlocked: isBlocked(),
    subscription,
    loading,
  };
}
