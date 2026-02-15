'use client';

import { config } from '@/lib/config';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { TrendingUp, Package, Users, ShoppingCart, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatusCard } from '@/components/subscription-status-card';
import { dashboardCache, cacheKeys } from '@/lib/data-cache';
import { smartCache } from '@/lib/smart-cache-manager';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockProducts: number;
  pendingOrders: number;
}

export default function DashboardPage() {
  const { token, user, shop } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const shopId = user?.shopId || (shop as any)?._id || shop?.id || '';

  // Check online status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize smart cache
  useEffect(() => {
    if (token && shopId) {
      smartCache.initialize(token, shopId);
    }
  }, [token, shopId]);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    const cacheKey = cacheKeys.dashboardStats(shopId);
    
    // Try cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = dashboardCache.get<DashboardStats>(cacheKey);
      if (cached) {
        setStats(cached);
        setIsLoading(false);
        // Still fetch in background if cache is older than 1 minute
        const age = dashboardCache.getAge(cacheKey);
        if (age && age < 60000) return;
      }
    }

    try {
      if (forceRefresh) setIsRefreshing(true);
      
      const res = await fetch(`${config.apiUrl}/sales/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setStats(data);
        dashboardCache.set(cacheKey, data, 2 * 60 * 1000); // Cache for 2 minutes
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Use cached data if available
      const cached = dashboardCache.get<DashboardStats>(cacheKey);
      if (cached) setStats(cached);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, shopId]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  const handleRefresh = () => {
    fetchStats(true);
  };

  if (isLoading) {
    return <div className="text-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to SmartDuka POS</p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                  maximumFractionDigits: 0,
                }).format(stats.totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Subscription Status */}
        <SubscriptionStatusCard />

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="text-orange-600 font-medium">{stats?.lowStockProducts || 0}</span>
              <span className="text-muted-foreground"> products with low stock</span>
            </div>
            <div className="text-sm">
              <span className="text-blue-600 font-medium">{stats?.pendingOrders || 0}</span>
              <span className="text-muted-foreground"> pending orders</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/cashier/pos" className="block text-blue-600 hover:underline">
              → POS Terminal
            </a>
            <a href="/admin/branches" className="block text-blue-600 hover:underline">
              → Manage Branches
            </a>
            <a href="/admin/audit-logs" className="block text-blue-600 hover:underline">
              → Audit Logs
            </a>
            <a href="/admin/subscription" className="block text-blue-600 hover:underline">
              → Subscription & Billing
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
