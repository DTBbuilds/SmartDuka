import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  Calendar,
  Clock,
  ArrowRight,
  Tag,
  User,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SmartDuka Blog - POS Tips, Retail Insights & Business Guides for Kenya',
  description: 'Expert guides on POS systems, inventory management, retail business tips, and M-Pesa integration for Kenyan businesses. Learn how to grow your retail business.',
  keywords: [
    'POS blog Kenya',
    'retail business tips',
    'inventory management guide',
    'M-Pesa business tips',
    'Kenya retail news',
    'small business Kenya',
    'duka management tips',
    'shop owner guide',
  ],
  openGraph: {
    title: 'SmartDuka Blog - POS Tips & Retail Insights',
    description: 'Expert guides on running a successful retail business in Kenya.',
    type: 'website',
    locale: 'en_KE',
  },
  alternates: {
    canonical: 'https://smartduka.co.ke/blog',
  },
};

const blogPosts = [
  {
    slug: 'complete-guide-pos-system-kenya',
    title: 'The Complete Guide to Choosing a POS System in Kenya (2025)',
    excerpt: 'Everything you need to know about selecting the right point of sale system for your Kenyan retail business. Compare features, pricing, and find your perfect match.',
    category: 'Guides',
    author: 'SmartDuka Team',
    date: '2025-01-10',
    readTime: '12 min read',
    featured: true,
    image: '/blog/pos-guide.jpg',
  },
  {
    slug: 'mpesa-integration-retail-business',
    title: 'How M-Pesa Integration Can Increase Your Retail Sales by 30%',
    excerpt: 'Discover how accepting M-Pesa payments through your POS can boost sales, reduce cash handling risks, and improve customer satisfaction.',
    category: 'M-Pesa',
    author: 'SmartDuka Team',
    date: '2025-01-08',
    readTime: '8 min read',
    featured: true,
    image: '/blog/mpesa-retail.jpg',
  },
  {
    slug: 'inventory-management-best-practices',
    title: '10 Inventory Management Best Practices for Kenyan Retailers',
    excerpt: 'Learn proven strategies to reduce stockouts, minimize waste, and optimize your inventory levels for maximum profitability.',
    category: 'Inventory',
    author: 'SmartDuka Team',
    date: '2025-01-05',
    readTime: '10 min read',
    featured: false,
    image: '/blog/inventory-tips.jpg',
  },
  {
    slug: 'retail-analytics-data-driven-decisions',
    title: 'Using Sales Analytics to Make Smarter Business Decisions',
    excerpt: 'How to leverage your POS data to identify trends, optimize pricing, and make data-driven decisions that grow your business.',
    category: 'Analytics',
    author: 'SmartDuka Team',
    date: '2025-01-03',
    readTime: '7 min read',
    featured: false,
    image: '/blog/analytics-guide.jpg',
  },
  {
    slug: 'employee-management-retail-tips',
    title: 'Managing Retail Employees: A Guide for Kenyan Shop Owners',
    excerpt: 'Tips for hiring, training, and retaining great cashiers and staff. Plus, how to use technology to improve productivity.',
    category: 'Management',
    author: 'SmartDuka Team',
    date: '2024-12-28',
    readTime: '9 min read',
    featured: false,
    image: '/blog/employee-management.jpg',
  },
  {
    slug: 'reduce-theft-shrinkage-retail',
    title: 'How to Reduce Theft and Shrinkage in Your Retail Store',
    excerpt: 'Practical strategies to minimize losses from theft, employee fraud, and inventory errors. Protect your profits with these proven methods.',
    category: 'Security',
    author: 'SmartDuka Team',
    date: '2024-12-25',
    readTime: '8 min read',
    featured: false,
    image: '/blog/reduce-theft.jpg',
  },
];

const categories = [
  { name: 'All', count: blogPosts.length },
  { name: 'Guides', count: blogPosts.filter(p => p.category === 'Guides').length },
  { name: 'M-Pesa', count: blogPosts.filter(p => p.category === 'M-Pesa').length },
  { name: 'Inventory', count: blogPosts.filter(p => p.category === 'Inventory').length },
  { name: 'Analytics', count: blogPosts.filter(p => p.category === 'Analytics').length },
  { name: 'Management', count: blogPosts.filter(p => p.category === 'Management').length },
];

export default function BlogPage() {
  const featuredPosts = blogPosts.filter(p => p.featured);
  const regularPosts = blogPosts.filter(p => !p.featured);

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
              <Link href="/features/pos" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/blog" className="text-blue-600 font-medium">Blog</Link>
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
      <section className="py-16 bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              SmartDuka Blog
            </h1>
            <p className="text-xl text-gray-600">
              Expert guides, tips, and insights to help you run a successful retail business in Kenya. 
              Learn about POS systems, inventory management, M-Pesa integration, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.name}
                className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Articles</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-gray-50 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Store className="h-16 w-16 text-blue-400" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.date).toLocaleDateString('en-KE', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">All Articles</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Tag className="h-10 w-10 text-gray-400" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {post.category}
                    </span>
                    <span className="text-gray-400 text-xs">{post.readTime}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.excerpt}</p>
                  <div className="text-sm text-gray-500">
                    {new Date(post.date).toLocaleDateString('en-KE', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Get Retail Tips Delivered to Your Inbox
          </h2>
          <p className="text-blue-100 mb-6">
            Subscribe to our newsletter for weekly tips on running a successful retail business in Kenya.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg text-gray-900 w-full sm:w-80"
            />
            <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Subscribe
            </button>
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
