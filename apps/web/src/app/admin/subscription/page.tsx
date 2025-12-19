'use client';

import { useState, useRef } from 'react';
import { 
  useSubscription, 
  useSubscriptionPlans, 
  useBillingHistory,
  type BillingCycle,
  type SubscriptionPlan,
  type Invoice,
} from '@/hooks/use-subscription';
import { api } from '@/lib/api-client';
import { refreshEvents } from '@/lib/refresh-events';
import { StripePaymentModal } from '@/components/stripe-payment-form';
import { 
  CreditCard, 
  Check, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Users,
  Package,
  Store,
  Calendar,
  Receipt,
  ArrowUpRight,
  Loader2,
  Phone,
  X,
  Smartphone,
  Copy,
  CheckCircle,
  Building2,
  Settings,
  RefreshCw,
  Zap,
  Shield,
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bell,
  CreditCard as CardIcon,
  History,
  HelpCircle,
  ExternalLink,
  BarChart3,
  Percent,
} from 'lucide-react';

// Plan color themes - high contrast
// Default plan color for fallback
const defaultPlanColor = { bg: 'bg-white', border: 'border-gray-300', badge: 'bg-gray-600', iconBg: 'bg-gray-100', iconColor: 'text-gray-700', headerGradient: 'from-gray-600 to-gray-700' };
const planColors: Record<string, { bg: string; border: string; badge: string; iconBg: string; iconColor: string; headerGradient: string }> = {
  blue: { bg: 'bg-white', border: 'border-blue-300', badge: 'bg-blue-600', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', headerGradient: 'from-blue-600 to-blue-700' },
  green: { bg: 'bg-white', border: 'border-emerald-300', badge: 'bg-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', headerGradient: 'from-emerald-600 to-emerald-700' },
  purple: { bg: 'bg-white', border: 'border-violet-300', badge: 'bg-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-700', headerGradient: 'from-violet-600 to-violet-700' },
  gold: { bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-600', iconBg: 'bg-amber-200', iconColor: 'text-amber-800', headerGradient: 'from-amber-500 to-orange-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-500', iconBg: 'bg-gray-100', iconColor: 'text-gray-700', headerGradient: 'from-gray-500 to-gray-600' },
};

// Helper to get plan color with fallback
const getPlanColor = (theme: string | undefined) => planColors[theme || 'blue'] || defaultPlanColor;

// Status colors - high contrast with default fallback
const defaultStatusColor = { bg: 'bg-gray-100', text: 'text-gray-900', border: 'border-gray-300', icon: <Clock className="h-4 w-4" /> };
const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending_payment: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300', icon: <CreditCard className="h-4 w-4" /> },
  trial: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', icon: <Clock className="h-4 w-4" /> },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', icon: <Check className="h-4 w-4" /> },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', icon: <AlertCircle className="h-4 w-4" /> },
  suspended: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', icon: <AlertCircle className="h-4 w-4" /> },
  cancelled: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <X className="h-4 w-4" /> },
  expired: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <Clock className="h-4 w-4" /> },
};

// Helper to get status color with fallback
const getStatusColor = (status: string) => statusColors[status] || defaultStatusColor;

