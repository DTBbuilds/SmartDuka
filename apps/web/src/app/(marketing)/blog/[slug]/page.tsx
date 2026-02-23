import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  User,
  Tag,
} from 'lucide-react';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
}

const blogPosts: Record<string, BlogPost> = {
  'complete-guide-pos-system-kenya': {
    slug: 'complete-guide-pos-system-kenya',
    title: 'The Complete Guide to Choosing a POS System in Kenya (2025)',
    excerpt: 'Everything you need to know about selecting the right point of sale system for your Kenyan retail business.',
    content: `
## Introduction

Choosing the right Point of Sale (POS) system is one of the most important decisions you'll make for your retail business in Kenya. A good POS system does much more than process transactions—it helps you manage inventory, track sales, understand customer behavior, and grow your business.

## What is a POS System?

A POS (Point of Sale) system is the combination of hardware and software that allows you to process sales transactions. Modern POS systems go far beyond simple cash registers, offering features like:

- **Sales processing** - Ring up products, apply discounts, and accept multiple payment methods
- **Inventory management** - Track stock levels in real-time
- **Employee management** - Monitor staff performance and manage shifts
- **Customer data** - Build customer profiles and loyalty programs
- **Reporting** - Get insights into your business performance

## Key Features to Look For

### 1. M-Pesa Integration
In Kenya, M-Pesa is the most popular payment method. Your POS should integrate seamlessly with M-Pesa, allowing customers to pay via STK push for instant, hassle-free transactions.

### 2. Offline Capability
Internet connectivity can be unreliable. A good POS should work offline and sync data when connection is restored, ensuring you never miss a sale.

### 3. Inventory Management
Real-time stock tracking with low-stock alerts helps prevent stockouts and overstocking—both of which hurt your bottom line.

### 4. Multi-Branch Support
If you have or plan to have multiple locations, choose a POS that can manage all branches from a single dashboard.

### 5. User-Friendly Interface
Your cashiers should be able to learn the system quickly. A complicated interface leads to errors and slower checkout times.

## Types of POS Systems

### Cloud-Based POS
- Data stored online
- Accessible from anywhere
- Automatic updates
- Lower upfront costs

### Traditional POS
- Data stored locally
- Works without internet
- One-time purchase
- May require manual updates

## Pricing Considerations

When evaluating POS pricing, consider:

1. **Monthly subscription fees** - Ongoing costs for software
2. **Hardware costs** - Tablets, receipt printers, barcode scanners
3. **Setup fees** - Installation and training
4. **Transaction fees** - Percentage of each sale (for payment processing)
5. **Support costs** - Ongoing technical support

## Why SmartDuka?

SmartDuka is designed specifically for Kenyan retailers with:

- Native M-Pesa integration with STK push
- Full offline capability
- Real-time inventory management
- Multi-branch support
- Affordable pricing starting at KES 2,500/month
- Local 24/7 support in English and Swahili

## Conclusion

The right POS system can transform your business operations. Take time to evaluate your needs, compare options, and choose a system that will grow with your business.

Ready to try SmartDuka? Start your free 14-day trial today!
    `,
    category: 'Guides',
    author: 'SmartDuka Team',
    date: '2025-01-10',
    readTime: '12 min read',
    image: '/blog/pos-guide.jpg',
  },
  'mpesa-integration-retail-business': {
    slug: 'mpesa-integration-retail-business',
    title: 'How M-Pesa Integration Can Increase Your Retail Sales by 30%',
    excerpt: 'Discover how accepting M-Pesa payments through your POS can boost sales and improve customer satisfaction.',
    content: `
## The M-Pesa Revolution in Kenyan Retail

M-Pesa has transformed how Kenyans transact. With over 30 million active users, it's no longer optional for retailers—it's essential. But simply having a till number isn't enough. True M-Pesa integration with your POS system can dramatically improve your business.

## Benefits of M-Pesa POS Integration

### 1. Faster Checkout Times
With STK push integration, customers receive a payment prompt on their phone. No dialing, no typing till numbers—just enter PIN and done. This can reduce checkout time by 50%.

### 2. Reduced Cash Handling
Less cash means:
- Lower risk of theft
- Fewer counting errors
- Less time spent on cash reconciliation
- Safer work environment

### 3. Automatic Reconciliation
Every M-Pesa transaction is automatically recorded in your POS. No manual entry, no errors, no disputes about whether payment was received.

### 4. Better Customer Experience
Customers appreciate the convenience. Many prefer M-Pesa because:
- No need to carry cash
- Instant confirmation
- Transaction history for their records

### 5. Detailed Transaction Records
Every payment is logged with:
- Customer phone number
- Transaction code
- Exact timestamp
- Items purchased

## How to Integrate M-Pesa with Your POS

### Option 1: Till Number Only
Basic setup where customers manually enter your till number. Works but slow and error-prone.

### Option 2: QR Code
Customers scan a QR code to pay. Faster than manual but still requires customer action.

### Option 3: STK Push Integration (Recommended)
The cashier enters the customer's phone number, and they receive an automatic payment prompt. This is the gold standard.

## SmartDuka M-Pesa Integration

SmartDuka offers seamless STK push integration:

1. Add products to cart
2. Select M-Pesa as payment method
3. Enter customer phone number
4. Customer confirms with PIN
5. Payment confirmed instantly
6. Receipt printed with M-Pesa confirmation code

## Real Results

Businesses using SmartDuka's M-Pesa integration report:
- **30% increase** in average transaction value
- **50% faster** checkout times
- **Zero** reconciliation errors
- **Higher** customer satisfaction scores

## Getting Started

Ready to integrate M-Pesa with your POS? SmartDuka includes M-Pesa integration in all plans at no extra cost. Start your free trial today and experience the difference.
    `,
    category: 'M-Pesa',
    author: 'SmartDuka Team',
    date: '2025-01-08',
    readTime: '8 min read',
    image: '/blog/mpesa-retail.jpg',
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts[slug];
  
  if (!post) {
    return {
      title: 'Article Not Found | SmartDuka Blog',
    };
  }
  
  return {
    title: `${post.title} | SmartDuka Blog`,
    description: post.excerpt,
    keywords: [
      post.category.toLowerCase(),
      'POS Kenya',
      'retail tips',
      'SmartDuka blog',
    ],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      locale: 'en_KE',
    },
    alternates: {
      canonical: `https://www.smartduka.org/blog/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({
    slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts[slug];
  
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <Link href="/blog" className="text-orange-600 hover:underline">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ArticleJsonLd 
        article={{
          title: post.title,
          description: post.excerpt,
          image: `https://www.smartduka.org${post.image}`,
          datePublished: post.date,
          author: post.author,
          url: `https://www.smartduka.org/blog/${slug}`,
        }}
      />
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: 'https://www.smartduka.org' },
          { name: 'Blog', url: 'https://www.smartduka.org/blog' },
          { name: post.title, url: `https://www.smartduka.org/blog/${slug}` },
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
              <Link href="/features/pos" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/blog" className="text-orange-600 font-medium">Blog</Link>
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

      {/* Article Header */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              {post.category}
            </span>
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            {post.title}
          </h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{post.author}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.date).toLocaleDateString('en-KE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:text-orange-600 transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-ol:text-gray-600">
            {post.content.split('\n').map((line, index) => {
              if (line.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{line.replace('## ', '')}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{line.replace('### ', '')}</h3>;
              } else if (line.startsWith('- **')) {
                const match = line.match(/- \*\*(.+?)\*\* - (.+)/);
                if (match) {
                  return (
                    <div key={index} className="flex items-start gap-2 my-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span><strong>{match[1]}</strong> - {match[2]}</span>
                    </div>
                  );
                }
              } else if (line.startsWith('- ')) {
                return (
                  <div key={index} className="flex items-start gap-2 my-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span>{line.replace('- ', '')}</span>
                  </div>
                );
              } else if (line.match(/^\d+\. \*\*/)) {
                const match = line.match(/^(\d+)\. \*\*(.+?)\*\*$/);
                if (match) {
                  return (
                    <div key={index} className="flex items-start gap-3 my-3">
                      <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {match[1]}
                      </span>
                      <span className="font-bold">{match[2]}</span>
                    </div>
                  );
                }
              } else if (line.trim() && !line.startsWith('#')) {
                return <p key={index} className="my-4">{line}</p>;
              }
              return null;
            })}
          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section className="py-12 bg-orange-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-orange-100 mb-6">
            Start your free 14-day trial of SmartDuka today. No credit card required.
          </p>
          <Link 
            href="/register-shop" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
          >
            Get Started Free
          </Link>
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
