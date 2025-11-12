'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@smartduka/ui';
import { AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';

type DashboardStats = {
  pending: number;
  active: number;
  suspended: number;
  flagged: number;
  total: number;
};

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    setAutoRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token]);

  const loadStats = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/dashboard/stats`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401) {
        toast({ type: 'error', title: 'Unauthorized', message: 'Your session has expired' });
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not load dashboard stats' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage shops and monitor platform activity</p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Pending Shops */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.pending ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
            </CardContent>
          </Card>

          {/* Active Shops */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.active ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Fully operational</p>
            </CardContent>
          </Card>

          {/* Suspended Shops */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Suspended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.suspended ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Temporarily blocked</p>
            </CardContent>
          </Card>

          {/* Flagged Shops */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Flagged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.flagged ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Under review</p>
            </CardContent>
          </Card>

          {/* Total Shops */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All shops</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Shops Card */}
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Verification
              </CardTitle>
              <CardDescription>
                {stats?.pending ?? 0} shop{stats?.pending !== 1 ? 's' : ''} awaiting your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => window.location.href = '/super-admin/shops?tab=pending'}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Review Pending Shops
              </button>
            </CardContent>
          </Card>

          {/* Flagged Shops Card */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Flagged for Review
              </CardTitle>
              <CardDescription>
                {stats?.flagged ?? 0} shop{stats?.flagged !== 1 ? 's' : ''} flagged for investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => window.location.href = '/super-admin/shops?tab=flagged'}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Review Flagged Shops
              </button>
            </CardContent>
          </Card>

          {/* Suspended Shops Card */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Suspended Shops
              </CardTitle>
              <CardDescription>
                {stats?.suspended ?? 0} shop{stats?.suspended !== 1 ? 's' : ''} currently suspended
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => window.location.href = '/super-admin/shops?tab=suspended'}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Manage Suspended Shops
              </button>
            </CardContent>
          </Card>

          {/* Active Shops Card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Active Shops
              </CardTitle>
              <CardDescription>
                {stats?.active ?? 0} shop{stats?.active !== 1 ? 's' : ''} operating normally
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => window.location.href = '/super-admin/shops?tab=active'}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Active Shops
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <CardDescription>Key metrics and information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm font-medium">Total Shops</span>
                <Badge variant="outline">{stats?.total ?? 0}</Badge>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm font-medium">Verification Rate</span>
                <Badge variant="outline">
                  {stats?.total ? Math.round(((stats.active) / stats.total) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending Action</span>
                <Badge variant="destructive">{(stats?.pending ?? 0) + (stats?.flagged ?? 0)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
