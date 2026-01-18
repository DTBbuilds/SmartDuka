'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useBillingHistory } from '@/hooks/use-subscription';
import { useAuth } from '@/lib/auth-context';
import { 
  AlertTriangle, CreditCard, Clock, Shield, RefreshCw, 
  Smartphone, Send, X, Phone, Loader2, Check, 
  ShoppingCart, Package, Users, BarChart3, UserCircle,
  LogOut, ExternalLink, ArrowRight, Banknote
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
  const { pendingInvoices, initiatePayment, loading: billingLoading } = useBillingHistory();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');
  const [blockTitle, setBlockTitle] = useState<string>('');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'send_money' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
    if (loading) return;
    
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
    if (status === 'expired' || status === 'suspended' || status === 'cancelled') {
      setIsBlocked(true);
      if (status === 'expired') {
        setBlockTitle('Subscription Expired');
        setBlockReason('Your subscription has expired. Please renew to continue using SmartDuka.');
      } else if (status === 'suspended') {
        setBlockTitle('Account Suspended');
        setBlockReason('Your account has been suspended due to non-payment. Please pay your outstanding balance to restore access.');
      } else {
        setBlockTitle('Subscription Cancelled');
        setBlockReason('Your subscription has been cancelled. Please reactivate to continue using SmartDuka.');
      }
    } else if (expiredByDate && (status === 'active' || status === 'trial')) {
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
  }, [loading, subscription, user]);

  // Refresh subscription data periodically to catch status updates
  useEffect(() => {
    if (!isBlocked) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [isBlocked, refetch]);

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
  };

  if (loading) {
    return <>{children}</>;
  }

  if (!isBlocked) {
    return <>{children}</>;
  }

  const pendingAmount = pendingInvoices?.[0]?.totalAmount || subscription?.currentPrice || 0;
  const formatCurrency = (value: number) => `KES ${value.toLocaleString('en-KE')}`;

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
                    <span className="font-semibold text-gray-900">{subscription?.planName || 'N/A'}</span>
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
                  {/* M-Pesa STK Push */}
                  <button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentMethod('mpesa');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">M-Pesa STK Push</p>
                      <p className="text-sm text-gray-500">Instant payment via prompt</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Send Money */}
                  <button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentMethod('send_money');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Send Money</p>
                      <p className="text-sm text-gray-500">Manual M-Pesa transfer</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
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
                      <p className="text-sm text-gray-500">Card, plans & billing history</p>
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
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Need help?</span><br />
                    Contact{' '}
                    <a href="mailto:support@smartduka.co.ke" className="underline font-medium">
                      support@smartduka.co.ke
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className={`p-4 text-white ${paymentMethod === 'mpesa' ? 'bg-green-600' : 'bg-orange-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {paymentMethod === 'mpesa' ? (
                    <Smartphone className="w-6 h-6" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                  <h3 className="font-semibold text-lg">
                    {paymentMethod === 'mpesa' ? 'M-Pesa Payment' : 'Send Money'}
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

            {/* Modal Content */}
            <div className="p-6">
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
              ) : paymentMethod === 'mpesa' ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Amount to Pay</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="07XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneError('');
                      }}
                      className={`w-full px-4 py-3 border rounded-lg text-lg font-medium text-center ${
                        phoneError ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                    )}
                  </div>

                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                      {paymentError}
                    </div>
                  )}

                  <button
                    onClick={handleMpesaPayment}
                    disabled={processing || !phoneNumber}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-5 h-5" />
                        Send Payment Request
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    An STK push will be sent to your phone. Enter your M-Pesa PIN to complete.
                  </p>
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
