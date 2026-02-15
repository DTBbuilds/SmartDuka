'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  XCircle, 
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import { useSubscriptionEnforcement, SubscriptionAccessResult } from '@/hooks/use-subscription-enforcement';
import { useBillingHistory } from '@/hooks/use-subscription';

interface SubscriptionBlockedOverlayProps {
  onPaymentSuccess?: () => void;
}

/**
 * Full-screen overlay that blocks all shop operations when subscription is expired/suspended
 * This component should be rendered at the top level of protected routes
 */
export function SubscriptionBlockedOverlay({ onPaymentSuccess }: SubscriptionBlockedOverlayProps) {
  const { access, isBlocked, loading } = useSubscriptionEnforcement();
  const { pendingInvoices, initiatePayment } = useBillingHistory();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'info' | 'phone' | 'processing' | 'success'>('info');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Don't show if loading or not blocked
  if (loading || !isBlocked || !access) {
    return null;
  }

  const statusConfig = getStatusConfig(access.status);
  const pendingInvoice = pendingInvoices?.[0];

  const handleInitiatePayment = async () => {
    if (!pendingInvoice || !phoneNumber) return;

    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setPaymentError('Please enter a valid phone number');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentStep('processing');

    try {
      const result = await initiatePayment(pendingInvoice.id, phoneNumber);
      if (result.success) {
        setPaymentStep('success');
        setTimeout(() => {
          onPaymentSuccess?.();
        }, 3000);
      } else {
        setPaymentError(result.error || 'Payment initiation failed');
        setPaymentStep('phone');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed');
      setPaymentStep('phone');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          <div className={`p-6 rounded-full ${statusConfig.bgColor} shadow-2xl`}>
            {statusConfig.icon}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-4 ${statusConfig.headerBg}`}>
            <h1 className={`text-xl font-bold ${statusConfig.headerText}`}>
              {statusConfig.title}
            </h1>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              {access.message}
            </p>

            {/* Subscription Info */}
            {access.subscription && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="font-medium">{access.subscription.planName}</span>
                </div>
                {access.daysUntilSuspension !== undefined && access.daysUntilSuspension > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Days until suspension</span>
                    <span className="font-medium text-red-600">{access.daysUntilSuspension} days</span>
                  </div>
                )}
                {pendingInvoice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Amount Due</span>
                    <span className="font-bold text-lg">KES {pendingInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Section */}
            {access.canMakePayment && (
              <>
                {paymentStep === 'info' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setPaymentStep('phone')}
                      className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-5 w-5" />
                      Pay with M-Pesa
                    </button>
                    
                    <Link
                      href="/admin/subscription"
                      className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      View Subscription Details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}

                {paymentStep === 'phone' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        M-Pesa Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0712345678"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You will receive an M-Pesa prompt on this number
                      </p>
                    </div>

                    {paymentError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {paymentError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setPaymentStep('info')}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleInitiatePayment}
                        disabled={paymentLoading || !phoneNumber}
                        className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {paymentLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Pay Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === 'processing' && (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Check your phone for the M-Pesa prompt...
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Enter your M-Pesa PIN to complete payment
                    </p>
                  </div>
                )}

                {paymentStep === 'success' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Payment Successful!
                    </h3>
                    <p className="text-gray-600">
                      Your subscription has been reactivated. Redirecting...
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Contact Support */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center mb-3">
                Need help? Contact our support team
              </p>
              <div className="flex justify-center gap-4">
                <a
                  href="tel:0729983567"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Phone className="h-4 w-4" />
                  0729983567
                </a>
                <a
                  href="mailto:smartdukainfo@gmail.com"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* SmartDuka Branding */}
        <p className="text-center text-gray-400 text-sm mt-6">
          SmartDuka POS • Powered by Innovation
        </p>
      </div>
    </div>
  );
}

function getStatusConfig(status: string | null, isTrialExpired?: boolean) {
  // Special handling for expired trial
  if (status === 'trial' && isTrialExpired) {
    return {
      icon: <Clock className="h-12 w-12 text-orange-600" />,
      bgColor: 'bg-orange-100',
      headerBg: 'bg-orange-600',
      headerText: 'text-white',
      title: 'Trial Period Ended',
      isTrialExpired: true,
    };
  }

  switch (status) {
    case 'suspended':
      return {
        icon: <Ban className="h-12 w-12 text-red-600" />,
        bgColor: 'bg-red-100',
        headerBg: 'bg-red-600',
        headerText: 'text-white',
        title: 'Account Suspended',
      };
    case 'expired':
      return {
        icon: <Clock className="h-12 w-12 text-gray-600" />,
        bgColor: 'bg-gray-100',
        headerBg: 'bg-gray-600',
        headerText: 'text-white',
        title: 'Subscription Expired',
      };
    case 'cancelled':
      return {
        icon: <XCircle className="h-12 w-12 text-gray-600" />,
        bgColor: 'bg-gray-100',
        headerBg: 'bg-gray-600',
        headerText: 'text-white',
        title: 'Subscription Cancelled',
      };
    case 'pending_payment':
      return {
        icon: <CreditCard className="h-12 w-12 text-amber-600" />,
        bgColor: 'bg-amber-100',
        headerBg: 'bg-amber-600',
        headerText: 'text-white',
        title: 'Payment Required',
      };
    case 'trial':
      return {
        icon: <Clock className="h-12 w-12 text-orange-600" />,
        bgColor: 'bg-orange-100',
        headerBg: 'bg-orange-600',
        headerText: 'text-white',
        title: 'Trial Period Ended',
        isTrialExpired: true,
      };
    default:
      return {
        icon: <ShieldAlert className="h-12 w-12 text-red-600" />,
        bgColor: 'bg-red-100',
        headerBg: 'bg-red-600',
        headerText: 'text-white',
        title: 'Access Restricted',
      };
  }
}

/**
 * Read-only mode banner for PAST_DUE status
 * Shows when user can view data but cannot make changes
 */
export function SubscriptionReadOnlyBanner() {
  const { access, isReadOnly } = useSubscriptionEnforcement();

  if (!isReadOnly || !access) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b-2 border-amber-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <span className="font-semibold text-amber-800">Read-Only Mode: </span>
              <span className="text-amber-700">
                Your payment is overdue. You can view data but cannot make changes.
                {access.daysUntilSuspension !== undefined && access.daysUntilSuspension > 0 && (
                  <span className="font-medium"> {access.daysUntilSuspension} days until suspension.</span>
                )}
              </span>
            </div>
          </div>
          <Link
            href="/admin/subscription"
            className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Pay Now
          </Link>
        </div>
      </div>
    </div>
  );
}
