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
  title: 'SmartDuka Pricing - 100% Free POS System | No Subscriptions',
  description: 'SmartDuka is completely free for all users. No subscriptions, no hidden fees, no limits. Full POS system with M-Pesa integration, inventory management, and analytics — free forever. Open source and privacy-first.',
  keywords: [
    'free POS system',
    'free point of sale',
    'SmartDuka free',
    'free POS Kenya',
    'no subscription POS',
    'open source POS',
    'free inventory management',
    'free retail software',
    'free M-Pesa POS',
  ],
  openGraph: {
    title: 'SmartDuka – 100% Free POS System | No Subscriptions Ever',
    description: 'SmartDuka is completely free. No subscriptions, no hidden fees. Full POS, inventory, analytics — all free forever.',
    type: 'website',
    locale: 'en_KE',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/pricing',
  },
};

const allFeatures = [
  'Full POS System',
  'M-Pesa Integration',
  'Inventory Tracking',
  'Sales Reports & Analytics',
  'Barcode Scanning',
  'Multi-Branch Support',
  'Employee Management',
  'Stock Transfers',
  'Smart Invoicing',
  'AI-Powered Insights',
  'Unlimited Shops',
  'Unlimited Staff',
  'Unlimited Products',
  '24/7 Support',
];

const faqs = [
  {
    question: 'Is SmartDuka really free?',
    answer: 'Yes! SmartDuka is 100% free for all users. There are no subscriptions, no hidden fees, no premium tiers, and no limits. Every feature is available to every user, forever.',
  },
  {
    question: 'Why is SmartDuka free?',
    answer: 'SmartDuka is an open source project built to empower small businesses. We believe every retailer deserves access to professional POS tools without financial barriers.',
  },
  {
    question: 'Will SmartDuka ever start charging?',
    answer: 'SmartDuka is committed to remaining free. If premium features are added in the future, all current features will remain free forever.',
  },
  {
    question: 'Do you collect any user data?',
    answer: 'No. SmartDuka does not collect, sell, or share any user data at any level. Your business data stays completely private and under your control.',
  },
  {
    question: 'How can I support SmartDuka?',
    answer: 'You can support SmartDuka with a voluntary M-Pesa donation to 0729 983 567. Donations help us maintain and improve the system. They are entirely optional and do not unlock any additional features.',
  },
  {
    question: 'Is SmartDuka open source?',
    answer: 'Yes! SmartDuka is fully open source. You can inspect the code, suggest improvements, and contribute to the project.',
  },
];


export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <FAQJsonLd faqs={faqs} />
      <ProductJsonLd 
        plan={{
          name: 'Free Plan',
          description: 'SmartDuka is 100% free for all users. No subscriptions, no hidden fees.',
          price: 0,
          priceCurrency: 'KES',
        }} 
      />

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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Open Source &amp; Privacy-First
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            100% Free. No Catch.
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            SmartDuka is completely free for everyone. No subscriptions, no hidden fees, 
            no premium tiers. Every feature is available to every user, forever.
          </p>
        </div>
      </section>

      {/* Free Plan Card */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-white rounded-2xl border-2 border-green-400 shadow-xl overflow-hidden ring-4 ring-green-500 ring-offset-2">
            <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
              Free Forever
            </div>

            <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 text-center">
              <h2 className="text-3xl font-bold text-white">SmartDuka</h2>
              <p className="text-white/90 mt-1">Everything you need — completely free</p>
              <div className="mt-4">
                <span className="text-6xl font-extrabold text-white">Free</span>
                <p className="text-white/80 mt-1">No subscriptions. No limits. Forever.</p>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 gap-3">
                {allFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 pb-8">
              <Link
                href="/register-shop"
                className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                Get Started — It&apos;s Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need to Run Your Business</h2>
            <p className="text-gray-600 mt-2">All included free with SmartDuka</p>
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
              Get Started Free
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
