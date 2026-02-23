import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  History,
  Store,
  ArrowRight,
  CheckCircle,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  Layers,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inventory Management Software & Stock Control System | SmartDuka',
  description:
    'SmartDuka inventory management software tracks stock levels in real time, provides low stock alerts, maintains inventory history, and syncs across multiple stores. Built by DTB Technologies.',
  keywords: [
    'inventory management software',
    'stock management system',
    'stock control software',
    'inventory tracking',
    'multi-store inventory',
    'low stock alerts',
    'SmartDuka inventory',
    'DTB Technologies',
  ],
  openGraph: {
    title: 'Inventory Management Software & Stock Control System | SmartDuka',
    description:
      'Real-time stock tracking, low stock alerts, inventory history, and multi-store inventory control. Built by DTB Technologies.',
    type: 'website',
    url: 'https://www.smartduka.org/inventory-management-software',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/inventory-management-software',
  },
};

export default function InventoryManagementSoftwarePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</Link>
              <Link
                href="/register-shop"
                className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Inventory Management Software
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Inventory management software tracks stock levels, manages purchase orders, provides
            low stock alerts, and maintains a complete history of every product movement. SmartDuka
            combines inventory management with a{' '}
            <Link href="/point-of-sale-software" className="text-orange-600 hover:underline">point of sale system</Link>{' '}
            so every sale automatically updates your stock in real time. Built by{' '}
            <a href="https://www.dtbtech.org" className="text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">
              DTB Technologies
            </a>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register-shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg"
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
      </section>

      {/* Stock Tracking */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Real-time Stock Tracking
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            SmartDuka keeps an accurate count of every product in your store. When a sale is
            made through the POS, stock levels update instantly. When new inventory arrives,
            log it in the system and quantities adjust automatically.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Package className="h-10 w-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Live Stock Levels</h3>
              <p className="text-gray-600">
                See exactly how many units of each product are available at any time. No manual
                counting needed.
              </p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <RefreshCw className="h-10 w-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automatic Updates</h3>
              <p className="text-gray-600">
                Every POS transaction, stock receipt, and adjustment is reflected in inventory
                counts immediately.
              </p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Layers className="h-10 w-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Product Categories</h3>
              <p className="text-gray-600">
                Organize products by category, brand, or supplier for easier browsing and
                management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory History */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Inventory History</h2>
              <p className="text-lg text-gray-600 mb-6">
                SmartDuka logs every stock movement&mdash;sales, purchases, adjustments, transfers,
                and returns. Review the complete history of any product to understand exactly when
                and why stock levels changed.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Full audit trail for every product
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Track who made changes and when
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Export history for accounting
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
              <History className="h-32 w-32 text-green-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Low Stock Alerts */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 rounded-2xl shadow-lg p-8 flex items-center justify-center order-2 lg:order-1">
              <AlertTriangle className="h-32 w-32 text-orange-500" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Low Stock Alerts</h2>
              <p className="text-lg text-gray-600 mb-6">
                Set minimum stock thresholds for each product. When inventory drops below the
                threshold, SmartDuka alerts you so you can reorder before running out. Avoid
                stockouts and lost sales.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Configurable reorder points per product
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Dashboard notifications for low stock
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Low stock reports for purchasing decisions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Integration with POS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Integrated with POS</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
            SmartDuka&rsquo;s inventory management is fully integrated with the{' '}
            <Link href="/point-of-sale-software" className="text-orange-600 hover:underline">point of sale system</Link>.
            Every sale reduces stock. Every purchase order adds stock. You never have to
            update inventory separately.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <ShoppingCart className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">POS Integration</h3>
                <p className="text-gray-600 text-sm">Sales automatically deduct from inventory in real time.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <BarChart3 className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">Inventory Reports</h3>
                <p className="text-gray-600 text-sm">Track stock value, turnover rate, and dead stock.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-store */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Multi-store Inventory Control</h2>
          <p className="text-lg text-gray-600 mb-8">
            If you operate multiple stores, SmartDuka tracks inventory for each location
            separately. Transfer stock between branches, compare stock levels across
            locations, and get a consolidated view of your entire inventory from one
            dashboard.
          </p>
          <ul className="inline-flex flex-col gap-3 text-left">
            <li className="flex items-center gap-3 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              Per-location stock tracking
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              Inter-branch stock transfers
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              Consolidated inventory dashboard
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Try SmartDuka Inventory Management
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register-shop"
              className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/"
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