export default function SubscriptionPage() {
  const { subscription, loading: subLoading, changePlan, cancelSubscription, reactivateSubscription, refetch: refetchSubscription } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { invoices, pendingInvoices, loading: billingLoading, initiatePayment, getManualPaymentInstructions, confirmManualPayment, validateReceipt, checkPaymentStatus, refetch: refetchBilling } = useBillingHistory();
  
  // Refs for scrolling
  const plansRef = useRef<HTMLDivElement>(null);
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  
  // UI state for expanded sections
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [autoRenewal, setAutoRenewal] = useState(true);
  
  // Scroll to plans section
  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedInvoiceAmount, setSelectedInvoiceAmount] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Payment method: 'stk', 'manual', or 'stripe'
  const [paymentMethod, setPaymentMethod] = useState<'stk' | 'manual' | 'stripe'>('stk');
  const [manualInstructions, setManualInstructions] = useState<{
    phoneNumber?: string;
    amount?: number;
    reference?: string;
    instructions?: string[];
  } | null>(null);
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Upgrade payment step: 'confirm' or 'payment'
  const [upgradeStep, setUpgradeStep] = useState<'confirm' | 'payment'>('confirm');
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'stk' | 'manual' | 'stripe'>('stk');
  
  // Stripe payment state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [upgradePhoneNumber, setUpgradePhoneNumber] = useState('');
  const [upgradeReceiptNumber, setUpgradeReceiptNumber] = useState('');
  const [upgradeCopied, setUpgradeCopied] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const loading = subLoading || plansLoading || billingLoading;

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!subscription) return;
    
    setProcessing(true);
    try {
      await changePlan(plan.code, billingCycle);
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentModal = async (invoiceId: string, amount: number) => {
    setSelectedInvoice(invoiceId);
    setSelectedInvoiceAmount(amount);
    setShowPaymentModal(true);
    setPaymentMethod('stk');
    setPaymentSuccess(false);
    setMpesaReceiptNumber('');
    
    // Fetch manual payment instructions
    try {
      const instructions = await getManualPaymentInstructions(invoiceId);
      if (instructions.success) {
        setManualInstructions(instructions);
      }
    } catch (err) {
      console.error('Failed to get manual instructions:', err);
    }
  };

  const handleStkPayment = async () => {
    if (!selectedInvoice || !phoneNumber) return;
    
    setProcessing(true);
    try {
      const result = await initiatePayment(selectedInvoice, phoneNumber);
      if (result.success) {
        alert(result.message);
        // Keep modal open to show success or allow retry
      } else {
        alert(result.message || 'Payment failed. Please try again.');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleManualPaymentConfirm = async () => {
    if (!selectedInvoice || !mpesaReceiptNumber) return;
    
    setProcessing(true);
    try {
      const result = await confirmManualPayment(
        selectedInvoice, 
        mpesaReceiptNumber, 
        selectedInvoiceAmount
      );
      if (result.success) {
        setPaymentSuccess(true);
        // Emit refresh event to update all subscription-related components
        refreshEvents.emit('payment:completed', { type: 'manual', invoiceId: selectedInvoice });
        refetchBilling(); // Refresh invoices
        refetchSubscription(); // Refresh subscription status
      } else {
        alert(result.message || 'Failed to confirm payment');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string, isUpgrade = false) => {
    navigator.clipboard.writeText(text);
    if (isUpgrade) {
      setUpgradeCopied(true);
      setTimeout(() => setUpgradeCopied(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPhoneNumber('');
    setMpesaReceiptNumber('');
    setManualInstructions(null);
    setPaymentSuccess(false);
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    setSelectedPlan(null);
    setUpgradeStep('confirm');
    setUpgradePaymentMethod('stk');
    setUpgradePhoneNumber('');
    setUpgradeReceiptNumber('');
    setUpgradeSuccess(false);
  };

  const getUpgradePrice = () => {
    if (!selectedPlan) return 0;
    return billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  };

  const handleUpgradeStkPayment = async () => {
    if (!selectedPlan || !upgradePhoneNumber) return;
    
    setProcessing(true);
    try {
      // Create a pending upgrade payment intent WITHOUT changing the plan yet
      // The plan will only be changed after payment is confirmed via webhook
      const upgradeAmount = getUpgradePrice();
      
      // Create a temporary invoice for the upgrade payment
      const paymentResult = await api.post<{
        success: boolean;
        message: string;
        checkoutRequestId?: string;
        error?: string;
      }>('/subscriptions/payments/mpesa/initiate-upgrade', {
        phoneNumber: upgradePhoneNumber,
        planCode: selectedPlan.code,
        billingCycle,
        amount: upgradeAmount,
      });
      
      if (paymentResult.success) {
        // Show success message - plan will be upgraded after payment confirmation
        alert('M-Pesa payment prompt sent to your phone. Complete the payment to upgrade your plan.');
        // Close modal but don't mark as success yet - wait for payment confirmation
        closeUpgradeModal();
        // Refresh billing data to show pending payment
        await refetchBilling();
      } else {
        alert(paymentResult.message || paymentResult.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeManualConfirm = async () => {
    if (!selectedPlan || !upgradeReceiptNumber) return;
    
    // Validate receipt format
    const validation = await validateReceipt(upgradeReceiptNumber);
    if (!validation.valid) {
      alert(validation.message || 'Invalid receipt number');
      return;
    }
    
    setProcessing(true);
    try {
      // Confirm manual payment for upgrade WITHOUT changing plan first
      // The backend will verify the receipt and upgrade the plan if valid
      const result = await api.post<{
        success: boolean;
        message: string;
      }>('/subscriptions/payments/manual/confirm-upgrade', {
        mpesaReceiptNumber: upgradeReceiptNumber,
        planCode: selectedPlan.code,
        billingCycle,
        amount: getUpgradePrice(),
      });
      
      if (result.success) {
        setUpgradeSuccess(true);
        // Emit refresh event to update all subscription-related components
        refreshEvents.emit('payment:completed', { type: 'manual' });
        // Refresh both subscription and billing data
        await Promise.all([refetchSubscription(), refetchBilling()]);
      } else {
        alert(result.message || 'Failed to confirm payment');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to confirm manual payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header - High Contrast */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <CreditCard className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Subscription & Billing</h1>
            <p className="text-blue-100 mt-1">Manage your SmartDuka subscription, plans, and payment history</p>
          </div>
        </div>
      </div>

      {/* Subscription Status Alerts */}
      {subscription?.status === 'suspended' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 text-lg">Subscription Suspended</h3>
              <p className="text-red-700 mt-1">
                Your subscription has been suspended due to non-payment. Your shop access is limited until payment is made.
              </p>
              <p className="text-red-600 text-sm mt-2">
                Please pay your outstanding invoice to restore full access to SmartDuka.
              </p>
              {pendingInvoices.length > 0 && (
                <button
                  onClick={() => openPaymentModal(pendingInvoices[0]?.id, pendingInvoices[0]?.totalAmount)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Pay KES {pendingInvoices[0]?.totalAmount?.toLocaleString()} Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {subscription?.status === 'expired' && (
        <div className="bg-gray-100 border-2 border-gray-400 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-200 rounded-full">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg">Subscription Expired</h3>
              <p className="text-gray-700 mt-1">
                Your subscription has expired. Renew now to continue using SmartDuka and access your shop data.
              </p>
              <button
                onClick={() => reactivateSubscription()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Renew Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {subscription?.status === 'past_due' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-lg">Payment Overdue</h3>
              <p className="text-amber-700 mt-1">
                Your subscription payment is overdue. Please pay within the grace period to avoid service interruption.
              </p>
              {pendingInvoices.length > 0 && (
                <button
                  onClick={() => openPaymentModal(pendingInvoices[0]?.id, pendingInvoices[0]?.totalAmount)}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  Pay KES {pendingInvoices[0]?.totalAmount?.toLocaleString()} Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {subscription?.status === 'cancelled' && (
        <div className="bg-gray-100 border-2 border-gray-400 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-200 rounded-full">
              <X className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg">Subscription Cancelled</h3>
              <p className="text-gray-700 mt-1">
                Your subscription has been cancelled. Reactivate to continue using SmartDuka.
              </p>
              <button
                onClick={() => reactivateSubscription()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Reactivate Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription Card - Enhanced */}
      {subscription && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Header with gradient based on plan */}
          <div className={`bg-gradient-to-r ${getPlanColor(subscription.planCode === 'trial' ? 'gray' : 'blue').headerGradient} px-6 py-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{subscription.planName} Plan</h2>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm`}>
                    {getStatusColor(subscription.status).icon}
                    {subscription.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-white/80 mt-1">
                  {subscription.planCode === 'trial' ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      Free Forever (Limited Features)
                    </span>
                  ) : (
                    <>
                      {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing • 
                      KES {subscription.currentPrice.toLocaleString()}/{subscription.billingCycle === 'annual' ? 'year' : 'month'}
                    </>
                  )}
                </p>
              </div>
              <div className="text-right text-white">
                <p className="text-sm text-white/70">Current Period Ends</p>
                <p className="font-semibold">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-sm text-white/80 flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {subscription.daysRemaining} days remaining
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Store className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{subscription.usage.shops.current}/{subscription.usage.shops.limit}</p>
                <p className="text-xs text-blue-600">Shops</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{subscription.usage.employees.current}/{subscription.usage.employees.limit}</p>
                <p className="text-xs text-green-600">Employees</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Package className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-700">{subscription.usage.products.current}/{subscription.usage.products.limit}</p>
                <p className="text-xs text-purple-600">Products</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{invoices.filter(i => i.status === 'paid').length}</p>
                <p className="text-xs text-amber-600">Payments Made</p>
              </div>
            </div>

            {/* Usage Progress Bars */}
            <div className="space-y-3 mb-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 flex items-center gap-1"><Store className="h-3 w-3" /> Shops/Branches</span>
                  <span className="font-medium">{Math.round((subscription.usage.shops.current / subscription.usage.shops.limit) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${subscription.usage.shops.current / subscription.usage.shops.limit > 0.9 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((subscription.usage.shops.current / subscription.usage.shops.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 flex items-center gap-1"><Users className="h-3 w-3" /> Employees</span>
                  <span className="font-medium">{Math.round((subscription.usage.employees.current / subscription.usage.employees.limit) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${subscription.usage.employees.current / subscription.usage.employees.limit > 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((subscription.usage.employees.current / subscription.usage.employees.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 flex items-center gap-1"><Package className="h-3 w-3" /> Products</span>
                  <span className="font-medium">{Math.round((subscription.usage.products.current / subscription.usage.products.limit) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${subscription.usage.products.current / subscription.usage.products.limit > 0.9 ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min((subscription.usage.products.current / subscription.usage.products.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Expandable Subscription Details */}
            <button
              onClick={() => setShowSubscriptionDetails(!showSubscriptionDetails)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-4"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Info className="h-4 w-4" />
                Subscription Details
              </span>
              {showSubscriptionDetails ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            </button>

            {showSubscriptionDetails && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Plan Code</span>
                    <span className="font-mono text-sm font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">{subscription.planCode}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Billing Cycle</span>
                    <span className="font-bold text-sm text-gray-900">{subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Current Price</span>
                    <span className="font-bold text-sm text-gray-900">
                      {subscription.planCode === 'trial' ? 'FREE' : `KES ${subscription.currentPrice.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Period Start</span>
                    <span className="font-bold text-sm text-gray-900">{new Date(subscription.currentPeriodStart).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Period End</span>
                    <span className="font-bold text-sm text-gray-900">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm font-semibold text-gray-800">Days Remaining</span>
                    <span className={`font-bold text-sm ${subscription.daysRemaining <= 7 ? 'text-red-700' : 'text-green-700'}`}>
                      {subscription.daysRemaining} days
                    </span>
                  </div>
                </div>

                {/* Auto-Renewal Toggle */}
                {subscription.planCode !== 'trial' && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Auto-Renewal</p>
                          <p className="text-xs text-gray-500">Automatically renew when period ends</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoRenewal(!autoRenewal)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRenewal ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRenewal ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick Actions
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={scrollToPlans}
                  className="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                >
                  <TrendingUp className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-blue-700">Upgrade</span>
                </button>
                <button
                  onClick={() => refetchBilling()}
                  className="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                >
                  <History className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-green-700">Billing</span>
                </button>
                <button
                  onClick={() => setShowSubscriptionDetails(true)}
                  className="flex flex-col items-center gap-1 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                >
                  <Settings className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-purple-700">Settings</span>
                </button>
                <button
                  onClick={() => window.open('mailto:support@smartduka.co.ke?subject=Subscription Support', '_blank')}
                  className="flex flex-col items-center gap-1 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
                >
                  <HelpCircle className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-amber-700">Support</span>
                </button>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
              <button
                onClick={scrollToPlans}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <TrendingUp className="h-4 w-4" />
                {subscription.planCode === 'trial' ? 'Upgrade from Trial' : 'Change Plan'}
              </button>
              {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                <button
                  onClick={() => reactivateSubscription()}
                  className="flex items-center gap-2 px-5 py-2.5 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reactivate Subscription
                </button>
              ) : subscription.planCode !== 'trial' ? (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription? You will be downgraded to the free Trial plan.')) {
                      cancelSubscription('User requested cancellation');
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel Subscription
                </button>
              ) : null}
              <button
                onClick={() => refetchSubscription()}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Upgrade Prompt for Trial Users */}
            {subscription.planCode === 'trial' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Unlock Full Features</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      You&apos;re on the free Trial plan with limited features. Upgrade to get more shops, employees, products, and premium features!
                    </p>
                    <button
                      onClick={scrollToPlans}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View upgrade options <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Near Limit Warning */}
            {(subscription.usage.shops.current / subscription.usage.shops.limit > 0.8 ||
              subscription.usage.employees.current / subscription.usage.employees.limit > 0.8 ||
              subscription.usage.products.current / subscription.usage.products.limit > 0.8) && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Approaching Usage Limits</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      You&apos;re using over 80% of your plan limits. Consider upgrading to avoid interruptions.
                    </p>
                    <button
                      onClick={scrollToPlans}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
                    >
                      Upgrade now <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Payment Banner - Show when subscription is pending payment */}
      {subscription?.status === 'pending_payment' && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 text-lg">Complete Your Setup Payment</h3>
              <p className="text-orange-800 mt-1">
                Your subscription is pending activation. Please complete the setup payment to start using SmartDuka POS.
              </p>
              {pendingInvoices.length > 0 && (
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-2xl font-bold text-orange-900">
                    KES {pendingInvoices[0]?.totalAmount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => openPaymentModal(pendingInvoices[0]?.id, pendingInvoices[0]?.totalAmount)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Invoices Alert - Show for other pending invoices */}
      {pendingInvoices.length > 0 && subscription?.status !== 'pending_payment' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Payment Required</h3>
              <p className="text-yellow-700 text-sm mt-1">
                You have {pendingInvoices.length} pending invoice(s) totaling KES{' '}
                {pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
              </p>
              <button
                onClick={() => openPaymentModal(pendingInvoices[0]?.id, pendingInvoices[0]?.totalAmount)}
                className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                Pay Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800">
        <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Billing History</h2>
          <button 
            onClick={() => refetchBilling()}
            className="text-sm text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="divide-y dark:divide-slate-800">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-gray-500 dark:text-slate-400 font-medium">No billing history yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                {subscription?.status === 'trial' 
                  ? `You're on a free trial until ${subscription.trialEndDate ? new Date(subscription.trialEndDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : 'the trial ends'}. Invoices will appear when you make payments.`
                  : 'Invoices will appear here when you make payments or upgrade your plan'
                }
              </p>
            </div>
          ) : (
            invoices.map((invoice) => {
              const isPending = invoice.status === 'pending';
              const isPendingVerification = invoice.status === 'pending_verification';
              const isPaid = invoice.status === 'paid';
              const isFailed = invoice.status === 'failed';
              
              return (
              <div key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      isPaid ? 'bg-green-100 dark:bg-green-900/30' : 
                      isPendingVerification ? 'bg-blue-100 dark:bg-blue-900/30' :
                      isPending ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <Receipt className={`h-5 w-5 ${
                        isPaid ? 'text-green-600 dark:text-green-400' : 
                        isPendingVerification ? 'text-blue-600 dark:text-blue-400' :
                        isPending ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.description}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {invoice.invoiceNumber} • {new Date(invoice.createdAt).toLocaleDateString('en-KE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      {/* Pending Verification Notice */}
                      {isPendingVerification && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                            <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Awaiting verification
                          </span>
                          {invoice.mpesaReceiptNumber && (
                            <span className="font-mono text-gray-500">
                              Ref: {invoice.mpesaReceiptNumber}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Payment Details */}
                      {isPaid && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          {/* M-Pesa Receipt */}
                          {(invoice.mpesaReceiptNumber || invoice.paymentReference) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-mono">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {invoice.mpesaReceiptNumber || invoice.paymentReference}
                            </span>
                          )}
                          {/* Payment Method */}
                          <span className="text-gray-500 dark:text-slate-400">
                            via {invoice.paymentMethod === 'mpesa_stk' ? 'M-Pesa STK' : 
                                 invoice.paymentMethod === 'mpesa_manual' ? 'M-Pesa' : 
                                 invoice.paymentMethod || 'M-Pesa'}
                          </span>
                          {/* Payment Date */}
                          {invoice.paidAt && (
                            <span className="text-gray-400 dark:text-slate-500">
                              • {new Date(invoice.paidAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      KES {invoice.totalAmount.toLocaleString()}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border mt-1 ${
                      isPaid ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 
                      isPendingVerification ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                      isPending ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 
                      'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                    }`}>
                      {isPendingVerification ? 'VERIFYING' : invoice.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div ref={plansRef} className="bg-white rounded-xl shadow-sm border p-6 scroll-mt-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Choose Your Plan
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select the plan that best fits your business needs. Upgrade or downgrade anytime.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Annual (Save 17%)
            </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const colors = getPlanColor(plan.colorTheme);
            const isCurrentPlan = subscription?.planCode === plan.code;
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.code}
                className={`relative rounded-xl border-2 overflow-hidden shadow-md hover:shadow-lg transition-all ${colors.border} ${colors.bg} ${
                  isCurrentPlan ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                {/* Header with gradient */}
                <div className={`bg-gradient-to-br ${colors.headerGradient} px-5 py-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-2.5 py-1 text-xs font-bold text-white bg-white/20 rounded-full backdrop-blur-sm">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {isCurrentPlan && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-bold text-white bg-white/30 rounded-full">
                      Current Plan
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                  {plan.code === 'trial' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">FREE</span>
                        <Sparkles className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Forever (Limited Features)</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-600">KES</span>
                        <span className="text-3xl font-extrabold text-gray-900">{price.toLocaleString()}</span>
                        <span className="text-gray-600 font-medium">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                      </div>
                      {billingCycle === 'annual' && plan.annualSavings > 0 && (
                        <p className="text-sm text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Save KES {plan.annualSavings.toLocaleString()}/year
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Limits */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                      <Store className={`h-4 w-4 ${colors.iconColor}`} />
                    </div>
                    <span className="font-semibold text-gray-900">{plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                      <Users className={`h-4 w-4 ${colors.iconColor}`} />
                    </div>
                    <span className="font-semibold text-gray-900">{plan.maxEmployees} Employee{plan.maxEmployees > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                      <Package className={`h-4 w-4 ${colors.iconColor}`} />
                    </div>
                    <span className="font-semibold text-gray-900">{plan.maxProducts.toLocaleString()} Products</span>
                  </div>
                </div>

                {/* Setup Info - Hide for trial plan */}
                {plan.code !== 'trial' && (
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Setup: KES {plan.setupPrice.toLocaleString()}</p>
                      {plan.setupIncludes?.optional && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Optional</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Training & Support for <span className="text-emerald-600 font-semibold">{plan.setupIncludes?.freeMonths || 1} month</span>
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="px-5 pb-5 pt-3">
                  <button
                    onClick={() => {
                      if (plan.code === 'trial') {
                        // Trial plan doesn't need payment - just select it
                        setSelectedPlan(plan);
                        setShowUpgradeModal(true);
                      } else {
                        setSelectedPlan(plan);
                        setShowUpgradeModal(true);
                      }
                    }}
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                      isCurrentPlan
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : plan.code === 'trial'
                        ? 'bg-gray-600 text-white hover:bg-gray-700 hover:shadow-md'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                    }`}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center justify-center gap-1">
                        <Check className="h-4 w-4" />
                        Current Plan
                      </span>
                    ) : plan.code === 'trial' ? (
                      'Start Free'
                    ) : subscription?.planCode === 'trial' ? (
                      'Upgrade Now'
                    ) : (
                      'Select Plan'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Modal with Payment */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">
                    {upgradeStep === 'confirm' ? `Upgrade to ${selectedPlan.name}` : 'Complete Payment'}
                  </h3>
                </div>
                <button onClick={closeUpgradeModal} className="p-1 hover:bg-white/20 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Amount: <span className="font-bold text-white">KES {getUpgradePrice().toLocaleString()}</span>
                <span className="text-blue-200">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
              </p>
            </div>

            {upgradeSuccess ? (
              /* Success State */
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900">Upgrade Successful!</h4>
                <p className="text-gray-600 mt-2">
                  You are now on the <strong>{selectedPlan.name}</strong> plan. Enjoy your new features!
                </p>
                <button
                  onClick={closeUpgradeModal}
                  className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Done
                </button>
              </div>
            ) : upgradeStep === 'confirm' ? (
              /* Step 1: Confirm Plan Details */
              <div className="p-4">
                {/* Warning if downgrading and exceeding limits */}
                {subscription && selectedPlan.maxProducts < subscription.usage.products.current && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-800">Product Limit Exceeded</h4>
                        <p className="text-sm text-red-700 mt-1">
                          You currently have <strong>{subscription.usage.products.current}</strong> products, 
                          but the <strong>{selectedPlan.name}</strong> plan only supports <strong>{selectedPlan.maxProducts}</strong> products.
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          You will need to remove <strong>{subscription.usage.products.current - selectedPlan.maxProducts}</strong> products 
                          before switching to this plan, or some features may be restricted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {subscription && selectedPlan.maxEmployees < subscription.usage.employees.current && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-800">Employee Limit Exceeded</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          You currently have <strong>{subscription.usage.employees.current}</strong> employees, 
                          but the <strong>{selectedPlan.name}</strong> plan only supports <strong>{selectedPlan.maxEmployees}</strong> employees.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-800 mb-2">What you&apos;ll get:</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{selectedPlan.maxShops} Shop(s)/Truck(s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Up to {selectedPlan.maxEmployees} Employee{selectedPlan.maxEmployees > 1 ? 's' : ''}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Up to {selectedPlan.maxProducts.toLocaleString()} Products</span>
                    </li>
                  </ul>
                </div>

                {selectedPlan.features && selectedPlan.features.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Features included:</h4>
                    <ul className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                      {selectedPlan.features.slice(0, 6).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeUpgradeModal}
                    className="flex-1 py-2.5 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  {/* For trial plan (free), no payment needed */}
                  {selectedPlan.code === 'trial' ? (
                    <button
                      onClick={async () => {
                        if (subscription && subscription.usage.products.current > selectedPlan.maxProducts) {
                          if (!confirm(`Warning: You have ${subscription.usage.products.current} products but the Trial plan only supports ${selectedPlan.maxProducts}. Some products may become inaccessible. Continue?`)) {
                            return;
                          }
                        }
                        await handleUpgrade(selectedPlan);
                      }}
                      disabled={processing}
                      className="flex-1 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Switch to Free Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpgradeStep('payment')}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Proceed to Pay
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Payment Options */
              <div className="p-4">
                {/* Payment Method Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setUpgradePaymentMethod('stk')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      upgradePaymentMethod === 'stk'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    M-Pesa
                  </button>
                  <button
                    onClick={() => setUpgradePaymentMethod('stripe')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      upgradePaymentMethod === 'stripe'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Card/Bank
                  </button>
                  <button
                    onClick={() => setUpgradePaymentMethod('manual')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      upgradePaymentMethod === 'manual'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    Manual
                  </button>
                </div>

                {upgradePaymentMethod === 'stk' ? (
                  /* STK Push Method */
                  <div>
                    <p className="text-gray-600 text-sm mb-4">
                      Enter your M-Pesa number to receive a payment prompt on your phone.
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={upgradePhoneNumber}
                          onChange={(e) => setUpgradePhoneNumber(e.target.value)}
                          placeholder="0729983567"
                          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleUpgradeStkPayment}
                      disabled={processing || !upgradePhoneNumber}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Smartphone className="h-5 w-5" />
                          Pay KES {getUpgradePrice().toLocaleString()}
                        </>
                      )}
                    </button>
                  </div>
                ) : upgradePaymentMethod === 'stripe' ? (
                  /* Stripe Card/Bank Method */
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Pay with Card or Bank</h4>
                      <p className="text-sm text-blue-700">
                        Secure payment powered by Stripe. Supports Visa, Mastercard, and bank transfers.
                      </p>
                    </div>
                    
                    <div className="text-center py-6">
                      <p className="text-gray-600 mb-4">
                        Amount: <strong className="text-xl">KES {getUpgradePrice().toLocaleString()}</strong>
                      </p>
                      <button
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            // Get Stripe config
                            const configRes = await api.get<{ publishableKey: string; isConfigured: boolean }>('/stripe/config');
                            if (!configRes?.isConfigured || !configRes.publishableKey) {
                              alert('Stripe payments are not configured. Please use M-Pesa.');
                              return;
                            }
                            setStripePublishableKey(configRes.publishableKey);
                            
                            // Create Stripe payment intent for the upgrade amount
                            // DO NOT change plan yet - only after successful payment
                            if (selectedPlan) {
                              const upgradeAmount = getUpgradePrice();
                              
                              // Create payment intent directly without changing plan
                              const paymentRes = await api.post<{ success: boolean; clientSecret: string; paymentIntentId: string }>('/stripe/subscription/create-payment', {
                                invoiceId: `pending-upgrade-${Date.now()}`, // Temporary ID for pending upgrade
                                invoiceNumber: `UPGRADE-${selectedPlan.code.toUpperCase()}-${Date.now()}`,
                                amount: upgradeAmount * 100, // Convert to cents
                                currency: 'kes',
                                description: `Subscription upgrade to ${selectedPlan.name} (${billingCycle})`,
                              });
                              
                              if (paymentRes?.success && paymentRes.clientSecret) {
                                setStripeClientSecret(paymentRes.clientSecret);
                              } else {
                                alert('Failed to create payment. Please try again.');
                              }
                            }
                          } catch (error: any) {
                            alert(error.message || 'Failed to initialize payment');
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                      >
                        {processing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Pay with Card/Bank
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-xs text-center text-gray-500 mt-4">
                      🔒 Secured by Stripe. Your payment info is encrypted.
                    </p>
                  </div>
                ) : (
                  /* Manual Send Money Method */
                  <div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-amber-800 mb-2">Send Money To:</h4>
                      <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">0729983567</p>
                          <p className="text-sm text-gray-500">SmartDuka</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard('0729983567', true)}
                          className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200"
                        >
                          {upgradeCopied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-amber-700" />}
                        </button>
                      </div>
                      <p className="text-sm text-amber-700 mt-2">
                        Amount: <strong>KES {getUpgradePrice().toLocaleString()}</strong>
                      </p>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Instructions:</h4>
                      <ol className="text-sm text-gray-600 space-y-1">
                        <li className="flex gap-2">
                          <span className="text-green-600 font-medium">1.</span>
                          Open M-Pesa on your phone
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-600 font-medium">2.</span>
                          Select &quot;Send Money&quot;
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-600 font-medium">3.</span>
                          Enter number: 0729983567
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-600 font-medium">4.</span>
                          Enter amount: KES {getUpgradePrice().toLocaleString()}
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-600 font-medium">5.</span>
                          Enter your M-Pesa PIN and confirm
                        </li>
                      </ol>
                    </div>

                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        M-Pesa Receipt Code
                      </label>
                      <input
                        type="text"
                        value={upgradeReceiptNumber}
                        onChange={(e) => setUpgradeReceiptNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. RKL2ABCD5E"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                        maxLength={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the 10-character code from your M-Pesa confirmation message
                      </p>
                    </div>

                    <button
                      onClick={handleUpgradeManualConfirm}
                      disabled={processing || upgradeReceiptNumber.length !== 10}
                      className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Confirm Payment
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={closeUpgradeModal}
                    className="flex-1 py-2.5 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setUpgradeStep('confirm')}
                    className="flex-1 py-2.5 border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">Pay with M-Pesa</h3>
                </div>
                <button onClick={closePaymentModal} className="p-1 hover:bg-white/20 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-green-100 text-sm mt-1">
                Amount: <span className="font-bold text-white">KES {selectedInvoiceAmount.toLocaleString()}</span>
              </p>
            </div>

            {paymentSuccess ? (
              /* Success State */
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900">Payment Confirmed!</h4>
                <p className="text-gray-600 mt-2">
                  Your payment has been received. Your subscription will be activated shortly.
                </p>
                <button
                  onClick={closePaymentModal}
                  className="mt-6 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-4">
                {/* Payment Method Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setPaymentMethod('stk')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      paymentMethod === 'stk'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    STK Push
                  </button>
                  <button
                    onClick={() => setPaymentMethod('manual')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      paymentMethod === 'manual'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    Send Money
                  </button>
                </div>

                {paymentMethod === 'stk' ? (
                  /* STK Push Method */
                  <div>
                    <p className="text-gray-600 text-sm mb-4">
                      Enter your M-Pesa number to receive a payment prompt on your phone.
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0729983567"
                          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleStkPayment}
                      disabled={processing || !phoneNumber}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Smartphone className="h-5 w-5" />
                          Send Payment Request
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Manual Send Money Method */
                  <div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-amber-800 mb-2">Send Money To:</h4>
                      <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">0729983567</p>
                          <p className="text-sm text-gray-500">SmartDuka</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard('0729983567')}
                          className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200"
                        >
                          {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-amber-700" />}
                        </button>
                      </div>
                    </div>

                    {manualInstructions?.instructions && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">Instructions:</h4>
                        <ol className="text-sm text-gray-600 space-y-1">
                          {manualInstructions.instructions.slice(0, 6).map((step, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-green-600 font-medium">{i + 1}.</span>
                              {step.replace(/^\d+\.\s*/, '')}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        M-Pesa Receipt Code
                      </label>
                      <input
                        type="text"
                        value={mpesaReceiptNumber}
                        onChange={(e) => setMpesaReceiptNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. RKL2ABCD5E"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                        maxLength={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the 10-character code from your M-Pesa confirmation message
                      </p>
                    </div>

                    <button
                      onClick={handleManualPaymentConfirm}
                      disabled={processing || mpesaReceiptNumber.length !== 10}
                      className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Confirm Payment
                        </>
                      )}
                    </button>
                  </div>
                )}

                <button
                  onClick={closePaymentModal}
                  className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={!!stripeClientSecret}
        clientSecret={stripeClientSecret}
        amount={selectedPlan ? getUpgradePrice() * 100 : selectedInvoiceAmount * 100}
        currency="kes"
        publishableKey={stripePublishableKey}
        title="Complete Payment"
        description={selectedPlan ? `Upgrade to ${selectedPlan.name}` : 'Subscription Payment'}
        onSuccess={async (paymentIntentId) => {
          setStripeClientSecret(null);
          
          // NOW change the plan after successful payment
          if (selectedPlan) {
            try {
              await changePlan(selectedPlan.code, billingCycle);
              setUpgradeSuccess(true);
              refreshEvents.emit('payment:completed', { type: 'stripe', paymentIntentId });
              await Promise.all([refetchSubscription(), refetchBilling()]);
            } catch (error: any) {
              // Payment succeeded but plan change failed - this is a critical error
              alert(`Payment successful but plan change failed: ${error.message}. Please contact support.`);
              await Promise.all([refetchSubscription(), refetchBilling()]);
            }
          } else {
            // Regular invoice payment (not upgrade)
            setUpgradeSuccess(true);
            refreshEvents.emit('payment:completed', { type: 'stripe', paymentIntentId });
            await Promise.all([refetchSubscription(), refetchBilling()]);
          }
        }}
        onClose={() => {
          setStripeClientSecret(null);
        }}
        onError={(error) => {
          alert(`Payment failed: ${error}`);
        }}
      />
    </div>
  );
}
