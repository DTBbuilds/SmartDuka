'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Check, 
  Store, 
  Users, 
  Package, 
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  HeadphonesIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';

interface SubscriptionPlan {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  setupPrice: number;
  maxShops: number;
  maxEmployees: number;
  maxProducts: number;
  features: string[];
  setupIncludes: {
    siteSurvey?: boolean;
    stocktake?: boolean;
    setup?: boolean;
    training?: boolean;
    support?: boolean;
    freeMonths?: number;
    optional?: boolean;
  };
  badge?: string;
  colorTheme?: string;
  annualSavings: number;
  pricePerMonth: number;
}

// Plan color themes - high contrast for better visibility
const planColors: Record<string, { 
  gradient: string; 
  border: string; 
  button: string;
  buttonHover: string;
  badge: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  iconBg: string;
  iconColor: string;
}> = {
  blue: { 
    gradient: 'from-blue-600 to-blue-700', 
    border: 'border-blue-300',
    button: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    badge: 'bg-blue-600',
    cardBg: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  green: { 
    gradient: 'from-emerald-600 to-emerald-700', 
    border: 'border-emerald-300',
    button: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
    badge: 'bg-emerald-600',
    cardBg: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
  },
  purple: { 
    gradient: 'from-violet-600 to-violet-700', 
    border: 'border-violet-300',
    button: 'bg-violet-600',
    buttonHover: 'hover:bg-violet-700',
    badge: 'bg-violet-600',
    cardBg: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
  },
  gold: { 
    gradient: 'from-amber-500 to-orange-600', 
    border: 'border-amber-400',
    button: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    badge: 'bg-amber-600',
    cardBg: 'bg-amber-50',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    iconBg: 'bg-amber-200',
    iconColor: 'text-amber-800',
  },
};

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
        setPlans(data);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link 
                href="/register-shop" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your business. All plans include M-Pesa integration, 
            inventory management, and 24/7 support.
          </p>

          {/* Billing Toggle */}
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
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const colors = planColors[plan.colorTheme || 'blue'];
                const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                const isPopular = plan.badge === 'Popular';

                return (
                  <div
                    key={plan.code}
                    className={`relative ${colors.cardBg} rounded-2xl border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                      isPopular ? 'ring-4 ring-emerald-500 ring-offset-2 scale-105 z-10' : ''
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className={`absolute top-0 right-0 ${colors.badge} text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md`}>
                        {plan.badge}
                      </div>
                    )}

                    {/* Header */}
                    <div className={`bg-gradient-to-br ${colors.gradient} p-6`}>
                      <h3 className="text-2xl font-bold text-white drop-shadow-sm">{plan.name}</h3>
                      <p className="text-white/90 text-sm mt-1 font-medium">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-semibold text-gray-600">KES</span>
                        <span className="text-4xl font-extrabold text-gray-900">
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
                    <div className="p-6 space-y-4 border-b border-gray-200">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                          <Store className={`h-5 w-5 ${colors.iconColor}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}/Truck{plan.maxShops > 1 ? 's' : ''}</p>
                          <p className="text-sm text-gray-500">Manage locations</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                          <Users className={`h-5 w-5 ${colors.iconColor}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Up to {plan.maxEmployees} Employees</p>
                          <p className="text-sm text-gray-500">Cashiers & Staff</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-sm`}>
                          <Package className={`h-5 w-5 ${colors.iconColor}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Up to {plan.maxProducts.toLocaleString()} Products</p>
                          <p className="text-sm text-gray-500">SKUs in inventory</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="p-6 space-y-3 bg-gray-50/50">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Check className="h-3 w-3 text-emerald-600" />
                          </div>
                          <span className="text-gray-700 font-medium text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Setup Info */}
                    <div className="px-6 pb-4">
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-gray-900">
                            Setup: KES {plan.setupPrice.toLocaleString()}
                          </p>
                          {plan.setupIncludes.optional && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Optional</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          Training & Support for <span className="text-emerald-600 font-bold">{plan.setupIncludes.freeMonths} month</span>
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="p-6 pt-2">
                      <Link
                        href={`/register-shop?plan=${plan.code}`}
                        className={`flex items-center justify-center gap-2 w-full py-3.5 ${colors.button} ${colors.buttonHover} text-white rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]`}
                      >
                        Get Started
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                      <p className="text-center text-sm text-gray-500 mt-3 font-medium">
                        Buy a POS Device
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need to Run Your Business</h2>
            <p className="text-gray-600 mt-2">All plans include these powerful features</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">M-Pesa Integration</h3>
              <p className="text-gray-600 text-sm">
                Accept M-Pesa payments directly from your POS. Instant confirmation and reconciliation.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Inventory Management</h3>
              <p className="text-gray-600 text-sm">
                Track stock levels, get low stock alerts, and manage suppliers all in one place.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Sales Analytics</h3>
              <p className="text-gray-600 text-sm">
                Real-time reports and insights to help you make better business decisions.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <HeadphonesIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
              <p className="text-gray-600 text-sm">
                Our team is always ready to help you succeed. Phone, email, and chat support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">What&apos;s included in the setup price?</h3>
              <p className="text-gray-600">
                The setup price includes a site survey, initial stocktake of your products, 
                system setup and configuration, staff training, ongoing support, and 3 months 
                of free subscription.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. When upgrading, 
                you&apos;ll only pay the prorated difference. Downgrades take effect at the 
                end of your billing period.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">How do I pay for my subscription?</h3>
              <p className="text-gray-600">
                We accept M-Pesa payments for all subscriptions. You&apos;ll receive an STK push 
                to your phone when payment is due. You can also pay via bank transfer.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">What happens if I exceed my limits?</h3>
              <p className="text-gray-600">
                If you reach your plan limits (shops, employees, or products), you&apos;ll be 
                prompted to upgrade to a higher plan. Your existing data is never deleted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of Kenyan businesses using SmartDuka to grow their sales.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register-shop"
              className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Start Free Trial
            </Link>
            <a
              href="tel:+254700000000"
              className="flex items-center gap-2 px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-semibold">SmartDuka</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Contact</a>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} SmartDuka. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
