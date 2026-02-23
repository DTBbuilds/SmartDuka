import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  Package, 
  BarChart3,
  Bell,
  ArrowUpDown,
  Truck,
  Warehouse,
  Tags,
  History,
  FileSpreadsheet,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  RefreshCcw,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'Inventory Management Software - Real-Time Stock Tracking | SmartDuka',
  description: 'Complete inventory management for retail businesses. Real-time stock tracking, low stock alerts, supplier management, multi-branch sync, and detailed reports. Start free!',
  keywords: [
    'inventory management software',
    'stock tracking software',
    'inventory control system',
    'stock management',
    'warehouse management',
    'supplier management software',
    'multi-store inventory',
    'retail inventory software',
    'inventory tracking',
  ],
  openGraph: {
    title: 'Inventory Management Software | SmartDuka',
    description: 'Real-time stock tracking with low stock alerts for retail businesses.',
    type: 'website',
    locale: 'en_US',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/features/inventory',
  },
};

const inventoryFeatures = [
  {
    icon: Package,
    title: 'Real-time Stock Tracking',
    description: 'Know exactly what you have in stock at any moment. Automatic updates with every sale and purchase.',
  },
  {
    icon: Bell,
    title: 'Low Stock Alerts',
    description: 'Get notified when products are running low. Never miss a sale due to stockouts.',
  },
  {
    icon: Tags,
    title: 'Product Categories',
    description: 'Organize products into categories and subcategories. Easy navigation and reporting.',
  },
  {
    icon: Truck,
    title: 'Supplier Management',
    description: 'Track suppliers, manage purchase orders, and monitor delivery schedules.',
  },
  {
    icon: Warehouse,
    title: 'Multi-Branch Sync',
    description: 'Sync inventory across multiple locations. Transfer stock between branches easily.',
  },
  {
    icon: ArrowUpDown,
    title: 'Stock Transfers',
    description: 'Move products between branches with full tracking. Know where every item is.',
  },
  {
    icon: History,
    title: 'Stock History',
    description: 'Complete audit trail of all stock movements. Track adjustments, sales, and purchases.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Bulk Import/Export',
    description: 'Import products from Excel/CSV. Export inventory data for analysis or accounting.',
  },
  {
    icon: BarChart3,
    title: 'Inventory Reports',
    description: 'Detailed reports on stock value, movement, and performance. Make data-driven decisions.',
  },
];

const benefits = [
  {
    icon: AlertTriangle,
    title: 'Reduce Stockouts',
    description: 'Automated alerts ensure you never run out of popular products.',
    stat: '95%',
    statLabel: 'Reduction in stockouts',
  },
  {
    icon: TrendingUp,
    title: 'Increase Sales',
    description: 'Always have what customers want. No more "sorry, out of stock".',
    stat: '23%',
    statLabel: 'Average sales increase',
  },
  {
    icon: RefreshCcw,
    title: 'Save Time',
    description: 'Automated tracking eliminates manual stock counts and paperwork.',
    stat: '10hrs',
    statLabel: 'Saved per week',
  },
];

export default function InventoryFeaturePage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: 'https://www.smartduka.org' },
          { name: 'Features', url: 'https://www.smartduka.org/features' },
          { name: 'Inventory Management', url: 'https://www.smartduka.org/features/inventory' },
        ]} 
      />

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
            
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features/pos" className="text-orange-600 font-medium">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="/support" className="text-gray-600 hover:text-gray-900">Support</Link>
            </nav>
            
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">Login</Link>
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

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-white to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-6">
              <Package className="h-4 w-4" />
              Inventory Management
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Complete <span className="text-green-600">Inventory Management</span> for Your Business
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Track stock in real-time, get low stock alerts, manage suppliers, and sync 
              inventory across multiple branches. Never lose a sale to stockouts again.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register-shop" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors"
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

      {/* Benefits Stats */}
      <section className="py-16 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <benefit.icon className="h-10 w-10 text-green-200 mx-auto mb-4" />
                <div className="text-4xl font-bold text-white mb-2">{benefit.stat}</div>
                <div className="text-green-100 font-medium mb-2">{benefit.statLabel}</div>
                <p className="text-green-200 text-sm">{benefit.description}</p>
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
              Complete Inventory Control
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your stock efficiently
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {inventoryFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Low Stock Alerts Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Never Run Out of Stock Again
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Set custom reorder points for each product. Get instant notifications 
                when stock falls below your threshold. Prevent lost sales and unhappy customers.
              </p>
              <ul className="space-y-3">
                {[
                  'Custom reorder points per product',
                  'Email and in-app notifications',
                  'Daily low stock summary reports',
                  'Suggested order quantities',
                  'One-click reorder from suppliers',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="border-b pb-4 mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Low Stock Alerts
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Unga Flour 2kg', stock: 5, reorder: 10 },
                  { name: 'Cooking Oil 1L', stock: 3, reorder: 15 },
                  { name: 'Sugar 1kg', stock: 8, reorder: 20 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-orange-600">Only {item.stock} left (reorder at {item.reorder})</p>
                    </div>
                    <button className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-medium">
                      Reorder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Branch Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gray-900 p-6 rounded-2xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-orange-400" />
                  Branch Inventory Overview
                </h3>
                <div className="space-y-3">
                  {[
                    { branch: 'Main Store - Nairobi', items: 2450, value: 'KES 1.2M' },
                    { branch: 'Branch 2 - Mombasa', items: 1850, value: 'KES 890K' },
                    { branch: 'Branch 3 - Kisumu', items: 1200, value: 'KES 650K' },
                  ].map((branch, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{branch.branch}</p>
                        <p className="text-sm text-gray-400">{branch.items} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">{branch.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Manage Multiple Branches from One Dashboard
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Whether you have 2 shops or 20, SmartDuka lets you manage all your 
                inventory from a single dashboard. Transfer stock between locations 
                with full tracking.
              </p>
              <ul className="space-y-3">
                {[
                  'Unified dashboard for all branches',
                  'Stock transfer between branches',
                  'Branch-specific reports',
                  'Centralized purchasing',
                  'Real-time sync across locations',
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
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Take Control of Your Inventory Today
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Start your free trial and see how SmartDuka can transform your inventory management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/features/mpesa" 
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Explore M-Pesa Integration →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
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
