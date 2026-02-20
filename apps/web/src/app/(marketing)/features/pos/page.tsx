import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  ShoppingCart, 
  CreditCard,
  Smartphone,
  Wifi,
  WifiOff,
  Barcode,
  Receipt,
  Calculator,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Keyboard,
  Monitor,
  Tablet,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'POS System - Fast Point of Sale Software | SmartDuka',
  description: 'SmartDuka POS system for retail businesses. Fast checkout, barcode scanning, multiple payment methods, offline mode, and receipt printing. Start your free trial today!',
  keywords: [
    'POS system',
    'point of sale software',
    'retail POS',
    'fast checkout system',
    'barcode POS',
    'offline POS system',
    'cloud POS',
    'mobile POS',
    'small business POS',
  ],
  openGraph: {
    title: 'POS System - Fast Point of Sale Software | SmartDuka',
    description: 'Fast, reliable POS system for retail businesses. Barcode scanning, offline mode, multi-payment support.',
    type: 'website',
    locale: 'en_US',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/features/pos',
  },
};

const posFeatures = [
  {
    icon: ShoppingCart,
    title: 'Quick Checkout',
    description: 'Process sales in seconds with our intuitive touch interface. Add items, apply discounts, and complete transactions effortlessly.',
  },
  {
    icon: Barcode,
    title: 'Barcode Scanning',
    description: 'Scan product barcodes using your phone camera or dedicated scanner. Instant product lookup and pricing.',
  },
  {
    icon: Smartphone,
    title: 'M-Pesa Integration',
    description: 'Accept M-Pesa payments with STK push. Customers pay directly from their phones with instant confirmation.',
  },
  {
    icon: CreditCard,
    title: 'Multiple Payment Methods',
    description: 'Accept cash, M-Pesa, cards, and split payments. Flexible options for every customer.',
  },
  {
    icon: WifiOff,
    title: 'Offline Mode',
    description: 'Keep selling even without internet. Sales sync automatically when connection is restored.',
  },
  {
    icon: Receipt,
    title: 'Receipt Printing',
    description: 'Print professional receipts or send digital receipts via SMS. Customize with your logo and details.',
  },
  {
    icon: Calculator,
    title: 'Smart Discounts',
    description: 'Apply percentage or fixed discounts. Set up automatic promotions and loyalty rewards.',
  },
  {
    icon: Users,
    title: 'Multi-Cashier Support',
    description: 'Multiple cashiers can work simultaneously. Each has their own login and shift tracking.',
  },
  {
    icon: Clock,
    title: 'Shift Management',
    description: 'Open and close shifts with cash counts. Track cashier performance and reconcile daily sales.',
  },
];

const deviceSupport = [
  { icon: Monitor, name: 'Desktop/Laptop', description: 'Full-featured dashboard' },
  { icon: Tablet, name: 'Tablet', description: 'Touch-optimized POS' },
  { icon: Smartphone, name: 'Smartphone', description: 'Mobile sales on-the-go' },
];

export default function POSFeaturePage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: 'https://www.smartduka.org' },
          { name: 'Features', url: 'https://www.smartduka.org/features' },
          { name: 'POS System', url: 'https://www.smartduka.org/features/pos' },
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
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Login
              </Link>
              <Link 
                href="/register-shop" 
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
              <ShoppingCart className="h-4 w-4" />
              Point of Sale System
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Fast, Reliable <span className="text-blue-600">POS System</span> for Kenyan Retailers
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Process sales quickly with barcode scanning, M-Pesa payments, and offline support. 
              SmartDuka POS works on any device and keeps your business running 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register-shop" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                href="/pricing" 
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Device Support */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white">Works on Any Device</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {deviceSupport.map((device, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <device.icon className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="font-semibold">{device.name}</p>
                  <p className="text-gray-400 text-sm">{device.description}</p>
                </div>
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
              Powerful POS Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to process sales quickly and efficiently
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
                <Keyboard className="h-4 w-4" />
                Power User Feature
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Keyboard Shortcuts for Lightning-Fast Checkout
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Train your cashiers to use keyboard shortcuts and process sales 50% faster. 
                Every second saved means more customers served.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">F2</kbd>
                  <span className="text-gray-700">Quick search products</span>
                </li>
                <li className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">F4</kbd>
                  <span className="text-gray-700">Apply discount</span>
                </li>
                <li className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">F8</kbd>
                  <span className="text-gray-700">Complete sale</span>
                </li>
                <li className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">F10</kbd>
                  <span className="text-gray-700">M-Pesa payment</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                <Keyboard className="h-20 w-20 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offline Mode Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-gray-900 p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <WifiOff className="h-12 w-12 text-green-400" />
                <div>
                  <p className="text-white font-bold text-lg">Offline Mode Active</p>
                  <p className="text-gray-400">12 sales pending sync</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Wifi className="h-12 w-12 text-blue-400" />
                <div>
                  <p className="text-white font-bold text-lg">Back Online</p>
                  <p className="text-gray-400">All sales synced ✓</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Never Miss a Sale - Even Offline
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Internet down? No problem. SmartDuka works offline and automatically 
                syncs your sales when you&apos;re back online. Your business never stops.
              </p>
              <ul className="space-y-3">
                {[
                  'Sales saved locally when offline',
                  'Automatic sync when connection restored',
                  'No duplicate transactions',
                  'Full functionality without internet',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Speed Up Your Checkout?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start your free trial today and see why thousands of Kenyan businesses choose SmartDuka.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/features/inventory" 
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Explore Inventory Features →
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
