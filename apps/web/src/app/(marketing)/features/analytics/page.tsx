import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  BarChart3,
  TrendingUp,
  PieChart,
  LineChart,
  Calendar,
  Download,
  Clock,
  Users,
  ShoppingCart,
  DollarSign,
  Target,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'Sales Analytics & Reports - Business Intelligence | SmartDuka',
  description: 'Powerful sales analytics and reporting for retail businesses. Track sales trends, profit margins, employee performance, and inventory turnover with real-time dashboards.',
  keywords: [
    'sales analytics',
    'retail reports software',
    'business intelligence',
    'sales tracking system',
    'profit analysis software',
    'retail dashboard',
    'POS reports',
    'inventory analytics',
    'sales reporting',
  ],
  openGraph: {
    title: 'Sales Analytics & Reports | SmartDuka',
    description: 'Real-time sales analytics and reporting for smarter business decisions.',
    type: 'website',
    locale: 'en_US',
  },
  alternates: {
    canonical: 'https://www.smartduka.org/features/analytics',
  },
};

const analyticsFeatures = [
  {
    icon: TrendingUp,
    title: 'Sales Trends',
    description: 'Track daily, weekly, and monthly sales trends. Identify patterns and optimize your business.',
  },
  {
    icon: PieChart,
    title: 'Product Performance',
    description: 'See which products sell best. Identify slow movers and top performers.',
  },
  {
    icon: DollarSign,
    title: 'Profit Analysis',
    description: 'Track profit margins by product, category, or time period. Know your true profitability.',
  },
  {
    icon: Users,
    title: 'Employee Reports',
    description: 'Monitor cashier performance, sales by employee, and shift productivity.',
  },
  {
    icon: ShoppingCart,
    title: 'Transaction Insights',
    description: 'Average basket size, peak hours, and customer buying patterns.',
  },
  {
    icon: Target,
    title: 'Goal Tracking',
    description: 'Set sales targets and track progress. Motivate your team to achieve more.',
  },
  {
    icon: Calendar,
    title: 'Custom Date Ranges',
    description: 'Analyze any time period. Compare week-over-week or year-over-year.',
  },
  {
    icon: Download,
    title: 'Export Reports',
    description: 'Download reports as PDF or Excel. Share with accountants or stakeholders.',
  },
];

const reportTypes = [
  { name: 'Daily Sales Summary', description: 'Complete overview of daily sales, payments, and profits' },
  { name: 'Product Sales Report', description: 'Sales breakdown by product with quantities and revenue' },
  { name: 'Category Performance', description: 'Revenue and profit by product category' },
  { name: 'Payment Methods', description: 'Sales by payment type (Cash, M-Pesa, Card)' },
  { name: 'Employee Performance', description: 'Sales and transactions by cashier' },
  { name: 'Inventory Valuation', description: 'Current stock value and movement' },
  { name: 'Profit & Loss', description: 'Revenue, costs, and profit margins' },
  { name: 'Customer Analytics', description: 'Top customers and buying patterns' },
];

export default function AnalyticsFeaturePage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: 'https://www.smartduka.org' },
          { name: 'Features', url: 'https://www.smartduka.org/features' },
          { name: 'Analytics', url: 'https://www.smartduka.org/features/analytics' },
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
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6">
              <BarChart3 className="h-4 w-4" />
              Sales Analytics
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Make Smarter Decisions with <span className="text-purple-600">Real-Time Analytics</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Powerful dashboards and reports that turn your sales data into actionable insights. 
              Track trends, measure performance, and grow your business with data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register-shop" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition-colors"
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

      {/* Dashboard Preview */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Today\'s Sales', value: 'KES 45,230', change: '+12%', icon: ShoppingCart },
              { label: 'Transactions', value: '127', change: '+8%', icon: Clock },
              { label: 'Avg Basket', value: 'KES 356', change: '+5%', icon: Target },
              { label: 'Profit', value: 'KES 12,450', change: '+15%', icon: TrendingUp },
            ].map((stat, index) => (
              <div key={index} className="bg-gray-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-purple-400" />
                  <span className="text-green-400 text-sm font-medium">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
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
              Powerful Analytics Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand and grow your business
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analyticsFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report Types */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Pre-Built Reports Ready to Use
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Access comprehensive reports designed for retail businesses. 
                No setup required - just click and get insights.
              </p>
              
              <div className="space-y-3">
                {reportTypes.slice(0, 5).map((report, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900">Available Reports</h3>
                <span className="text-purple-600 text-sm font-medium">{reportTypes.length} reports</span>
              </div>
              <div className="space-y-2">
                {reportTypes.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
                    <span className="text-gray-700">{report.name}</span>
                    <Download className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gray-900 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Live Dashboard</span>
                </div>
                <div className="space-y-4">
                  <div className="h-32 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg flex items-end p-4">
                    <div className="flex-1 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 70, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg text-center">
                      <p className="text-purple-400 font-bold">KES 8.2K</p>
                      <p className="text-gray-500 text-xs">Last Hour</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg text-center">
                      <p className="text-green-400 font-bold">23</p>
                      <p className="text-gray-500 text-xs">Sales</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg text-center">
                      <p className="text-blue-400 font-bold">KES 357</p>
                      <p className="text-gray-500 text-xs">Avg Sale</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Real-Time Updates as You Sell
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your dashboard updates instantly with every sale. No waiting, no refreshing. 
                See your business performance as it happens.
              </p>
              <ul className="space-y-3">
                {[
                  'Live sales counter and revenue',
                  'Instant profit calculations',
                  'Real-time inventory levels',
                  'Active cashier monitoring',
                  'Peak hour identification',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Unlock Your Business Insights?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Start your free trial and see how analytics can transform your decision-making.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/pricing" 
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              View All Features →
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
