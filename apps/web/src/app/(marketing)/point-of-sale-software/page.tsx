import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShoppingCart,
  Monitor,
  Wifi,
  WifiOff,
  CreditCard,
  Receipt,
  BarChart3,
  ScanBarcode,
  ArrowRight,
  CheckCircle,
  Store,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Point of Sale Software for Retail Businesses | SmartDuka POS',
  description:
    'SmartDuka is a web-based point of sale (POS) software for retail businesses. Process sales, scan barcodes, accept payments, and generate receipts from any device. Built by DTB Technologies.',
  keywords: [
    'point of sale software',
    'POS software',
    'retail POS software',
    'web-based POS system',
    'cloud POS',
    'barcode POS system',
    'SmartDuka POS',
    'DTB Technologies',
  ],
  openGraph: {
    title: 'Point of Sale Software for Retail Businesses | SmartDuka POS',
    description:
      'Web-based POS software by DTB Technologies. Process sales, scan barcodes, accept payments, and generate receipts.',
    type: 'website',
    url: 'https://www.smartduka.org/point-of-sale-software',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/point-of-sale-software',
  },
};

export default function PointOfSaleSoftwarePage() {
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
      <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            SmartDuka Point of Sale Software
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Point of sale (POS) software is a system that processes sales transactions in retail
            businesses. It handles checkout, payment processing, receipt generation, and integrates
            with inventory and reporting tools. SmartDuka is a web-based POS system built by{' '}
            <a href="https://www.dtbtech.org" className="text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">
              DTB Technologies
            </a>{' '}
            that runs on any device with a browser.
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

      {/* How SmartDuka Processes Sales */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            How SmartDuka Processes Sales
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            SmartDuka provides a fast and reliable checkout experience. Cashiers can add products
            by searching, scanning barcodes, or browsing categories. Payments are recorded
            instantly and receipts are generated automatically.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-2xl">
              <ShoppingCart className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Checkout</h3>
              <p className="text-gray-600">
                Add items to the cart quickly using product search, category browsing, or barcode
                scanning. Apply discounts and process the sale in seconds.
              </p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <CreditCard className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multiple Payment Methods</h3>
              <p className="text-gray-600">
                Accept cash, M-Pesa, card payments, and split payments. Each transaction is
                recorded and linked to the customer and inventory automatically.
              </p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Receipt className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automatic Receipts</h3>
              <p className="text-gray-600">
                Generate printed or digital receipts for every transaction. Customize receipts
                with your business name, logo, and contact information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Barcode Scanning */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Barcode Scanning Support
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                SmartDuka works with USB barcode scanners, Bluetooth scanners, and the built-in
                camera on your phone or tablet. Scan product barcodes to instantly add items to the
                cart, reducing checkout time and eliminating manual entry errors.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  USB and Bluetooth barcode scanner support
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Camera-based barcode scanning on mobile devices
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Auto-lookup product details on scan
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/barcode-pos-system" className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline">
                  Learn more about barcode POS <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
              <ScanBarcode className="h-32 w-32 text-orange-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Reporting */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 rounded-2xl shadow-lg p-8 flex items-center justify-center order-2 lg:order-1">
              <BarChart3 className="h-32 w-32 text-orange-600" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Real-time Reporting
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Every sale processed through SmartDuka is reflected in real-time reports. Track
                daily revenue, best-selling products, peak hours, and profit margins without
                waiting for end-of-day summaries.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Live sales dashboard
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Daily, weekly, and monthly reports
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  Product performance and profit analysis
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/reports-and-analytics" className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline">
                  Explore reports and analytics <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web-based POS Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Benefits of a Web-based POS System
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12">
            SmartDuka runs entirely in the browser. No software installation, no expensive
            hardware. Access your POS from a laptop, tablet, or phone.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <Monitor className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Works on Any Device</h3>
                <p className="text-gray-600 text-sm">Use your existing laptop, tablet, or phone. No special POS hardware needed.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <Wifi className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Cloud-based Access</h3>
                <p className="text-gray-600 text-sm">Access your POS and data from anywhere with an internet connection.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <WifiOff className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Offline Mode</h3>
                <p className="text-gray-600 text-sm">Continue selling even without internet. Data syncs when you reconnect.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <ShoppingCart className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Automatic Updates</h3>
                <p className="text-gray-600 text-sm">Always on the latest version. No manual updates or installations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Try SmartDuka Point of Sale Software
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
