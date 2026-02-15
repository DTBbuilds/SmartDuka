import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  ShoppingCart, 
  Package, 
  Smartphone,
  BarChart3,
  Users,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SmartDuka Features - POS, Inventory Management & Sales Analytics',
  description: 'Explore SmartDuka features: Fast POS checkout, real-time inventory management, sales analytics, multi-store support, and employee management for retail businesses.',
  keywords: [
    'POS features',
    'inventory management features',
    'point of sale features',
    'retail software features',
    'SmartDuka features',
    'sales tracking features',
    'multi-store POS',
    'barcode scanning POS',
  ],
  openGraph: {
    title: 'SmartDuka Features | POS, Inventory & Analytics',
    description: 'Complete feature overview of SmartDuka POS and inventory management system.',
    type: 'website',
    locale: 'en_US',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/features',
  },
};

const featureCategories = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale',
    description: 'Fast, reliable checkout with barcode scanning, offline mode, and receipt printing.',
    href: '/features/pos',
    color: 'blue',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Real-time stock tracking, low stock alerts, and multi-branch inventory sync.',
    href: '/features/inventory',
    color: 'green',
  },
  {
    icon: Smartphone,
    title: 'M-Pesa Integration',
    description: 'Accept M-Pesa payments with STK push and automatic reconciliation.',
    href: '/features/mpesa',
    color: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Sales Analytics',
    description: 'Powerful dashboards and reports to understand and grow your business.',
    href: '/features/analytics',
    color: 'purple',
  },
];

const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
  blue: { bg: 'bg-blue-100', icon: 'text-blue-600', hover: 'hover:bg-blue-50' },
  green: { bg: 'bg-green-100', icon: 'text-green-600', hover: 'hover:bg-green-50' },
  emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600', hover: 'hover:bg-purple-50' },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
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
              <Link href="/features" className="text-blue-600 font-medium">Features</Link>
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
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for Your Business
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            SmartDuka combines everything you need to run a successful retail business in Kenya. 
            From fast checkout to detailed analytics, we&apos;ve got you covered.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {featureCategories.map((category) => {
              const colors = colorClasses[category.color];
              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className={`group p-8 bg-gray-50 rounded-2xl ${colors.hover} transition-all hover:shadow-lg`}
                >
                  <div className={`w-16 h-16 ${colors.bg} rounded-xl flex items-center justify-center mb-6`}>
                    <category.icon className={`h-8 w-8 ${colors.icon}`} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {category.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <span className="inline-flex items-center gap-2 text-blue-600 font-semibold">
                    Learn more
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Plus Many More Features
          </h2>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: 'Employee Management' },
              { icon: Store, title: 'Multi-Branch Support' },
              { icon: Package, title: 'Stock Transfers' },
              { icon: BarChart3, title: 'Custom Reports' },
              { icon: ShoppingCart, title: 'Customer Loyalty' },
              { icon: Smartphone, title: 'Mobile App' },
              { icon: Package, title: 'Supplier Management' },
              { icon: BarChart3, title: 'Profit Tracking' },
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <feature.icon className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900">{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Try SmartDuka free for 14 days. No credit card required.
          </p>
          <Link 
            href="/register-shop" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
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
