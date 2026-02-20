import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ScanBarcode,
  Camera,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  Store,
  Smartphone,
  Monitor,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Barcode POS System & Scanner Integration | SmartDuka',
  description:
    'SmartDuka supports USB barcode scanners, Bluetooth scanners, and camera-based barcode scanning. Speed up checkout and reduce errors. Built by DTB Technologies.',
  keywords: [
    'barcode POS system',
    'barcode scanner POS',
    'camera barcode scanning',
    'barcode checkout',
    'POS barcode integration',
    'SmartDuka barcode',
    'DTB Technologies',
  ],
  openGraph: {
    title: 'Barcode POS System & Scanner Integration | SmartDuka',
    description: 'USB, Bluetooth, and camera barcode scanning for faster checkout. Built by DTB Technologies.',
    type: 'website',
    url: 'https://www.smartduka.org/barcode-pos-system',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/barcode-pos-system',
  },
};

export default function BarcodePosSystemPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</Link>
              <Link href="/register-shop" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Get Started Free</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">Barcode POS System &amp; Scanner Integration</h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            SmartDuka integrates with barcode scanners and device cameras to speed up checkout and reduce errors. Scan a product barcode and SmartDuka instantly looks up the item, adds it to the cart, and displays the price. Built by{' '}
            <a href="https://www.dtbtech.org" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">DTB Technologies</a>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register-shop" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg">Get Started Free <ArrowRight className="h-5 w-5" /></Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400">View Pricing</Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Supported Barcode Scanners</h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            SmartDuka works with a wide range of barcode scanning hardware and also supports camera-based scanning on phones and tablets.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-2xl">
              <ScanBarcode className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">USB Barcode Scanners</h3>
              <p className="text-gray-600">Plug in any standard USB barcode scanner. SmartDuka recognises it instantly with no configuration needed. Works with 1D and 2D barcodes.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Smartphone className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bluetooth Scanners</h3>
              <p className="text-gray-600">Pair a Bluetooth barcode scanner with your tablet or phone for wireless scanning. Ideal for businesses that need mobility at the checkout.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Camera className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Camera Barcode Scanning</h3>
              <p className="text-gray-600">Use your phone or tablet camera to scan barcodes. No additional hardware required. SmartDuka uses the device camera to read product codes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Faster Checkout</h2>
              <p className="text-lg text-gray-600 mb-6">
                Barcode scanning eliminates the need to manually search for products. A single scan adds the item to the cart with the correct name, price, and quantity. This reduces checkout time significantly, especially during busy hours.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Scan and add products in under one second</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Continuous scanning mode for multiple items</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Auto-increment quantity on repeat scans</li>
              </ul>
              <div className="mt-8">
                <Link href="/point-of-sale-software" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline">Learn more about POS features <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
              <Zap className="h-32 w-32 text-orange-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 rounded-2xl shadow-lg p-8 flex items-center justify-center order-2 lg:order-1">
              <ShieldCheck className="h-32 w-32 text-green-600" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Reduced Errors</h2>
              <p className="text-lg text-gray-600 mb-6">
                Manual product entry leads to mistakes&mdash;wrong prices, wrong items, and miscounted quantities. Barcode scanning ensures every scanned product matches exactly what is in the system, reducing checkout errors and improving accuracy in inventory records.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Eliminates manual entry mistakes</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Accurate pricing on every transaction</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Inventory counts stay accurate</li>
              </ul>
              <div className="mt-8">
                <Link href="/inventory-management-software" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline">Learn about inventory management <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Works on Any Device</h2>
          <p className="text-lg text-gray-600 mb-12">
            Because SmartDuka is a web-based POS system, barcode scanning works on laptops, desktops, tablets, and phones. Use a USB scanner at the counter and switch to camera scanning when you are on the shop floor.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <Monitor className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">Desktop &amp; Laptop</h3>
                <p className="text-gray-600 text-sm">USB barcode scanners connect directly. No drivers needed.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <Smartphone className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">Phone &amp; Tablet</h3>
                <p className="text-gray-600 text-sm">Use the built-in camera or pair a Bluetooth scanner.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Try SmartDuka Barcode POS System</h2>
          <p className="text-xl text-blue-100 mb-8">Start your free trial today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register-shop" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 shadow-lg">Get Started Free</Link>
            <Link href="/" className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10">Back to Home</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
