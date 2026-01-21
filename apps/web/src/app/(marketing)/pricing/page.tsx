import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  Store, 
  Users, 
  Package, 
  Phone,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  HeadphonesIcon,
} from 'lucide-react';
import { FAQJsonLd, ProductJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'SmartDuka Pricing - Affordable POS Plans for Kenya | From KES 2,500/month',
  description: 'Transparent pricing for SmartDuka POS system. Plans from KES 2,500/month with M-Pesa integration, inventory management, and 24/7 support. No hidden fees. Start free trial!',
  keywords: [
    'POS pricing Kenya',
    'affordable POS system',
    'SmartDuka price',
    'point of sale cost Kenya',
    'retail software pricing',
    'M-Pesa POS cost',
    'inventory software price',
    'cheap POS Kenya',
  ],
  openGraph: {
    title: 'SmartDuka Pricing - Affordable POS Plans | From KES 2,500/month',
    description: 'Transparent, affordable pricing for Kenya\'s best POS system. All plans include M-Pesa integration.',
    type: 'website',
    locale: 'en_KE',
  },
  alternates: {
    canonical: 'https://smartduka.co.ke/pricing',
  },
};

const plans = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Perfect for small shops',
    monthlyPrice: 2500,
    annualPrice: 25000,
    setupPrice: 5000,
    maxShops: 1,
    maxEmployees: 2,
    maxProducts: 500,
    features: [
      'Full POS System',
      'M-Pesa Integration',
      'Inventory Tracking',
      'Sales Reports',
      'Email Support',
    ],
    colorTheme: 'blue',
    annualSavings: 5000,
  },
  {
    code: 'business',
    name: 'Business',
    description: 'Growing businesses',
    monthlyPrice: 5000,
    annualPrice: 50000,
    setupPrice: 10000,
    maxShops: 2,
    maxEmployees: 5,
    maxProducts: 2000,
    features: [
      'Everything in Starter',
      'Multi-Branch Support',
      'Employee Management',
      'Advanced Analytics',
      'Priority Support',
    ],
    badge: 'Popular',
    colorTheme: 'green',
    annualSavings: 10000,
  },
  {
    code: 'professional',
    name: 'Professional',
    description: 'Multiple locations',
    monthlyPrice: 10000,
    annualPrice: 100000,
    setupPrice: 15000,
    maxShops: 5,
    maxEmployees: 15,
    maxProducts: 10000,
    features: [
      'Everything in Business',
      'Stock Transfers',
      'Customer Loyalty',
      'API Access',
      'Dedicated Support',
    ],
    colorTheme: 'purple',
    annualSavings: 20000,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Large operations',
    monthlyPrice: 15000,
    annualPrice: 150000,
    setupPrice: 25000,
    maxShops: 20,
    maxEmployees: 50,
    maxProducts: 50000,
    features: [
      'Everything in Professional',
      'Unlimited Branches',
      'Custom Integrations',
      'On-site Training',
      'SLA Guarantee',
    ],
    badge: 'Best Value',
    colorTheme: 'gold',
    annualSavings: 30000,
  },
];

const faqs = [
  {
    question: 'What\'s included in the setup price?',
    answer: 'The setup price includes a site survey, initial stocktake of your products, system setup and configuration, staff training, ongoing support, and 3 months of free subscription.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll only pay the prorated difference. Downgrades take effect at the end of your billing period.',
  },
  {
    question: 'How do I pay for my subscription?',
    answer: 'We accept M-Pesa payments for all subscriptions. You\'ll receive an STK push to your phone when payment is due. You can also pay via bank transfer.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: 'If you reach your plan limits (shops, employees, or products), you\'ll be prompted to upgrade to a higher plan. Your existing data is never deleted.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All plans come with a 14-day free trial. No credit card required. You can test all features before committing.',
  },
  {
    question: 'Do you offer discounts for annual payment?',
    answer: 'Yes! Pay annually and save up to 17% compared to monthly payments. All annual plans include additional benefits.',
  },
];

const planColors: Record<string, { 
  gradient: string; 
  border: string; 
  button: string;
  badge: string;
}> = {
  blue: { 
    gradient: 'from-blue-600 to-blue-700', 
    border: 'border-blue-300',
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-600',
  },
  green: { 
    gradient: 'from-emerald-600 to-emerald-700', 
    border: 'border-emerald-300',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'bg-emerald-600',
  },
  purple: { 
    gradient: 'from-violet-600 to-violet-700', 
    border: 'border-violet-300',
    button: 'bg-violet-600 hover:bg-violet-700',
    badge: 'bg-violet-600',
  },
  gold: { 
    gradient: 'from-amber-500 to-orange-600', 
    border: 'border-amber-400',
    button: 'bg-amber-600 hover:bg-amber-700',
    badge: 'bg-amber-600',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <FAQJsonLd faqs={faqs} />
      {plans.map((plan) => (
        <ProductJsonLd 
          key={plan.code}
          plan={{
            name: plan.name,
            description: plan.description,
            price: plan.monthlyPrice,
            priceCurrency: 'KES',
          }} 
        />
      ))}

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
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features/pos" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-blue-600 font-medium">Pricing</Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="/support" className="text-gray-600 hover:text-gray-900">Support</Link>
            </nav>
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
            inventory management, and 24/7 support. No hidden fees.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const colors = planColors[plan.colorTheme];
              const isPopular = plan.badge === 'Popular';

              return (
                <div
                  key={plan.code}
                  className={`relative bg-white rounded-2xl border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    isPopular ? 'ring-4 ring-emerald-500 ring-offset-2 scale-105 z-10' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute top-0 right-0 ${colors.badge} text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className={`bg-gradient-to-br ${colors.gradient} p-6`}>
                    <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                    <p className="text-white/90 text-sm mt-1">{plan.description}</p>
                  </div>

                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-semibold text-gray-600">KES</span>
                      <span className="text-4xl font-extrabold text-gray-900">
                        {plan.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-sm text-emerald-600 font-medium mt-2">
                      Save KES {plan.annualSavings.toLocaleString()} annually
                    </p>
                  </div>

                  <div className="p-6 space-y-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Store className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-500">Manage locations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Up to {plan.maxEmployees} Employees</p>
                        <p className="text-sm text-gray-500">Cashiers & Staff</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{plan.maxProducts.toLocaleString()} Products</p>
                        <p className="text-sm text-gray-500">SKUs in inventory</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="px-6 pb-4">
                    <div className="bg-gray-100 rounded-xl p-4">
                      <p className="font-bold text-gray-900">
                        Setup: KES {plan.setupPrice.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Includes training & 3 months free
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-2">
                    <Link
                      href={`/register-shop?plan=${plan.code}`}
                      className={`flex items-center justify-center gap-2 w-full py-3.5 ${colors.button} text-white rounded-xl font-bold transition-all`}
                    >
                      Start Free Trial
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
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
                Accept M-Pesa payments directly from your POS with instant STK push confirmation.
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
                Our team is always ready to help you succeed via phone, email, and chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
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
              href="tel:+254729983567"
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
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
              <Link href="/support" className="hover:text-white">Contact</Link>
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
