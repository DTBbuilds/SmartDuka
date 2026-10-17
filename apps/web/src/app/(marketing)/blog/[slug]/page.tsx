import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost } from '@/lib/blog-posts';
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

// Only the six prerendered articles exist; unknown slugs must return a
// genuine HTTP 404 at the routing level (a static shell would flush 200
// before the streamed notFound() could change the status).
export const dynamicParams = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: 'Article Not Found | SmartDuka Blog',
      robots: { index: false, follow: false },
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
  return blogPosts.map((p) => ({
    slug: p.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  // Unknown slugs must be a genuine HTTP 404 — never a 200 error page
  // (soft-404s get crawled as thin duplicate content).
  if (!post) {
    notFound();
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
            Start using SmartDuka free today. No credit card required.
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
