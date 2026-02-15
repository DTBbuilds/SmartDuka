'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, 
  Store, 
  Users, 
  Package, 
  ArrowRight,
  Crown,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSubscription, useSubscriptionPlans, type BillingCycle } from '@/hooks/use-subscription';

// Plan color themes - high contrast
const planColors: Record<string, { 
  gradient: string; 
  border: string; 
  button: string;
  buttonHover: string;
  badge: string;
  ring: string;
  iconBg: string;
  iconColor: string;
  cardBg: string;
}> = {
  blue: { 
    gradient: 'from-blue-600 to-blue-700', 
    border: 'border-blue-300',
    button: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    badge: 'bg-blue-600',
    ring: 'ring-blue-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    cardBg: 'bg-white',
  },
  green: { 
    gradient: 'from-emerald-600 to-emerald-700', 
    border: 'border-emerald-300',
    button: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
    badge: 'bg-emerald-600',
    ring: 'ring-emerald-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    cardBg: 'bg-white',
  },
  purple: { 
    gradient: 'from-violet-600 to-violet-700', 
    border: 'border-violet-300',
    button: 'bg-violet-600',
    buttonHover: 'hover:bg-violet-700',
    badge: 'bg-violet-600',
    ring: 'ring-violet-500',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    cardBg: 'bg-white',
  },
  gold: { 
    gradient: 'from-amber-500 to-orange-600', 
    border: 'border-amber-400',
    button: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    badge: 'bg-amber-600',
    ring: 'ring-amber-500',
    iconBg: 'bg-amber-200',
    iconColor: 'text-amber-800',
    cardBg: 'bg-amber-50',
  },
};

export default function SelectPlanPage() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const { subscription, createSubscription } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Redirect if already has subscription
  useEffect(() => {
    if (subscription) {
      router.push('/admin/dashboard');
    }
  }, [subscription, router]);

  const handleSelectPlan = async () => {
    if (!selectedPlanCode || !token) return;
    
    setProcessing(true);
    setError('');
    
    try {
      await createSubscription(selectedPlanCode, billingCycle);
      // Redirect to dashboard after successful subscription
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription');
    } finally {
      setProcessing(false);
    }
  };

  if (!user || plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </div>
            <div className="text-sm text-gray-600">
              Welcome, {shop?.name || user.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-medium">
              <Check className="h-5 w-5" />
            </div>
            <span className="text-sm text-gray-600">Shop Created</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300 mx-2" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium">
              2
            </div>
            <span className="text-sm font-medium text-gray-900">Select Plan</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300 mx-2" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">
              3
            </div>
            <span className="text-sm text-gray-500">Get Started</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <Crown className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select the plan that best fits your business needs. All plans include a 3-month free trial 
            with setup, training, and support.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'annual' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const colors = planColors[plan.colorTheme || 'blue'] || planColors['blue'];
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isSelected = selectedPlanCode === plan.code;
            const isPopular = plan.badge === 'Popular';

            return (
              <div
                key={plan.code}
                onClick={() => setSelectedPlanCode(plan.code)}
                className={`relative ${colors.cardBg} rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden shadow-lg hover:shadow-xl ${
                  isSelected 
                    ? `${colors.border} ring-4 ${colors.ring} ring-offset-2 scale-[1.02]` 
                    : `${colors.border} hover:scale-[1.01]`
                } ${isPopular ? 'lg:scale-105 z-10' : ''}`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={`absolute top-0 right-0 ${colors.badge} text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md`}>
                    {plan.badge}
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className={`absolute top-4 left-4 w-7 h-7 rounded-full ${colors.badge} flex items-center justify-center shadow-md`}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Header */}
                <div className={`bg-gradient-to-br ${colors.gradient} p-5`}>
                  <h3 className="text-xl font-bold text-white drop-shadow-sm">{plan.name}</h3>
                  <p className="text-white/90 text-sm mt-1 font-medium">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="p-5 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-semibold text-gray-600">KES</span>
                    <span className="text-3xl font-extrabold text-gray-900">
                      {price.toLocaleString()}
                    </span>
                    <span className="text-gray-600 font-medium">
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-emerald-600 font-semibold mt-2">
                      Save KES {plan.annualSavings.toLocaleString()}/year
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                      <Store className={`h-5 w-5 ${colors.iconColor}`} />
                    </div>
                    <p className="font-bold text-gray-900">{plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}/Truck{plan.maxShops > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                      <Users className={`h-5 w-5 ${colors.iconColor}`} />
                    </div>
                    <p className="font-bold text-gray-900">Up to {plan.maxEmployees} Employees</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                      <Package className={`h-5 w-5 ${colors.iconColor}`} />
                    </div>
                    <p className="font-bold text-gray-900">Up to {plan.maxProducts.toLocaleString()} Products</p>
                  </div>
                </div>

                {/* Setup Info */}
                <div className="px-5 pb-5">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold text-gray-900">
                        Setup: KES {plan.setupPrice.toLocaleString()}
                      </p>
                      {plan.setupIncludes.optional && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Optional</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Training & Support for <span className="text-emerald-600 font-bold">{plan.setupIncludes.freeMonths} month</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleSelectPlan}
            disabled={!selectedPlanCode || processing}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
              selectedPlanCode && !processing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue with {selectedPlanCode ? plans.find(p => p.code === selectedPlanCode)?.name : 'Selected'} Plan
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now (limited features)
          </button>
        </div>

        {/* Features Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include: M-Pesa Integration • Inventory Management • Sales Reports • 24/7 Support
          </p>
        </div>
      </main>
    </div>
  );
}
