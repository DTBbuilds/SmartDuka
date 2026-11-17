'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BarChart3, CheckCircle2, ChevronRight, Clock3, Headphones,
  Layers3, Package, ReceiptText, ScanLine, ShieldCheck, ShoppingCart,
  Store, TrendingUp, Users,
} from 'lucide-react';
import { AppStartupScreen } from '@/components/app-startup-screen';
import { SmartDukaLogo } from '@/components/brand/smartduka-logo';
import { CartLoader } from '@/components/ui/cart-loader';
import { ThemeToggleOutline } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth-context';

const highlights = [
  { icon: ShoppingCart, title: 'Sell with fewer steps', detail: 'Search, scan, build a cart and finish the sale in your POS workspace.' },
  { icon: Package, title: 'Know what is in stock', detail: 'Organise your products, adjust inventory and catch low-stock items.' },
  { icon: BarChart3, title: 'Understand each day', detail: 'See orders, sales performance and the activity behind your numbers.' },
  { icon: Users, title: 'Give your team a clear role', detail: 'Set up cashier access and keep the selling experience focused.' },
  { icon: ReceiptText, title: 'Keep a usable sales history', detail: 'Find order details and receipts when a customer needs help.' },
  { icon: Store, title: 'Grow beyond one counter', detail: 'Manage your shop today and explore more advanced operations as you grow.' },
];

const dailyFlow = [
  { icon: Clock3, title: 'Open your day', detail: 'Check what needs attention before the first customer.' },
  { icon: ScanLine, title: 'Serve each customer', detail: 'Go straight to POS, scan or search products and complete the sale.' },
  { icon: TrendingUp, title: 'Close with clarity', detail: 'Review the day’s orders, sales and low-stock items.' },
];

