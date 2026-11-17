import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, CircleHelp, Layers3, ShieldCheck, ShoppingCart, Store,
} from 'lucide-react';
import { SmartDukaLogo } from '@/components/brand/smartduka-logo';
import { FAQJsonLd, ProductJsonLd } from '@/components/seo';

export const metadata: Metadata = {
  title: 'SmartDuka Plans | Start Your Shop at No Cost',
  description: 'Start using SmartDuka for your sales, inventory and receipts at no cost during the introductory period. Explore the proposed Free, Starter and Growth plans.',
  alternates: { canonical: 'https://www.smartduka.org/pricing' },
  openGraph: {
    title: 'SmartDuka Plans | Simple Shop Software That Grows with You',
    description: 'Start your shop at no cost today. Future plans will add capacity and advanced tools with clearly published terms.',
    type: 'website',
  },
};

const faqs = [
  {
    question: 'Can I use SmartDuka without paying today?',
    answer: 'Yes. Introductory free access is available now. Creating a shop does not require a subscription payment. Future limits and prices are proposals and are not yet enforced.',
  },
  {
    question: 'Are the planned 100 products a stock quantity limit?',
    answer: 'No. The proposed free-plan capacity is 100 distinct product records, not 100 units of stock. You could record multiple units of the same product without using additional product slots.',
  },
  {
    question: 'What happens if my shop grows past a proposed limit?',
    answer: 'We plan to let existing products, receipts and normal sales remain accessible, while upgrades increase new product, employee or branch capacity. These protections must be tested before rollout.',
  },
  {
    question: 'Will SmartDuka automatically charge me when paid plans launch?',
    answer: 'No automatic upgrade or charge is planned. Paid subscription terms and the available payment methods will be shown before a merchant chooses to pay.',
  },
  {
    question: 'Does the platform support M-Pesa payments?',
    answer: 'SmartDuka includes an M-Pesa integration, but availability depends on your shop configuration and safety controls. STK initiation may be paused; check your payment settings before offering it to customers.',
  },
];

const futurePlans = [
  {
    name: 'Free',
    tag: 'Proposed long-term free tier',
    description: 'For a single shop getting established.',
    icon: Store,
    features: ['1 shop', 'Up to 100 distinct products', 'Owner plus 1 cashier', 'Core checkout and inventory', 'Unlimited normal sales and stock units', 'Basic daily summaries'],
  },
  {
    name: 'Starter',
    tag: 'Planned upgrade',
    description: 'For one busier shop with a growing catalogue.',
    icon: ShoppingCart,
    features: ['1 shop', 'Up to 500 distinct products', 'Up to 3 employees', 'Full sales history', 'More detailed reporting', 'Customer and stock management'],
  },
  {
    name: 'Growth',
    tag: 'Planned upgrade',
    description: 'For businesses expanding their team and locations.',
    icon: Layers3,
    features: ['Up to 2 shops or branches', 'Up to 1,500 distinct products', 'Up to 5 employees', 'Multi-branch workflows', 'Expanded reporting and permissions', 'Business growth tools'],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FAQJsonLd faqs={faqs} />
      <ProductJsonLd plan={{
        name: 'SmartDuka Introductory Access',
        description: 'Introductory free access to SmartDuka shop management.',
        price: 0,
        priceCurrency: 'KES',
      }} />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="SmartDuka homepage"><SmartDukaLogo size="md" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">Sign in</Link>
            <Link href="/register-shop" className="inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700">Start your shop</Link>
          </div>
        </div>
      </header>
      <main>
        <section className="border-b border-border bg-gradient-to-br from-orange-50/70 via-background to-background py-16 dark:from-orange-950/20 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Clear terms. Room to grow.
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Start at no cost. <span className="text-orange-600">Grow on your terms.</span></h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              SmartDuka gives you an organised point of sale for the business you run today. We are preparing simple plans so you can pay for greater capacity when your shop needs it.
            </p>
            <Link href="/register-shop" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 text-base font-bold text-white hover:bg-orange-700">
              Create your shop <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="current-access" className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-[1.75rem] border border-emerald-500/25 bg-emerald-500/5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Current terms</p>
                  <h2 id="current-access" className="mt-2 text-2xl font-extrabold sm:text-3xl">Introductory free access is available now</h2>
                </div>
                <span className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">No card required to start</span>
              </div>
              <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
                You can set up a shop and use the existing core POS tools without a subscription charge during the current introductory period. The product and staff quotas below are <strong className="text-foreground">proposals, not active restrictions</strong>. We will publish final prices, usage terms and an effective date before activating them.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                No automatic paid upgrade. Existing shop data will not be deleted because of a plan change.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="future-plan-heading" className="border-y border-border bg-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-orange-600">Designed to scale with you</p>
              <h2 id="future-plan-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Proposed future plans</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">These capacities are for review and planning, not yet active or available for purchase. Paid prices will be announced when billing is ready.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {futurePlans.map((plan, index) => (
                <article key={plan.name} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm sm:p-8">
                  <div className="mb-6 flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                      <plan.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{index === 0 ? 'A starting point' : 'For growing shops'}</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">{plan.tag}</p>
                  <h3 className="mt-2 text-2xl font-extrabold">{plan.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                  <ul className="mt-5 space-y-3 border-t border-border pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-7 rounded-lg bg-muted px-3 py-3 text-center text-xs font-semibold text-muted-foreground">
                    {index === 0 ? 'Proposed always-free capacity' : 'Not yet available for purchase'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-9 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <CircleHelp aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">Questions shop owners ask</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-xl border border-border bg-card p-5">
                  <summary className="cursor-pointer list-item font-bold marker:text-orange-600">{faq.question}</summary>
                  <p className="mt-3 pl-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Need help with your shop? <Link href="/support" className="font-semibold text-orange-700 hover:underline dark:text-orange-300">Contact SmartDuka support</Link>.
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SmartDuka. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/" className="hover:text-foreground">Homepage</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
