'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { formatMoney } from '@/lib/currency';
import { AuthGuard } from '@/components/auth-guard';
import { BranchSelectionModal, useBranchSelectionRequired } from '@/components/branch-selection-modal';
import {
  POSHomeHero, POSHomeMetric, POSHomeQuickActions,
  POSHomeNotice, POSHomeBottomNav,
} from '@/components/pos-home-ui';
import {
  AlertTriangle, BarChart3, Building2, Clock3, MapPin,
  Package, ReceiptText, ShoppingCart, Users, WifiOff,
} from 'lucide-react';

type SalesStats = {
  todayRevenue: number;
  todayOrders: number;
  totalRevenue: number;
  totalOrders: number;
};
type InventoryStats = {
  totalProducts: number;
  lowStockProducts: number;
  activeProducts: number;
};
type PaymentPause = {
  paused: boolean;
  mode?: string;
};

function AdminDashboardContent() {
  const { user, shop, token } = useAuth();
  const { currentBranch, branches } = useBranch();
  const branchSelectionRequired = useBranchSelectionRequired();
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  // Null means unknown/unavailable, never a fabricated business zero.
  const [sales, setSales] = useState<SalesStats | null>(null);
  const [inventory, setInventory] = useState<InventoryStats | null>(null);
  const [paymentPause, setPaymentPause] = useState<PaymentPause | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [salesError, setSalesError] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const branchId = currentBranch?._id;
  const retry = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!token) {
      setSales(null);
      setInventory(null);
      setSalesLoading(false);
      setInventoryLoading(false);
      return;
    }
    // One controller per dashboard load prevents stale branch responses.
    const controller = new AbortController();
    const signal = controller.signal;
    const headers = { Authorization: `Bearer ${token}` };
    const api = config.apiUrl;
    setSales(null);
    setInventory(null);
    setSalesError(false);
    setInventoryError(false);
    setSalesLoading(true);
    setInventoryLoading(true);

    const read = async <T,>(url: string, authenticated = true): Promise<T> => {
      const response = await fetch(url, {
        headers: authenticated ? headers : undefined,
        signal,
      });
      if (!response.ok) throw new Error(`Dashboard request failed: ${response.status}`);
      return (await response.json()) as T;
    };

    void read<SalesStats>(
      `${api}/sales/stats${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`,
    ).then((data) => {
      if (!signal.aborted) {
        if (!Number.isFinite(data?.todayRevenue) || !Number.isFinite(data?.todayOrders)) {
          throw new Error('Invalid sales response');
        }
        setSales(data);
        setLastUpdated(new Date());
      }
    }).catch(() => { if (!signal.aborted) setSalesError(true); })
      .finally(() => { if (!signal.aborted) setSalesLoading(false); });

    // Inventory stats are shop-wide. Do not label them as branch-specific.
    void read<InventoryStats>(`${api}/inventory/stats`).then((data) => {
      if (!signal.aborted) {
        if (!Number.isFinite(data?.totalProducts) || !Number.isFinite(data?.lowStockProducts)) {
          throw new Error('Invalid inventory response');
        }
        setInventory(data);
      }
    }).catch(() => { if (!signal.aborted) setInventoryError(true); })
      .finally(() => { if (!signal.aborted) setInventoryLoading(false); });

    void read<PaymentPause>(`${api}/payments/mpesa/pause-status`, false)
      .then((data) => {
        if (!signal.aborted) setPaymentPause(typeof data?.paused === 'boolean' ? data : null);
      })
      .catch(() => { if (!signal.aborted) setPaymentPause(null); });

    return () => controller.abort();
  }, [token, branchId, refreshKey]);

  const productCount = inventory?.totalProducts;
  const isNewShop = inventory !== null && productCount === 0;
  const firstName = user?.name?.trim() || user?.email?.split('@')[0] || 'Admin';
  const currency = shop?.currency;
  const money = (n: number | undefined): string | null =>
    typeof n === 'number' && Number.isFinite(n) ? formatMoney(n, currency) : null;

  const actions = [
    { label: 'Products', description: 'Manage inventory', href: '/admin/products', icon: Package },
    { label: 'Orders', description: 'Receipts and sales', href: '/orders', icon: ReceiptText },
    { label: 'Cashiers', description: 'Your team', href: '/admin/cashiers', icon: Users },
    { label: 'Reports', description: 'Sales insights', href: '/admin/analytics/sales', icon: BarChart3 },
  ];

  return (
    <main className="min-w-0 bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6 lg:pb-10">
      <div className="container max-w-7xl space-y-5 px-3 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {shop?.name || 'Your shop'} · {currentBranch?.name || 'All branches'}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your retail operations at a glance</p>
          </div>
          {branches.length > 1 && (
            <button type="button" onClick={() => setBranchModalOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Switch operating branch">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {currentBranch?.name || 'Choose branch'}
            </button>
          )}
        </header>

        {!isOnline && (
          <POSHomeNotice title="You're offline" tone="warning">
            Dashboard numbers may be unavailable. Only previously supported offline POS operations can continue.
          </POSHomeNotice>
        )}
        {branchSelectionRequired && branches.length > 1 && !currentBranch && (
          <POSHomeNotice title="Choose a branch">
            Select a branch for branch-specific sales figures. <button type="button" onClick={() => setBranchModalOpen(true)} className="font-semibold underline underline-offset-2">Select branch</button>
          </POSHomeNotice>
        )}

        <POSHomeHero
          eyebrow={isNewShop ? 'Getting started' : 'One-tap selling'}
          title={isNewShop ? 'Add your first product' : 'Start a new sale'}
          description={isNewShop
            ? 'Build your catalogue to get ready for checkout. Add a product with a price and stock information.'
            : 'Open your sales workspace to scan products, build a cart and check out.'}
          actionLabel={isNewShop ? 'Add first product' : 'Open POS'}
          actionHref={isNewShop ? '/admin/products' : '/pos'}
          icon={isNewShop ? Package : ShoppingCart}
          status={!isNewShop && lastUpdated ? 'Business information last updated ' + lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined}
        />

        <section aria-labelledby="admin-metrics-title">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="admin-metrics-title" className="text-base font-bold">Business today</h2>
            {(salesError || inventoryError) && (
              <button type="button" onClick={retry} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Retry data</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <POSHomeMetric label="Today's sales" value={money(sales?.todayRevenue)} loading={salesLoading} href="/admin/analytics/sales" />
            <POSHomeMetric label="Today's orders" value={sales?.todayOrders ?? null} loading={salesLoading} href="/admin/analytics/orders" />
            <div className="hidden sm:block"><POSHomeMetric label="Shop products" description="All branches" value={productCount ?? null} loading={inventoryLoading} href="/admin/products" /></div>
            <div className="hidden sm:block"><POSHomeMetric label="Total revenue" value={money(sales?.totalRevenue)} loading={salesLoading} href="/admin/analytics/payments" /></div>
          </div>
        </section>

        <section aria-labelledby="admin-actions-title">
          <h2 id="admin-actions-title" className="mb-2 text-base font-bold">Quick actions</h2>
          <POSHomeQuickActions actions={actions} />
        </section>

        {(salesError || inventoryError) && (
          <POSHomeNotice title="Some business figures couldn't load" tone="error">
            Values marked — are unavailable, not zero. Your POS remains accessible if your account is authorized.{' '}
            <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">Try again</button>
          </POSHomeNotice>
        )}

        <section aria-labelledby="admin-operations-title" className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 id="admin-operations-title" className="text-base font-bold">Operations to watch</h2>
            <div className="mt-3 space-y-3 text-sm">
              <Link href="/admin/products" className="flex min-h-11 items-center justify-between gap-3 rounded-lg hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-500" /> Low stock · shop-wide</span>
                <span className="font-semibold">{inventoryLoading ? 'Loading' : inventoryError ? '—' : inventory?.lowStockProducts ?? '—'}</span>
              </Link>
              <Link href="/admin/branches" className="flex min-h-11 items-center justify-between gap-2 rounded-lg hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <span className="flex items-center gap-2"><Building2 aria-hidden="true" className="h-4 w-4" /> Branch management</span>
                <span className="text-muted-foreground">Open</span>
              </Link>
              <div className="flex min-h-11 items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="h-4 w-4" /> Data status</span>
                <span className="text-muted-foreground">{salesError || inventoryError ? 'Needs attention' : lastUpdated ? 'Recently updated' : 'Loading'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isNewShop && (
              <POSHomeNotice title="First-sale setup">
                Once you've added products, return here to open your POS. Categories and reporting can be configured as you grow.
              </POSHomeNotice>
            )}
            {paymentPause?.paused === true ? (
              <POSHomeNotice title="M-Pesa payments paused" tone="warning">
                STK payment initiation is currently unavailable. Other payment methods may be available according to your shop configuration.
              </POSHomeNotice>
            ) : paymentPause === null ? (
              <POSHomeNotice title="M-Pesa status unavailable" tone="warning">
                We couldn't confirm M-Pesa availability. Do not assume it is enabled until its status has been verified.
              </POSHomeNotice>
            ) : (
              <POSHomeNotice title="Payment method availability">
                Review enabled payment methods in Settings before accepting a payment.
              </POSHomeNotice>
            )}
            <Link href="/orders" className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              <ReceiptText aria-hidden="true" className="h-4 w-4" /> View order history
            </Link>
          </div>
        </section>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {!isOnline && <WifiOff aria-hidden="true" className="h-4 w-4" />}
          <span>Operations and totals reflect your authorized shop. Inventory totals are shop-wide.</span>
        </div>
      </div>

      <POSHomeBottomNav role="admin" posHref="/pos" />
      <BranchSelectionModal isOpen={branchModalOpen} onClose={() => setBranchModalOpen(false)}
        showAllBranchesOption={true} title="Select Operating Branch"
        description="Choose a branch to filter sales activity. Inventory totals remain shop-wide." />
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboardContent />
    </AuthGuard>
  );
}
