'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@smartduka/ui';
import { 
  AlertCircle, CheckCircle, XCircle, Clock, RefreshCw, Store, ChevronRight, ExternalLink,
  Users, Settings, Shield, FileText, TrendingUp, Headphones, Database, Activity
} from 'lucide-react';
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
  const router = useRouter();
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Navigate to shops page with filter
  const navigateToShops = (status?: string) => {
    if (status) {
      router.push(`/super-admin/shops?status=${status}`);
    } else {
      router.push('/super-admin/shops');
    }
  };

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

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
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

        {/* Stats Grid - Clickable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Pending Shops */}
          <Card 
            onClick={() => navigateToShops('pending')}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-yellow-400 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToShops('pending')}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-yellow-500" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats?.pending ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-yellow-600 transition-colors">
                Awaiting verification →
              </p>
            </CardContent>
          </Card>

          {/* Active Shops */}
          <Card 
            onClick={() => navigateToShops('active')}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-green-400 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToShops('active')}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-green-500" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.active ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-green-600 transition-colors">
                Fully operational →
              </p>
            </CardContent>
          </Card>

          {/* Suspended Shops */}
          <Card 
            onClick={() => navigateToShops('suspended')}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-red-400 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToShops('suspended')}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-red-500" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Suspended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.suspended ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-red-600 transition-colors">
                Temporarily blocked →
              </p>
            </CardContent>
          </Card>

          {/* Flagged Shops */}
          <Card 
            onClick={() => navigateToShops('flagged')}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-orange-400 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToShops('flagged')}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-orange-500" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Flagged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats?.flagged ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-orange-600 transition-colors">
                Under review →
              </p>
            </CardContent>
          </Card>

          {/* Total Shops */}
          <Card 
            onClick={() => navigateToShops()}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary group relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToShops()}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-5 w-5 text-primary" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                View all shops →
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Actions Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => router.push('/super-admin/shops')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted hover:border-primary transition-all group"
                >
                  <Store className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">All Shops</span>
                </button>
                
                <button
                  onClick={() => router.push('/super-admin/support')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted hover:border-primary transition-all group"
                >
                  <Headphones className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Support</span>
                </button>
                
                <button
                  onClick={() => router.push('/super-admin/shops?status=pending')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted hover:border-yellow-500 transition-all group relative"
                >
                  <Shield className="h-6 w-6 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                  <span className="text-sm font-medium">Verify</span>
                  {(stats?.pending ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {stats?.pending}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => router.push('/super-admin/shops?status=flagged')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted hover:border-orange-500 transition-all group relative"
                >
                  <AlertCircle className="h-6 w-6 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                  <span className="text-sm font-medium">Flagged</span>
                  {(stats?.flagged ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {stats?.flagged}
                    </span>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Platform Health
              </CardTitle>
              <CardDescription>System status overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">API Status</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">M-Pesa</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Metrics & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Platform Metrics
              </CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary" />
                    <span className="font-medium">Total Shops</span>
                  </div>
                  <span className="text-2xl font-bold">{stats?.total ?? 0}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Activation Rate</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats?.total ? Math.round((stats.active / stats.total) * 100) : 0}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Pending Actions</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">
                    {(stats?.pending ?? 0) + (stats?.flagged ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card className={(stats?.pending ?? 0) + (stats?.flagged ?? 0) > 0 ? 'border-yellow-200' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Attention Required
              </CardTitle>
              <CardDescription>Items needing your review</CardDescription>
            </CardHeader>
            <CardContent>
              {(stats?.pending ?? 0) + (stats?.flagged ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-lg font-medium text-green-700">All Clear!</p>
                  <p className="text-sm text-muted-foreground">No pending items require attention</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(stats?.pending ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/super-admin/shops?status=pending')}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div className="text-left">
                          <p className="font-medium text-yellow-800">Pending Verification</p>
                          <p className="text-sm text-yellow-600">{stats?.pending} shop{stats?.pending !== 1 ? 's' : ''} waiting</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-yellow-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  
                  {(stats?.flagged ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/super-admin/shops?status=flagged')}
                      className="w-full flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div className="text-left">
                          <p className="font-medium text-orange-800">Flagged for Review</p>
                          <p className="text-sm text-orange-600">{stats?.flagged} shop{stats?.flagged !== 1 ? 's' : ''} flagged</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  
                  {(stats?.suspended ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/super-admin/shops?status=suspended')}
                      className="w-full flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div className="text-left">
                          <p className="font-medium text-red-800">Suspended Shops</p>
                          <p className="text-sm text-red-600">{stats?.suspended} shop{stats?.suspended !== 1 ? 's' : ''} suspended</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-red-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
