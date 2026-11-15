'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { formatMoney } from '@/lib/currency';
import { AuthGuard } from '@/components/auth-guard';
import { resolveCashierHomeAction, type CashierHomeShiftState } from '@/lib/pos-home-logic';
import { shiftActivityTracker, type ShiftActivityState } from '@/lib/shift-activity-tracker';
import {
  POSHomeHero, POSHomeMetric, POSHomeQuickActions,
  POSHomeNotice, POSHomeBottomNav,
} from '@/components/pos-home-ui';
import { Button } from '@smartduka/ui';
import {
  Activity, Coffee, Clock, LogOut, Play, ReceiptText, ShoppingCart, Square,
} from 'lucide-react';

type Shift = {
  _id: string;
  startTime: string;
  openingBalance: number;
  status: 'open' | 'closed' | 'reconciled';
  totalSales?: number;
  transactionCount?: number;
  expectedCash?: number;
};
type Receipt = {
  id: string;
  total: number;
  createdAt: string;
  paymentStatus?: string;
};
type CashierStats = {
  todaySales: number;
  todayTransactions: number;
  averageTransaction: number;
  recentOrders: Receipt[];
};

function CashierDashboardContent() {
  const router = useRouter();
  const { user, shop, token, logout } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftState, setShiftState] = useState<CashierHomeShiftState>('loading');
  const [shiftRetry, setShiftRetry] = useState(0);
  const [stats, setStats] = useState<CashierStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [activityState, setActivityState] = useState<ShiftActivityState | null>(null);
  const [breakBusy, setBreakBusy] = useState(false);
  const [breakError, setBreakError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(true);

  const refreshShift = useCallback(() => setShiftRetry((k) => k + 1), []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const connected = () => setIsOnline(true);
    const disconnected = () => setIsOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
      window.clearInterval(clock);
    };
  }, []);

  // Shift state comes from the server; a failed request must not look like "no shift".
  useEffect(() => {
    if (!token || !user) {
      setShift(null);
      setShiftState('error');
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setShiftState('loading');
      setShift(null);
      try {
        const response = await fetch(`${config.apiUrl}/shifts/current`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 404) {
          if (!controller.signal.aborted) setShiftState('none');
          return;
        }
        if (!response.ok) throw new Error('Shift status request failed');
        const payload = await response.json() as Shift | null;
        if (controller.signal.aborted) return;
        if (!payload) {
          setShiftState('none');
          return;
        }
        setShift(payload);
        setShiftState(payload.status === 'open' ? 'active' : 'pending');
      } catch {
        if (!controller.signal.aborted) setShiftState('error');
      }
    };
    void load();
    return () => controller.abort();
  }, [token, user?.shopId, shiftRetry]);

  useEffect(() => {
    if (!token || !user) {
      setStatsLoading(false);
      return;
    }
    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError(false);
    setStats(null);
    void fetch(`${config.apiUrl}/sales/cashier-stats`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Cashier stats request failed');
      return (await res.json()) as CashierStats;
    }).then((data) => {
      if (controller.signal.aborted) return;
      if (!Number.isFinite(data?.todaySales) || !Number.isFinite(data?.todayTransactions)) {
        throw new Error('Invalid cashier metrics');
      }
      setStats(data);
    }).catch(() => {
      if (!controller.signal.aborted) setStatsError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setStatsLoading(false);
    });
    return () => controller.abort();
  }, [token, user?.shopId, shiftRetry]);

  useEffect(() => {
    if (!token || !shift?._id || shiftState !== 'active') {
      setActivityState(null);
      setIsOnBreak(false);
      return;
    }
    shiftActivityTracker.initialize(shift._id, token);
    const unsubscribe = shiftActivityTracker.subscribe((state) => {
      setActivityState(state);
      setIsOnBreak(state.isOnBreak);
    });
    return () => {
      unsubscribe();
      shiftActivityTracker.cleanup();
    };
  }, [token, shift?._id, shiftState]);

  const toggleBreak = async () => {
    if (breakBusy || shiftState !== 'active') return;
    setBreakBusy(true);
    setBreakError(false);
    try {
      const success = isOnBreak
        ? await shiftActivityTracker.endBreak()
        : await shiftActivityTracker.startBreak('Break');
      if (!success) throw new Error('Unable to update break');
      setIsOnBreak(!isOnBreak);
    } catch {
      setBreakError(true);
    } finally {
      setBreakBusy(false);
    }
  };

  const handleLogout = () => {
    shiftActivityTracker.cleanup();
    logout();
    router.push('/login');
  };

  const currency = shop?.currency;
  const money = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? formatMoney(value, currency) : null;
  const shiftDuration = shift?.startTime && shiftState === 'active'
    ? Math.max(0, Math.floor((now - new Date(shift.startTime).getTime()) / 60_000))
    : null;
  const elapsed = shiftDuration === null || !Number.isFinite(shiftDuration) ? '—'
    : shiftDuration >= 60 ? `${Math.floor(shiftDuration / 60)}h ${shiftDuration % 60}m`
      : `${shiftDuration}m`;

  const isActive = shiftState === 'active';
  const nextAction = resolveCashierHomeAction(shiftState, isOnBreak);
  const hero = shiftState === 'loading' ? {
    eyebrow: 'Checking shift', title: 'Verifying your shift',
    description: 'Your selling access will appear after we confirm the shift state.',
    actionLabel: 'Check again', icon: Clock,
  } : shiftState === 'error' ? {
    eyebrow: 'Action required', title: 'Shift status unavailable',
    description: 'We could not confirm your current shift. Do not start another one until the status is verified.',
    actionLabel: 'Retry shift check', icon: Clock,
  } : shiftState === 'none' ? {
    eyebrow: 'Before selling', title: 'Start your shift',
    description: 'Confirm your till opening balance to begin tracking sales and cash.',
    actionLabel: 'Start shift', icon: Play,
  } : shiftState === 'pending' ? {
    eyebrow: 'Shift reconciliation', title: 'Resolve your previous shift',
    description: 'Review the shift status before starting another sales session.',
    actionLabel: 'View shift close', icon: Square,
  } : isOnBreak ? {
    eyebrow: 'Shift on break', title: 'Resume your shift',
    description: 'End your break before using the point of sale.',
    actionLabel: 'End break', icon: Coffee,
  } : {
    eyebrow: 'Ready for checkout', title: 'Start a new sale',
    description: 'Scan or search for products and complete your next sale.',
    actionLabel: 'Open POS', icon: ShoppingCart,
  };

  const href = nextAction.href;
  const onAction = nextAction.command === 'refresh' ? refreshShift
    : nextAction.command === 'endBreak' ? () => { void toggleBreak(); }
      : undefined;

  const receipts = Array.isArray(stats?.recentOrders) ? stats.recentOrders : [];

  return (
    <main className="bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6 lg:pb-10">
      <div className="container max-w-7xl space-y-5 px-3 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {shop?.name || 'Your shop'} · Cashier workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {user?.name || 'Cashier'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {shiftState === 'active' ? (isOnBreak ? 'On break' : 'Shift running') : 'Your sales workspace'}
            </p>
          </div>
          <button type="button" onClick={handleLogout}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Log out"><LogOut aria-hidden="true" className="h-5 w-5" /></button>
        </header>

        {!isOnline && (
          <POSHomeNotice title="No internet connection" tone="warning">
            Verify which offline operations are supported before continuing. Payment confirmation requires provider verification.
          </POSHomeNotice>
        )}

        <POSHomeHero eyebrow={hero.eyebrow} title={hero.title} description={hero.description}
          actionLabel={nextAction.label} actionHref={onAction ? undefined : href}
          onAction={onAction} icon={hero.icon}
          status={isActive ? `Shift started ${new Date(shift!.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : undefined}
        />

        <section aria-labelledby="cashier-activity-title">
          <h2 id="cashier-activity-title" className="mb-2 text-base font-bold">My activity today</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <POSHomeMetric label="My sales" value={statsError ? null : money(stats?.todaySales)} loading={statsLoading} />
            <POSHomeMetric label="Transactions" value={statsError ? null : stats?.todayTransactions ?? null} loading={statsLoading} />
            <div className="hidden sm:block"><POSHomeMetric label="Shift duration" value={elapsed} loading={shiftState === 'loading'} /></div>
            <div className="hidden sm:block"><POSHomeMetric label="Average sale" value={statsError ? null : money(stats?.averageTransaction)} loading={statsLoading} /></div>
          </div>
        </section>

        <section aria-labelledby="cashier-fast-title">
          <h2 id="cashier-fast-title" className="mb-2 text-base font-bold">Fast actions</h2>
          <POSHomeQuickActions actions={[
            { label: 'My sales', description: 'Recent receipts', href: '/cashier/dashboard#recent-sales', icon: ReceiptText },
            { label: 'My shift', description: 'Time and cash', href: '/cashier/dashboard#shift-details', icon: Clock },
          ]} />
        </section>

        {breakError && <POSHomeNotice title="Break status could not be updated" tone="error">Please retry the action or ask your manager for assistance.</POSHomeNotice>}
        {statsError && (
          <POSHomeNotice title="Sales figures unavailable" tone="error">
            These figures have not been replaced by zeros.{' '}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={refreshShift}>Retry</button>
          </POSHomeNotice>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <section id="shift-details" aria-labelledby="my-shift-title" className="scroll-mt-20 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="my-shift-title" className="text-base font-bold">My shift</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
                {shiftState === 'active' ? (isOnBreak ? 'On break' : 'Running') :
                  shiftState === 'none' ? 'Not started' : shiftState === 'pending' ? 'Needs reconciliation' :
                    shiftState === 'error' ? 'Unavailable' : 'Checking'}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Started</dt><dd className="mt-1 font-semibold">{shift?.startTime ? new Date(shift.startTime).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Duration</dt><dd className="mt-1 font-semibold">{elapsed}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Opening float</dt><dd className="mt-1 font-semibold">{money(shift?.openingBalance) ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Expected cash</dt><dd className="mt-1 font-semibold">{money(shift?.expectedCash) ?? '—'}</dd></div>
            </dl>
            {activityState && isActive && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Activity aria-hidden="true" className="h-4 w-4" /> {activityState.isActive ? 'Shift activity detected' : 'Shift currently idle'}
              </p>
            )}
            {isActive && (
              <div className="mt-4 flex flex-wrap gap-2" id="shift-actions">
                <Button type="button" variant="outline" onClick={() => { void toggleBreak(); }} disabled={breakBusy}
                  className="min-h-11 flex-1">
                  <Coffee aria-hidden="true" className="mr-2 h-4 w-4" /> {breakBusy ? 'Updating…' : isOnBreak ? 'End break' : 'Take break'}
                </Button>
                <Link href="/cashier/shift-end" className={'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ' + (isOnBreak ? 'pointer-events-none opacity-50' : '')}
                  aria-disabled={isOnBreak}>
                  <Square aria-hidden="true" className="h-4 w-4" /> End shift
                </Link>
              </div>
            )}
          </section>

          <section id="recent-sales" aria-labelledby="cashier-receipts-title" className="scroll-mt-20 rounded-xl border border-border bg-card p-4">
            <h2 id="cashier-receipts-title" className="text-base font-bold">My recent sales</h2>
            {statsLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading receipts…</p> :
              statsError ? <p className="mt-3 text-sm text-muted-foreground">Receipts temporarily unavailable.</p> :
                receipts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No sales recorded yet for this cashier.</p> :
                  <ul className="mt-3 divide-y divide-border">
                    {receipts.slice(0, 5).map((receipt) => (
                      <li key={receipt.id} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 truncate">Receipt · {new Date(receipt.createdAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span>
                        <span className="font-semibold tabular-nums">{money(receipt.total) ?? '—'}</span>
                      </li>
                    ))}
                  </ul>}
          </section>
        </div>
      </div>
      <POSHomeBottomNav role="cashier" posHref={nextAction.href ?? '/pos'}
        posLabel={shiftState === 'none' ? 'Start shift' : 'POS'} disablePOS={!nextAction.canNavigateToPOS && shiftState !== 'none'} />
    </main>
  );
}

export default function CashierDashboardPage() {
  return <AuthGuard><CashierDashboardContent /></AuthGuard>;
}