function InterfacePreview() {
  return (
    <div aria-label="Illustrative SmartDuka point of sale interface"
      className="relative mx-auto w-full max-w-[520px] rounded-[2rem] border border-white/15 bg-slate-950 p-3 shadow-[0_30px_75px_-18px_rgba(15,23,42,0.35)] sm:p-5">
      <div className="absolute -right-2 -top-3 hidden rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 shadow-lg sm:block">
        Built for busy counters
      </div>
      <div className="overflow-hidden rounded-2xl bg-white text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Store aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-none">Your shop</p>
              <p className="mt-1 text-[11px] text-slate-500">Point of sale workspace</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Ready to sell</span>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">New sale</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
              <ScanLine aria-hidden="true" className="h-3.5 w-3.5" /> Scan items
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <Package aria-hidden="true" className="h-4 w-4" /> Search products or scan a barcode
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Products', icon: Package },
              { name: 'Receipts', icon: ReceiptText },
              { name: 'Reports', icon: BarChart3 },
            ].map((item) => (
              <div key={item.name} className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <item.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold">{item.name}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Your retail routine</p>
            <div className="space-y-3">
              {['Track what you sell', 'Keep stock organised', 'See how today is going'].map((task) => (
                <div key={task} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-orange-600" /> {task}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="px-2 pt-3 text-center text-[11px] text-slate-300">
        Illustrative interface · No customer or business data shown
      </p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!appReady || loading || !isAuthenticated || !user) return;
    if (user.role === 'admin') router.replace('/admin');
    if (user.role === 'cashier') router.replace('/cashier/dashboard');
    if (user.role === 'super_admin') router.replace('/super-admin');
  }, [user, loading, isAuthenticated, router, appReady]);

  if (!appReady) return <AppStartupScreen onReady={() => setAppReady(true)} />;
  if (loading || (isAuthenticated && user)) return <CartLoader fullScreen title="Opening SmartDuka" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only rounded-md bg-background p-3 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70]">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="SmartDuka homepage" className="flex shrink-0 items-center">
            <SmartDukaLogo size="md" />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
            <a href="#daily-routine" className="text-sm font-medium text-muted-foreground hover:text-foreground">How it works</a>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Plans</Link>
            <a href="#support" className="text-sm font-medium text-muted-foreground hover:text-foreground">Support</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted sm:px-4">Sign in</Link>
            <Link href="/register-shop" className="hidden min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex">Start your shop</Link>
            <ThemeToggleOutline />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-orange-50/80 via-background to-background py-12 dark:from-orange-950/20 sm:py-16 lg:py-20">
          <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8">
            <div className="relative">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50 px-3 py-2 text-xs font-bold tracking-wide text-orange-800 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-200">
                <Store aria-hidden="true" className="h-4 w-4" /> A smarter way to run your shop
              </p>
              <h1 className="max-w-2xl text-[clamp(2.6rem,7vw,4.9rem)] font-extrabold leading-[1.04] tracking-[-0.045em]">
                Run your shop smarter.
                <span className="mt-2 block text-orange-600 dark:text-orange-400">Sell faster. Grow with confidence.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Bring your sales, stock, staff and daily numbers together in one easy-to-use point of sale workspace. Spend less time juggling records and more time serving customers.
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Link href="/register-shop" className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-7 text-base font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto">
                  Create your shop <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
                <Link href="/login" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-7 text-base font-bold shadow-sm transition-colors hover:bg-muted sm:w-auto">
                  Already use SmartDuka? Sign in
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-orange-600" /> Start at no cost today</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-orange-600" /> No card required to start</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-orange-600" /> Built for retail teams</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Introductory free access is currently available. Future usage limits and paid plans will be announced before they take effect. <Link href="/pricing" className="font-semibold text-orange-700 underline-offset-2 hover:underline dark:text-orange-300">View current terms</Link>.
              </p>
            </div>
            <InterfacePreview />
          </div>
        </section>

        <section id="features" className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-orange-600">Your daily operations, connected</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything starts with a better selling day.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">One organised place for the tasks retailers return to every day.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((feature) => (
                <article key={feature.title} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-lg">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                    <feature.icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="daily-routine" className="border-y border-border bg-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-orange-600">A POS you return to</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">From opening time to your last receipt.</h2>
              <p className="mt-4 text-muted-foreground">Designed around a real shopkeeper’s routine—not another complicated dashboard.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {dailyFlow.map((step, index) => (
                <article key={step.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                      <step.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-orange-600">Start small. Grow when you're ready.</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Professional shop tools, without a big commitment.</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                SmartDuka currently offers introductory free access. We are designing a lasting free plan for smaller shops, with optional upgrades for higher product capacity, more staff, branches and advanced reporting.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Changes will be clearly published before any limit is enforced. Existing sales records remain yours to access.
              </p>
              <Link href="/pricing" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl font-bold text-orange-700 underline-offset-4 hover:underline dark:text-orange-300">
                See current access and planned tiers <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
            <div className="rounded-[1.7rem] border border-border bg-card p-6 shadow-xl shadow-slate-950/5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Available today</p>
                  <h3 className="mt-1 text-2xl font-extrabold">Start with SmartDuka</h3>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">No card required</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  'Set up your shop and inventory',
                  'Manage sales with your POS workspace',
                  'Review receipts and basic sales activity',
                  'Use the app from your existing device',
                ].map((item) => (
                  <li key={item} className="flex gap-3"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{item}</li>
                ))}
              </ul>
              <Link href="/register-shop" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Start setting up your shop <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">See the full current terms on the plans page.</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your shop deserves a dependable system.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-slate-300">
              Build a clear record of products, orders and daily operations. Grow your business without losing sight of what is happening at the counter.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register-shop" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 font-bold text-white hover:bg-orange-700">
                Create your shop <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/30 px-7 font-bold text-white hover:bg-white/10">
                Sign in to SmartDuka
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="support" className="border-t border-border bg-background py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <SmartDukaLogo size="md" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Point of sale and shop management built for your everyday retail routine.</p>
            </div>
            <div>
              <h3 className="font-bold">Explore</h3>
              <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
                <a href="#features" className="hover:text-foreground">Features</a>
                <Link href="/pricing" className="hover:text-foreground">Plans and current terms</Link>
                <Link href="/login" className="hover:text-foreground">Shop sign in</Link>
                <Link href="/register-shop" className="hover:text-foreground">Create a shop</Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold">Support</h3>
              <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
                <a href="mailto:smartdukainfo@gmail.com" className="inline-flex items-center gap-2 hover:text-foreground"><Headphones aria-hidden="true" className="h-4 w-4" /> smartdukainfo@gmail.com</a>
                <Link href="/support" className="hover:text-foreground">Help and support</Link>
                <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
                <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} SmartDuka. All rights reserved.</span>
            <span>Created by <a href="https://www.dtbtech.org" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-foreground">DTB Technologies</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
