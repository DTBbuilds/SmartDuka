import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Package, 
  Smartphone,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Clock,
  Globe,
  Phone,
  Mail,
  Download,
} from 'lucide-react';
import { FAQJsonLd, WebPageJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'SmartDuka \u2013 Free Open Source Point of Sale & Inventory Management',
  description: 'SmartDuka is a 100% free, open source point of sale and inventory management system. No subscriptions, no hidden fees, no user data collected. M-Pesa integration, barcode scanning, analytics \u2014 all free forever.',
  keywords: [
    'SmartDuka',
    'Smart Duka',
    'smart duka',
    'smartduka',
    'Smart Duka POS',
    'free point of sale software',
    'free POS system',
    'open source POS',
    'free inventory management',
    'free stock management',
    'free retail POS',
    'free barcode POS',
    'free sales software',
    'free web-based POS',
    'DTB Technologies',
    'free cloud POS',
    'free multi-store POS',
    'no subscription POS',
    'M-Pesa POS system',
  ],
  openGraph: {
    title: 'SmartDuka \u2013 Free Open Source Point of Sale & Inventory Management',
    description: '100% free, open source POS and inventory management. No subscriptions, no hidden fees, no user data collected. Built for African retailers.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'SmartDuka',
    url: 'https://www.smartduka.org',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartDuka \u2013 Free Open Source POS System',
    description: '100% free, open source POS and inventory management. No subscriptions, no data collection. Built for African retailers.',
    creator: '@smartduka',
    site: '@smartduka',
  },
  alternates: {
    canonical: 'https://www.smartduka.org',
    languages: {
      'en': 'https://www.smartduka.org',
      'en-KE': 'https://www.smartduka.org',
      'x-default': 'https://www.smartduka.org',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const features = [
  {
    icon: ShoppingCart,
    title: 'Fast POS Checkout',
    description: 'Process sales quickly with barcode scanning, touch interface, and instant receipt printing.',
  },
  {
    icon: Smartphone,
    title: 'M-Pesa Integration',
    description: 'Accept M-Pesa payments directly. Instant confirmation with STK push technology.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Track stock levels in real-time. Get low stock alerts and manage suppliers efficiently.',
  },
  {
    icon: BarChart3,
    title: 'Sales Analytics',
    description: 'Comprehensive reports on sales, profits, and trends to grow your business.',
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Manage cashiers, track shifts, and monitor staff performance easily.',
  },
  {
    icon: Store,
    title: 'Multi-Branch Support',
    description: 'Manage multiple shops from one dashboard. Sync inventory across locations.',
  },
];

const benefits = [
  'No hardware lock-in - works on any device',
  'Offline mode - keep selling even without internet',
  'Free training and 24/7 support',
  'Data backup and security included',
  'Regular updates with new features',
  'Swahili and English language support',
];

const testimonials = [
  {
    name: 'Mary Wanjiku',
    business: 'Mama Mary Supermarket, Nairobi',
    quote: 'SmartDuka transformed how I manage my supermarket. M-Pesa integration is seamless!',
    rating: 5,
  },
  {
    name: 'John Ochieng',
    business: 'Quick Mart Electronics, Kisumu',
    quote: 'The inventory tracking saved me from stockouts. My customers are always happy now.',
    rating: 5,
  },
  {
    name: 'Fatuma Hassan',
    business: 'Coastal Fashion, Mombasa',
    quote: 'Easy to use and my staff learned it in just one day. Great support team!',
    rating: 5,
  },
];

const stats = [
  { value: '5,000+', label: 'Active Businesses' },
  { value: 'KES 2B+', label: 'Transactions Processed' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '24/7', label: 'Customer Support' },
];

const homepageFaqs = [
  {
    question: 'What is point of sale software?',
    answer: 'Point of sale (POS) software is a system that processes sales transactions in retail businesses. It handles checkout, payment processing, receipt generation, and integrates with inventory and reporting tools. SmartDuka is a web-based POS system that runs on any device with a browser.',
  },
  {
    question: 'What is inventory management software?',
    answer: 'Inventory management software tracks stock levels, manages purchase orders, provides low stock alerts, and maintains inventory history. SmartDuka combines inventory management with POS so every sale automatically updates your stock in real time.',
  },
  {
    question: 'Can SmartDuka work with barcode scanners?',
    answer: 'Yes. SmartDuka supports USB and Bluetooth barcode scanners as well as camera-based barcode scanning on mobile devices. This speeds up checkout and reduces errors in product lookup.',
  },
  {
    question: 'Is SmartDuka cloud-based?',
    answer: 'Yes. SmartDuka is a cloud-based web POS system. You can access it from any device with a web browser. It also supports offline mode so you can continue selling even without an internet connection.',
  },
  {
    question: 'Who owns SmartDuka?',
    answer: 'SmartDuka is built and owned by DTB Technologies. You can learn more about the company at https://www.dtbtech.org.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <FAQJsonLd faqs={homepageFaqs} />
      <WebPageJsonLd 
        name="SmartDuka \u2013 Free Open Source Point of Sale & Inventory Management"
        description="SmartDuka is a 100% free, open source point of sale and inventory management system by DTB Technologies. No subscriptions, no user data collected."
        url="https://www.smartduka.org"
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
              <Link href="/features/pos" className="text-gray-600 hover:text-gray-900">Features</Link>
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
                className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-green-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                100% Free &amp; Open Source
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                SmartDuka &ndash; <span className="text-orange-600">Point of Sale</span> & Inventory Management Software
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                SmartDuka (Smart Duka) is a web-based <Link href="/point-of-sale-software" className="text-orange-600 hover:underline">point of sale</Link> and{' '}
                <Link href="/inventory-management-software" className="text-orange-600 hover:underline">inventory management software</Link> built
                by <a href="https://www.dtbtech.org" className="text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">DTB Technologies</a>.
                It helps retail businesses manage sales, inventory, reports, analytics, and barcode scanning using existing hardware.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Link 
                  href="/register-shop" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link 
                  href="/features/pos" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 transition-colors"
                >
                  See All Features
                </Link>
              </div>
              
              {/* Android App Download */}
              <div className="mb-8">
                <a 
                  href="https://github.com/DTBbuilds/SmartDuka/releases/latest/download/smartduka.apk"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                  download
                >
                  <Download className="h-5 w-5" />
                  Download Android App
                  <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full ml-1">APK</span>
                </a>
                <p className="text-sm text-gray-500 mt-2">
                  Install directly on your Android phone for the best experience
                </p>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Free forever
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  No data collected
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Open source
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-4 border">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Store className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                    <p className="text-gray-500">SmartDuka POS Dashboard</p>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                ✓ M-Pesa Ready
              </div>
              <div className="absolute -bottom-4 -left-4 bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                Works Offline
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-orange-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SmartDuka POS Software Features */}
      <section className="py-20 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              SmartDuka POS Software Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              SmartDuka combines point of sale, inventory management, and analytics into one 
              web-based platform for retail businesses.
            </p>
          </div>

          {/* Visible feature bullet list for SEO */}
          <div className="max-w-2xl mx-auto mb-16 bg-orange-50 rounded-2xl p-8">
            <ul className="space-y-4 text-lg text-gray-800">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span><Link href="/point-of-sale-software" className="font-semibold text-orange-700 hover:underline">Point of Sale (POS) system</Link> &ndash; fast checkout with receipt printing</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span><Link href="/inventory-management-software" className="font-semibold text-orange-700 hover:underline">Inventory and stock management</Link> &ndash; real-time tracking across stores</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>Real-time sales tracking &ndash; know your numbers instantly</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span><Link href="/reports-and-analytics" className="font-semibold text-orange-700 hover:underline">Sales reports and analytics</Link> &ndash; daily, weekly, monthly insights</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span><Link href="/barcode-pos-system" className="font-semibold text-orange-700 hover:underline">Barcode scanner and camera integration</Link> &ndash; faster, error-free checkout</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>Multi-user and multi-store support &ndash; scale your business</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>Cloud-based web POS system &ndash; access from any device</span>
              </li>
            </ul>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-8 bg-gray-50 rounded-2xl hover:bg-orange-50 transition-colors group"
              >
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                  <feature.icon className="h-7 w-7 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/point-of-sale-software" 
              className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700"
            >
              Learn more about our POS software
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why SmartDuka Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why Kenyan Businesses Choose SmartDuka
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built specifically for the Kenyan market, SmartDuka understands the unique 
                needs of local retailers. From M-Pesa integration to Swahili support, 
                we&apos;ve got you covered.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Link 
                  href="/register-shop" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Get Started Today
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <Shield className="h-10 w-10 text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Secure & Reliable</h3>
                <p className="text-gray-600 text-sm">Bank-grade security for your business data</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <Clock className="h-10 w-10 text-green-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Quick Setup</h3>
                <p className="text-gray-600 text-sm">Start selling in under 30 minutes</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <Globe className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Works Anywhere</h3>
                <p className="text-gray-600 text-sm">Cloud-based with offline support</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <Users className="h-10 w-10 text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Local Support</h3>
                <p className="text-gray-600 text-sm">Kenyan support team, always available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Businesses Across Kenya
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say about SmartDuka
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-2xl">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-500 text-sm">{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join thousands of Kenyan businesses using SmartDuka to grow their sales 
            and manage their inventory efficiently.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link 
              href="/pricing" 
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              See All Features
            </Link>
          </div>
        </div>
      </section>

      {/* About SmartDuka */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">About SmartDuka</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            SmartDuka is a web-based point of sale and inventory management software built and owned
            by <a href="https://www.dtbtech.org" className="text-orange-600 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">DTB Technologies</a>.
            It is designed to help retail businesses manage sales, stock, reports, and analytics
            through a single cloud-based platform that works on any device.
          </p>
          <p className="text-gray-600">
            Whether you run a single shop or multiple stores, SmartDuka gives you the tools
            to process transactions, track inventory in real time, generate business reports,
            and scan barcodes &mdash; all without expensive hardware.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">SmartDuka</span>
              </Link>
              <p className="text-gray-400 mb-2">
                Point of sale and inventory management software by{' '}
                <a href="https://www.dtbtech.org" className="text-orange-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">DTB Technologies</a>.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                <span>0729983567 / 0104160502</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-2">
                <Mail className="h-4 w-4" />
                <span>smartdukainfo@gmail.com</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/point-of-sale-software" className="hover:text-white transition-colors">Point of Sale Software</Link></li>
                <li><Link href="/inventory-management-software" className="hover:text-white transition-colors">Inventory Management</Link></li>
                <li><Link href="/reports-and-analytics" className="hover:text-white transition-colors">Reports &amp; Analytics</Link></li>
                <li><Link href="/barcode-pos-system" className="hover:text-white transition-colors">Barcode POS System</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="https://www.dtbtech.org" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">DTB Technologies</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} SmartDuka &ndash; Built by <a href="https://www.dtbtech.org" className="text-orange-400 hover:text-white" target="_blank" rel="noopener noreferrer">DTB Technologies</a>. All rights reserved.
            </p>
            <p className="text-sm">
              <Link href="/" className="hover:text-white">Home</Link>
              {' · '}
              <Link href="/pricing" className="hover:text-white">Pricing</Link>
              {' · '}
              <Link href="/register-shop" className="hover:text-white">Get Started Free</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
