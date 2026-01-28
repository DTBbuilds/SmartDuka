'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppStartupScreen } from '@/components/app-startup-screen';
import { 
  ShoppingCart, Smartphone, Package, BarChart3, Users, CheckCircle, ArrowRight, 
  Shield, Zap, Camera, Receipt, Brain, Wallet, Phone, Mail, Clock, 
  Sparkles, TrendingUp, ChevronRight, Star, CreditCard, Building2
} from 'lucide-react';
import { ThemeToggleOutline } from '@/components/theme-toggle';

export default function Home() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!appReady || loading) return;

    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'cashier') {
        router.push('/cashier/dashboard');
      } else if (user.role === 'super_admin') {
        router.push('/super-admin');
      }
    }
  }, [user, loading, isAuthenticated, router, appReady]);

  // Show startup screen until app is ready
  if (!appReady) {
    return <AppStartupScreen onReady={() => setAppReady(true)} />;
  }

  // Show loading while checking auth for authenticated users
  if (loading || (isAuthenticated && user)) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    { 
      icon: Brain, 
      title: 'AI-Powered Insights', 
      description: 'Smart predictions & analytics powered by our AI Hyper Engine',
      color: 'from-violet-500 to-purple-600'
    },
    { 
      icon: Camera, 
      title: 'Smart Scanning', 
      description: 'Camera barcode scanning & hardware scanner support',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: Wallet, 
      title: 'M-Pesa & Pochi', 
      description: 'Accept Send Money & Pochi la Biashara payments',
      color: 'from-emerald-500 to-green-600'
    },
    { 
      icon: Receipt, 
      title: 'Smart Invoicing', 
      description: 'Professional invoices with payment tracking',
      color: 'from-amber-500 to-orange-500'
    },
    { 
      icon: Package, 
      title: 'Inventory Control', 
      description: 'Real-time stock tracking with low-stock alerts',
      color: 'from-rose-500 to-pink-600'
    },
    { 
      icon: BarChart3, 
      title: 'Sales Analytics', 
      description: 'Comprehensive reports & performance metrics',
      color: 'from-indigo-500 to-blue-600'
    },
  ];

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'KES 1,000',
      period: '/month',
      description: 'Perfect for small shops',
      features: ['1 Shop', '2 Staff', '250 Items', 'Full POS System', 'M-Pesa Integration', 'Basic Reports'],
      color: 'slate'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 'KES 1,500',
      period: '/month',
      description: 'For growing businesses',
      features: ['2 Shops', '5 Staff', '750 Items', 'Multi-Branch Support', 'Advanced Analytics', 'Priority Support'],
      color: 'blue',
      popular: true
    },
    {
      id: 'silver',
      name: 'Silver',
      price: 'KES 2,500',
      period: '/month',
      description: 'Multiple locations',
      features: ['5 Shops', '15 Staff', '2,000 Items', 'Stock Transfers', 'Full Analytics', 'Priority Support'],
      color: 'purple'
    },
    {
      id: 'gold',
      name: 'Gold',
      price: 'KES 4,500',
      period: '/month',
      description: 'Large operations',
      features: ['10 Shops', '25 Staff', '4,000 Items', 'All Features', 'Dedicated Support', 'Custom Integrations'],
      color: 'amber'
    },
  ];

  // Hero/Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-primary to-orange-600 rounded-xl shadow-lg shadow-primary/20">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                SmartDuka
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                Contact
              </a>
            </nav>
            
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/register-shop" 
                className="hidden sm:flex px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                Start Free Trial
              </Link>
              <ThemeToggleOutline />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Kenya&apos;s Smartest POS System
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-foreground">Manage Your Business</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                Smarter & Faster
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Complete Point of Sale system with M-Pesa integration, AI-powered analytics, 
              and real-time inventory tracking. Built for Kenyan retailers.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link 
                href="/register-shop" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-card border border-border text-foreground rounded-xl font-semibold text-lg hover:bg-muted transition-colors shadow-sm"
              >
                Sign In
              </Link>
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Free setup & training
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Retail
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run your business efficiently, all in one platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Active Shops' },
              { value: '10K+', label: 'Daily Transactions' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Flexible Plans for Every Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start small and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative p-6 bg-card rounded-2xl border-2 transition-all ${
                  plan.popular 
                    ? 'border-primary shadow-xl shadow-primary/10' 
                    : 'border-border hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.slice(0, expandedPlan === plan.id ? undefined : 4).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {plan.features.length > 4 && (
                  <button 
                    onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                    className="text-sm text-primary hover:underline mb-4 flex items-center gap-1"
                  >
                    {expandedPlan === plan.id ? 'Show less' : `+${plan.features.length - 4} more features`}
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedPlan === plan.id ? 'rotate-90' : ''}`} />
                  </button>
                )}
                
                <Link 
                  href="/register-shop"
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-center block transition-all ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join hundreds of Kenyan businesses already using SmartDuka to streamline operations and boost sales.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register-shop" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
            >
              Start Your Free Trial
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-muted-foreground">
              Our team is here to help you get started
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Email */}
            <a 
              href="mailto:smartdukainfo@gmail.com" 
              className="flex flex-col items-center p-5 md:p-6 bg-card rounded-2xl border-2 border-border hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Email Us</h3>
              <p className="text-primary font-medium text-xs md:text-sm text-center">smartdukainfo@gmail.com</p>
              <span className="mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                Click to send email
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            {/* Phone 1 */}
            <a 
              href="tel:0729983567" 
              className="flex flex-col items-center p-5 md:p-6 bg-card rounded-2xl border-2 border-border hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
              <p className="text-primary font-medium text-sm">0729 983 567</p>
              <span className="mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                Click to call
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            {/* WhatsApp */}
            <a 
              href="https://wa.me/254729983567?text=Hello%20SmartDuka%2C%20I%20need%20help%20with" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-5 md:p-6 bg-card rounded-2xl border-2 border-border hover:border-green-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-green-500/20 transition-all">
                <svg className="h-7 w-7 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
              <p className="text-green-500 font-medium text-sm">0729 983 567</p>
              <span className="mt-3 text-xs text-muted-foreground group-hover:text-green-500 transition-colors flex items-center gap-1">
                Click to chat
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            {/* Help Line */}
            <a 
              href="tel:0104160502" 
              className="flex flex-col items-center p-5 md:p-6 bg-card rounded-2xl border-2 border-border hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Help Line</h3>
              <p className="text-primary font-medium text-sm">0104 160 502</p>
              <span className="mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                Click to call
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-gradient-to-br from-primary to-orange-600 rounded-xl">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">SmartDuka</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs mb-4">
                Kenya&apos;s smartest Point of Sale system. Built for modern retailers who want to grow their business.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>24/7 Support Available</span>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">Sign In</Link></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  smartdukainfo@gmail.com
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  0729 983 567
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  0104 160 502
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SmartDuka. All rights reserved.
            </p>
            <a 
              href="https://www.dtbtech.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-primary transition-all duration-300"
            >
              <span className="text-xs tracking-wide uppercase">Powered by</span>
              <span className="font-semibold text-foreground/80 group-hover:text-primary transition-colors">
                DTB Technologies
              </span>
              <svg 
                className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
