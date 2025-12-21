'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@smartduka/ui';
import {
  CreditCard,
  Smartphone,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';

interface PaymentAttempt {
  _id: string;
  shopId: string;
  shopName?: string;
  userEmail?: string;
  method: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  planCode?: string;
  billingCycle?: string;
  phoneNumber?: string;
  checkoutRequestId?: string;
  paymentIntentId?: string;
  mpesaReceiptNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface PaymentStats {
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  totalAmount: number;
  successAmount: number;
  successRate: number;
}

const statusColors: Record<string, string> = {
  initiated: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-purple-100 text-purple-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-orange-100 text-orange-800',
};

const methodIcons: Record<string, React.ReactNode> = {
  mpesa_stk: <Smartphone className="h-4 w-4" />,
  mpesa_manual: <Phone className="h-4 w-4" />,
  stripe_card: <CreditCard className="h-4 w-4" />,
  stripe_link: <Building2 className="h-4 w-4" />,
};

const methodLabels: Record<string, string> = {
  mpesa_stk: 'M-Pesa STK',
  mpesa_manual: 'M-Pesa Manual',
  stripe_card: 'Stripe Card',
  stripe_link: 'Stripe Link',
};

export default function SuperAdminPaymentsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);
      params.append('limit', limit.toString());
      params.append('skip', (page * limit).toString());

      const [attemptsRes, statsRes] = await Promise.all([
        api.get<{ attempts: PaymentAttempt[]; total: number }>(
          `/super-admin/system/payment-attempts?${params.toString()}`
        ),
        api.get<PaymentStats>('/super-admin/system/payment-attempts/stats'),
      ]);

      setAttempts(attemptsRes.attempts || []);
      setTotal(attemptsRes.total || 0);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load payment attempts:', error);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, methodFilter, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const filteredAttempts = attempts.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.userEmail?.toLowerCase().includes(query) ||
      a.shopName?.toLowerCase().includes(query) ||
      a.phoneNumber?.includes(query) ||
      a.mpesaReceiptNumber?.toLowerCase().includes(query) ||
      a.planCode?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Payment Attempts</h1>
            <p className="text-sm md:text-base text-muted-foreground">Monitor all subscription payment attempts in real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                Live
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Paused
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Attempts</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Collected</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(stats.successAmount)}</p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 md:mb-6">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`p-3 rounded-lg border transition-all ${
                statusFilter === status 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge className={statusColors[status] || 'bg-gray-100'}>
                  {status}
                </Badge>
                <span className="font-bold">{count}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-4">
            <div className="flex-1 md:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, phone, receipt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Methods</option>
                <option value="mpesa_stk">M-Pesa STK</option>
                <option value="mpesa_manual">M-Pesa Manual</option>
                <option value="stripe_card">Stripe Card</option>
                <option value="stripe_link">Stripe Link</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="initiated">Initiated</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {(statusFilter || methodFilter || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setMethodFilter('');
                    setSearchQuery('');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Attempts Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Payment Attempts</CardTitle>
          <CardDescription>
            Showing {filteredAttempts.length} of {total} attempts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Shop / User</th>
                  <th className="pb-3 font-medium">Method</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No payment attempts found
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <tr key={attempt._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 text-sm">
                        <div>{formatDate(attempt.createdAt)}</div>
                        {attempt.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Completed: {formatDate(attempt.completedAt)}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="text-sm font-medium">{attempt.shopName || 'Unknown Shop'}</div>
                        <div className="text-xs text-muted-foreground">{attempt.userEmail}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {methodIcons[attempt.method]}
                          <span className="text-sm">{methodLabels[attempt.method] || attempt.method}</span>
                        </div>
                        {attempt.phoneNumber && (
                          <div className="text-xs text-muted-foreground">{attempt.phoneNumber}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="capitalize">
                          {attempt.type}
                        </Badge>
                        {attempt.planCode && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Plan: {attempt.planCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{formatCurrency(attempt.amount)}</div>
                        {attempt.billingCycle && (
                          <div className="text-xs text-muted-foreground">{attempt.billingCycle}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge className={statusColors[attempt.status] || 'bg-gray-100'}>
                          {attempt.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {attempt.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {attempt.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {attempt.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm">
                        {attempt.mpesaReceiptNumber && (
                          <div className="font-mono text-xs">{attempt.mpesaReceiptNumber}</div>
                        )}
                        {attempt.checkoutRequestId && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={attempt.checkoutRequestId}>
                            CRQ: {attempt.checkoutRequestId.slice(0, 15)}...
                          </div>
                        )}
                        {attempt.errorMessage && (
                          <div className="text-xs text-red-600 max-w-[200px] truncate" title={attempt.errorMessage}>
                            {attempt.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
