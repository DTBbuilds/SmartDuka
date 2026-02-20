import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  DollarSign,
  Package,
  ArrowRight,
  CheckCircle,
  Store,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sales Reports & Analytics Software | SmartDuka POS',
  description:
    'SmartDuka provides daily, weekly, and monthly sales reports, profit analysis, inventory valuation, and business insights. Make data-driven decisions with real-time analytics. Built by DTB Technologies.',
  keywords: [
    'sales reports software',
    'analytics software',
    'POS reports',
    'sales analytics',
    'profit analysis software',
    'inventory valuation',
    'business insights',
    'SmartDuka reports',
    'DTB Technologies',
  ],
  openGraph: {
    title: 'Sales Reports & Analytics Software | SmartDuka POS',
    description: 'Daily, weekly, monthly reports. Profit analysis and inventory valuation. Built by DTB Technologies.',
    type: 'website',
    url: 'https://www.smartduka.org/reports-and-analytics',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/reports-and-analytics',
  },
};

export default function ReportsAndAnalyticsPage() {
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

      <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">Sales Reports &amp; Analytics Software</h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            SmartDuka gives you clear, actionable reports on every aspect of your business. Track daily revenue, analyse profit margins, monitor inventory value, and identify trends from a single dashboard. Built by{' '}
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Daily, Weekly, and Monthly Reports</h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            SmartDuka automatically generates reports at every level. View today&rsquo;s sales, compare this week to last week, or review monthly performance to plan ahead.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-2xl">
              <Calendar className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Daily Reports</h3>
              <p className="text-gray-600">End-of-day summary with total sales, number of transactions, average ticket size, and payment method breakdown.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <TrendingUp className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Weekly Reports</h3>
              <p className="text-gray-600">Week-over-week comparison of revenue, best-selling products, busiest days, and staff performance metrics.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-2xl">
              <BarChart3 className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monthly Reports</h3>
              <p className="text-gray-600">Comprehensive monthly analysis including revenue trends, gross profit, expense tracking, and growth indicators.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Profit Analysis</h2>
              <p className="text-lg text-gray-600 mb-6">
                SmartDuka calculates profit margins for every product and every transaction. See which products generate the most profit, identify low-margin items, and make pricing decisions based on real data.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Per-product profit margin tracking</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Gross profit and net profit reports</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Cost of goods sold (COGS) tracking</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Revenue vs. expense comparison</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
              <DollarSign className="h-32 w-32 text-purple-600" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 rounded-2xl shadow-lg p-8 flex items-center justify-center order-2 lg:order-1">
              <Package className="h-32 w-32 text-green-600" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Inventory Valuation</h2>
              <p className="text-lg text-gray-600 mb-6">
                Know the total value of your stock at any point in time. SmartDuka calculates inventory valuation based on cost price and retail price, helping you understand your asset position and make informed purchasing decisions.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Total stock value at cost and retail price</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Stock turnover rate analysis</li>
                <li className="flex items-center gap-3 text-gray-700"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />Dead stock identification</li>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Business Insights</h2>
          <p className="text-lg text-gray-600 mb-12">
            Beyond standard reports, SmartDuka provides insights that help you grow your business. Identify peak selling hours, top customers, seasonal trends, and opportunities to increase revenue.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <PieChart className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">Sales by Category</h3>
                <p className="text-gray-600 text-sm">See which product categories drive the most revenue.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex gap-4">
              <TrendingUp className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-1">Growth Trends</h3>
                <p className="text-gray-600 text-sm">Track month-over-month and year-over-year business growth.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Try SmartDuka Reports &amp; Analytics</h2>
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
