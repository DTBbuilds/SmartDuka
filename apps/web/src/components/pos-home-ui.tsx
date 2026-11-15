'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Home, Menu, ReceiptText, ShoppingCart } from 'lucide-react';

type HomeAction = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export function POSHomeHero({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon: Icon = ShoppingCart,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  status?: string;
}) {
  return (
    <section aria-labelledby="pos-home-action" className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-card p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-300">{eyebrow}</p>
          <h2 id="pos-home-action" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          {status && <p className="mt-3 text-xs font-medium text-foreground">{status}</p>}
        </div>
        <div aria-hidden="true" className="hidden shrink-0 rounded-2xl bg-orange-500/10 p-4 text-orange-600 dark:text-orange-300 sm:block">
          <Icon className="h-10 w-10" />
        </div>
      </div>
      {onAction ? (
        <button type="button" onClick={onAction} className="mt-4 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit">
          <Icon aria-hidden="true" className="h-5 w-5" />
          <span>{actionLabel}</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : (
        <Link href={actionHref ?? '#'} className="mt-4 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit">
          <Icon aria-hidden="true" className="h-5 w-5" />
          <span>{actionLabel}</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

export function POSHomeMetric({
  label,
  value,
  description,
  href,
  loading = false,
}: {
  label: string;
  value: string | number | null;
  description?: string;
  href?: string;
  loading?: boolean;
}) {
  const body = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <strong className="mt-2 block truncate text-xl font-bold tabular-nums sm:text-2xl" aria-label={value === null ? label + ': unavailable' : undefined}>
        {loading ? <span className="inline-block h-6 w-20 animate-pulse rounded bg-muted" aria-label="Loading" /> : (value ?? '—')}
      </strong>
      {description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}
    </>
  );
  const cls = "block min-w-0 rounded-xl border border-border bg-card px-3 py-3 text-left sm:px-4 sm:py-4";
  return href ? (
    <Link href={href} className={cls + ' transition-colors hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'}>
      {body}
    </Link>
  ) : <div className={cls}>{body}</div>;
}

export function POSHomeQuickActions({ actions }: { actions: HomeAction[] }) {
  return (
    <div className={'grid grid-cols-2 gap-2 sm:gap-3 ' + (actions.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-4')}>
      {actions.map(({ label, description, href, icon: Icon }) => (
        <Link key={href + label} href={href}
          className="flex min-h-[80px] items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:items-center sm:p-4">
          <span aria-hidden="true" className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs leading-snug text-muted-foreground">{description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function POSHomeNotice({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'warning' | 'error';
}) {
  const color = tone === 'error'
    ? 'border-destructive/40 bg-destructive/10'
    : tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : 'border-border bg-muted/40';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={'rounded-xl border p-3 text-sm ' + color}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

// Only render on role-specific *home* pages, never inside the POS checkout.
// Cashier tabs intentionally scope receipts to the cashier dashboard.
export function POSHomeBottomNav({
  role,
  posHref,
  posLabel = 'POS',
  disablePOS = false,
}: {
  role: 'admin' | 'cashier';
  posHref: string;
  posLabel?: string;
  disablePOS?: boolean;
}) {
  const tabs = [
    { label: 'Home', href: role === 'admin' ? '/admin' : '/cashier/dashboard', icon: Home },
    { label: posLabel, href: posHref, icon: ShoppingCart, isPrimary: true },
    { label: role === 'admin' ? 'Orders' : 'My sales', href: role === 'admin' ? '/orders' : '/cashier/dashboard#recent-sales', icon: ReceiptText },
    { label: role === 'admin' ? 'More' : 'Shift', href: role === 'admin' ? '/settings' : '/cashier/dashboard#shift-details', icon: Menu },
  ];
  return (
    <nav aria-label="Dashboard quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1">
        {tabs.map(({ label, href, icon: Icon, isPrimary }, index) => {
          const className = 'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ' +
            (isPrimary ? 'text-primary' : index === 0 ? 'text-foreground' : 'text-muted-foreground');
          const body = <>
            <span className={isPrimary ? 'rounded-lg bg-primary px-3 py-1.5 text-primary-foreground' : ''}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>{label}</span>
          </>;
          if (isPrimary && disablePOS) {
            return <span key={index} aria-label="POS unavailable during break or while shift status is unknown" className={className + ' cursor-not-allowed opacity-50'}>{body}</span>;
          }
          return <Link key={index} href={href} aria-current={index === 0 ? 'page' : undefined} className={className}>{body}</Link>;
        })}
      </div>
    </nav>
  );
}
