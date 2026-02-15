import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  Smartphone,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  RefreshCcw,
  Receipt,
  Bell,
  BarChart3,
  Users,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'M-Pesa POS Integration Kenya - Accept Mobile Payments | SmartDuka',
  description: 'Accept M-Pesa payments in your POS system with STK push. Instant payment confirmation, automatic reconciliation, and detailed transaction reports for Kenyan businesses.',
  keywords: [
    'M-Pesa POS integration',
    'M-Pesa payment system Kenya',
    'mobile money POS',
    'STK push integration',
    'M-Pesa for retail',
    'accept M-Pesa payments',
    'M-Pesa till number',
    'Lipa na M-Pesa',
  ],
  openGraph: {
    title: 'M-Pesa POS Integration Kenya | SmartDuka',
    description: 'Accept M-Pesa payments with instant STK push confirmation. Built for Kenyan retailers.',
    type: 'website',
    locale: 'en_KE',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/features/mpesa',
  },
};

const mpesaFeatures = [
  {
    icon: Zap,
    title: 'STK Push Technology',
    description: 'Customer receives payment prompt on their phone. No need to dial *334# or enter till numbers.',
  },
  {
    icon: Clock,
    title: 'Instant Confirmation',
    description: 'Payment status updates in real-time. Know immediately if payment succeeded or failed.',
  },
  {
    icon: RefreshCcw,
    title: 'Automatic Reconciliation',
    description: 'All M-Pesa payments automatically matched with sales. No manual reconciliation needed.',
  },
  {
    icon: Receipt,
    title: 'Transaction Receipts',
    description: 'Complete transaction details including M-Pesa confirmation code on every receipt.',
  },
  {
    icon: Bell,
    title: 'Payment Notifications',
    description: 'Get notified of every successful payment. Track payments from anywhere.',
  },
  {
    icon: BarChart3,
    title: 'M-Pesa Reports',
    description: 'Detailed reports on all M-Pesa transactions. Daily summaries and trend analysis.',
  },
  {
    icon: Users,
    title: 'Customer History',
    description: 'Track customer payment history. Build loyalty with repeat customers.',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Fully compliant with Safaricom M-Pesa requirements. Bank-grade security.',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Customer Checks Out',
    description: 'Add products to cart and proceed to payment. Select M-Pesa as payment method.',
  },
  {
    step: 2,
    title: 'Enter Phone Number',
    description: 'Enter customer\'s M-Pesa registered phone number. SmartDuka initiates STK push.',
  },
  {
    step: 3,
    title: 'Customer Confirms',
    description: 'Customer receives prompt on their phone and enters M-Pesa PIN to confirm.',
  },
  {
    step: 4,
    title: 'Instant Confirmation',
    description: 'Payment confirmed instantly in SmartDuka. Print receipt and complete sale.',
  },
];

export default function MpesaFeaturePage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: 'https://www.smartduka.org' },
          { name: 'Features', url: 'https://www.smartduka.org/features' },
          { name: 'M-Pesa Integration', url: 'https://www.smartduka.org/features/mpesa' },
        ]} 
      />

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features/pos" className="text-blue-600 font-medium">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="/support" className="text-gray-600 hover:text-gray-900">Support</Link>
            </nav>
            
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">Login</Link>
              <Link 
                href="/register-shop" 
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-sm font-medium mb-6">
                <Smartphone className="h-4 w-4" />
                M-Pesa Integration
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Accept <span className="text-green-200">M-Pesa Payments</span> Instantly
              </h1>
              
              <p className="text-xl text-green-100 mb-8">
                Seamless M-Pesa integration with STK push technology. Your customers 
                pay directly from their phones with instant confirmation in your POS.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link 
                  href="/register-shop" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link 
                  href="/pricing" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
                >
                  View Pricing
                </Link>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Safaricom Approved
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  No Extra Fees
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">M-Pesa Payment</h3>
                  <p className="text-gray-500 text-sm">Amount: KES 2,500</p>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">STK Push sent</span>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Customer confirmed PIN</span>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg flex items-center gap-3 border-2 border-green-500">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-bold">Payment Successful!</span>
                  </div>
                </div>
                
                <p className="text-center text-gray-500 text-sm mt-4">
                  Confirmation Code: QJK3FHTY7D
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How M-Pesa Integration Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Accept payments in 4 simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white p-6 rounded-xl shadow-sm h-full">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              M-Pesa Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to accept and manage M-Pesa payments
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mpesaFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Why M-Pesa Integration Matters
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                M-Pesa is the most popular payment method in Kenya. By accepting M-Pesa 
                in your POS, you make it easy for customers to pay and increase your sales.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { stat: '95%', label: 'of Kenyans use M-Pesa' },
                  { stat: '3 sec', label: 'average payment time' },
                  { stat: '0%', label: 'extra fees' },
                  { stat: '24/7', label: 'payment availability' },
                ].map((item, index) => (
                  <div key={index} className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-green-400 mb-1">{item.stat}</div>
                    <div className="text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                'Faster checkout = more sales',
                'No cash handling = reduced theft',
                'Automatic records = easier accounting',
                'Customer convenience = loyalty',
                'Real-time tracking = better control',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                  <span className="text-white font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Start Accepting M-Pesa Today
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of Kenyan businesses already using SmartDuka for M-Pesa payments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/features/analytics" 
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Explore Analytics →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-semibold">SmartDuka</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
              <Link href="/support" className="hover:text-white">Contact</Link>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} SmartDuka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
