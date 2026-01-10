'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { AuthGuard } from '@/components/auth-guard';
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

interface InvoicePayment {
  _id: string;
  invoiceId: string;
  invoiceNumber: string;
  shopId: string;
  shopName?: string;
  customerName?: string;
  customerPhone?: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  reference?: string;
  notes?: string;
  invoiceTotal: number;
  invoiceStatus: string;
  paymentStatus: string;
  approvalStatus?: string;
  paymentId?: string;
}

interface PendingInvoicePayment {
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  shopId: string;
  shopName?: string;
  customerName?: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  reference?: string;
}

interface PendingSubscriptionPayment {
  _id: string;
  shopId: string;
  shopName?: string;
  userEmail?: string;
  method: string;
  type: string;
  status: string;
  amount: number;
  phoneNumber?: string;
  createdAt: string;
}

interface InvoicePaymentStats {
  totalAmount: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
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
  // Invoice payment methods
  cash: <DollarSign className="h-4 w-4" />,
  mpesa: <Smartphone className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  bank_transfer: <Building2 className="h-4 w-4" />,
  cheque: <CreditCard className="h-4 w-4" />,
  other: <DollarSign className="h-4 w-4" />,
};

const methodLabels: Record<string, string> = {
  mpesa_stk: 'M-Pesa STK',
  mpesa_manual: 'M-Pesa Manual',
  stripe_card: 'Stripe Card',
  stripe_link: 'Stripe Link',
  // Invoice payment methods
  cash: 'Cash',
  mpesa: 'M-Pesa',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
};

function SuperAdminPaymentsContent() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Invoice payments state
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [invoicePaymentStats, setInvoicePaymentStats] = useState<InvoicePaymentStats | null>(null);
  const [invoicePaymentsTotal, setInvoicePaymentsTotal] = useState(0);
  const [invoicePaymentsPage, setInvoicePaymentsPage] = useState(0);
  const [invoicePaymentsLoading, setInvoicePaymentsLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'pending'>('subscriptions');
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('');
  
  // Pending approvals state
  const [pendingInvoicePayments, setPendingInvoicePayments] = useState<PendingInvoicePayment[]>([]);
  const [pendingSubscriptionPayments, setPendingSubscriptionPayments] = useState<PendingSubscriptionPayment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  const loadInvoicePayments = useCallback(async () => {
    if (!token) return;
    try {
      setInvoicePaymentsLoading(true);
      const params = new URLSearchParams();
      if (invoiceMethodFilter) params.append('paymentMethod', invoiceMethodFilter);
      if (invoiceStatusFilter) params.append('paymentStatus', invoiceStatusFilter);
      params.append('limit', limit.toString());
      params.append('skip', (invoicePaymentsPage * limit).toString());

      const res = await api.get<{
        payments: InvoicePayment[];
        total: number;
        stats: InvoicePaymentStats;
      }>(`/super-admin/system/invoice-payments?${params.toString()}`);

      setInvoicePayments(res.payments || []);
      setInvoicePaymentsTotal(res.total || 0);
      setInvoicePaymentStats(res.stats || null);
    } catch (error) {
      console.error('Failed to load invoice payments:', error);
    } finally {
      setInvoicePaymentsLoading(false);
    }
  }, [token, invoiceMethodFilter, invoiceStatusFilter, invoicePaymentsPage, limit]);

  const loadPendingApprovals = useCallback(async () => {
    if (!token) return;
    try {
      setPendingLoading(true);
      const res = await api.get<{
        invoicePayments: PendingInvoicePayment[];
        subscriptionPayments: PendingSubscriptionPayment[];
      }>('/super-admin/system/pending-approvals');

      setPendingInvoicePayments(res.invoicePayments || []);
      setPendingSubscriptionPayments(res.subscriptionPayments || []);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setPendingLoading(false);
    }
  }, [token]);

  const approveInvoicePayment = async (invoiceId: string, paymentId: string) => {
    try {
      setApproving(`invoice-${invoiceId}-${paymentId}`);
      await api.post(`/super-admin/system/invoice-payments/${invoiceId}/${paymentId}/approve`, {});
      await loadPendingApprovals();
      await loadInvoicePayments();
    } catch (error) {
      console.error('Failed to approve payment:', error);
    } finally {
      setApproving(null);
    }
  };

  const rejectInvoicePayment = async (invoiceId: string, paymentId: string, reason: string) => {
    try {
      setRejecting(`invoice-${invoiceId}-${paymentId}`);
      await api.post(`/super-admin/system/invoice-payments/${invoiceId}/${paymentId}/reject`, { reason });
      await loadPendingApprovals();
      await loadInvoicePayments();
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject payment:', error);
    } finally {
      setRejecting(null);
    }
  };

  const approveSubscriptionPayment = async (paymentAttemptId: string) => {
    try {
      setApproving(`subscription-${paymentAttemptId}`);
      await api.post(`/super-admin/system/subscription-payments/${paymentAttemptId}/approve`, {});
      await loadPendingApprovals();
      await loadData();
    } catch (error) {
      console.error('Failed to approve subscription payment:', error);
    } finally {
      setApproving(null);
    }
  };

  const rejectSubscriptionPayment = async (paymentAttemptId: string, reason: string) => {
    try {
      setRejecting(`subscription-${paymentAttemptId}`);
      await api.post(`/super-admin/system/subscription-payments/${paymentAttemptId}/reject`, { reason });
      await loadPendingApprovals();
      await loadData();
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject subscription payment:', error);
    } finally {
      setRejecting(null);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingApprovals(); // Load pending count for badge
  }, [loadData, loadPendingApprovals]);

  useEffect(() => {
    if (activeTab === 'invoices') {
      loadInvoicePayments();
    } else if (activeTab === 'pending') {
      loadPendingApprovals();
    }
  }, [activeTab, loadInvoicePayments, loadPendingApprovals]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
      if (activeTab === 'invoices') {
        loadInvoicePayments();
      } else if (activeTab === 'pending') {
        loadPendingApprovals();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData, loadInvoicePayments, loadPendingApprovals, activeTab]);

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
            <h1 className="text-xl md:text-2xl font-bold">Payments</h1>
            <p className="text-sm md:text-base text-muted-foreground">Monitor subscription and invoice payments in real-time</p>
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
          <Button variant="outline" size="sm" onClick={() => {
              loadData();
              if (activeTab === 'invoices') loadInvoicePayments();
            }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'subscriptions' | 'invoices' | 'pending')} className="mb-4 md:mb-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {(pendingInvoicePayments.length + pendingSubscriptionPayments.length) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingInvoicePayments.length + pendingSubscriptionPayments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'subscriptions' && (
        <>
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
        </>
      )}

      {/* Invoice Payments Tab */}
      {activeTab === 'invoices' && (
        <>
          {/* Invoice Payment Stats */}
          {invoicePaymentStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-xl md:text-2xl font-bold">{formatCurrency(invoicePaymentStats.totalAmount)}</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {Object.entries(invoicePaymentStats.byMethod).slice(0, 3).map(([method, amount]) => (
                <Card key={method}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">{methodLabels[method] || method}</p>
                        <p className="text-xl md:text-2xl font-bold">{formatCurrency(amount)}</p>
                      </div>
                      <div className="p-3 rounded-full bg-blue-100">
                        {methodIcons[method] || <DollarSign className="h-5 w-5 text-blue-600" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Invoice Payment Filters */}
          <Card className="mb-4 md:mb-6">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-4">
                <div className="flex gap-2">
                  <select
                    value={invoiceMethodFilter}
                    onChange={(e) => setInvoiceMethodFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>

                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>

                  {(invoiceMethodFilter || invoiceStatusFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInvoiceMethodFilter('');
                        setInvoiceStatusFilter('');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Payments Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Invoice Payments</CardTitle>
              <CardDescription>
                Showing {invoicePayments.length} of {invoicePaymentsTotal} payments (Send Money, Bank Transfer, M-Pesa, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              {invoicePaymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Shop</th>
                        <th className="pb-3 font-medium">Invoice</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Method</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Approval</th>
                        <th className="pb-3 font-medium">Reference</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePayments.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-muted-foreground">
                            No invoice payments found
                          </td>
                        </tr>
                      ) : (
                        invoicePayments.map((payment) => (
                          <tr key={payment._id} className={`border-b hover:bg-muted/50 ${payment.approvalStatus === 'pending' ? 'bg-yellow-50' : ''}`}>
                            <td className="py-3 text-sm">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="py-3">
                              <div className="text-sm font-medium">{payment.shopName || 'Unknown Shop'}</div>
                            </td>
                            <td className="py-3">
                              <div className="text-sm font-mono">{payment.invoiceNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                Total: {formatCurrency(payment.invoiceTotal)}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-sm">{payment.customerName || 'Walk-in'}</div>
                              {payment.customerPhone && (
                                <div className="text-xs text-muted-foreground">{payment.customerPhone}</div>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {methodIcons[payment.paymentMethod] || <DollarSign className="h-4 w-4" />}
                                <span className="text-sm">{methodLabels[payment.paymentMethod] || payment.paymentMethod}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                            </td>
                            <td className="py-3">
                              <Badge className={
                                payment.approvalStatus === 'approved' || payment.approvalStatus === 'auto_approved'
                                  ? 'bg-green-100 text-green-800' 
                                  : payment.approvalStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : payment.approvalStatus === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {(payment.approvalStatus === 'approved' || payment.approvalStatus === 'auto_approved') && <CheckCircle className="h-3 w-3 mr-1" />}
                                {payment.approvalStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {payment.approvalStatus === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                {payment.approvalStatus === 'auto_approved' ? 'Approved' : payment.approvalStatus || 'N/A'}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm">
                              {payment.reference && (
                                <div className="font-mono text-xs">{payment.reference}</div>
                              )}
                              {payment.notes && (
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={payment.notes}>
                                  {payment.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              {payment.approvalStatus === 'pending' && payment.paymentId && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => approveInvoicePayment(payment.invoiceId, payment.paymentId!)}
                                    disabled={approving === `invoice-${payment.invoiceId}-${payment.paymentId}`}
                                  >
                                    {approving === `invoice-${payment.invoiceId}-${payment.paymentId}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      const reason = prompt('Enter rejection reason:');
                                      if (reason && payment.paymentId) {
                                        rejectInvoicePayment(payment.invoiceId, payment.paymentId, reason);
                                      }
                                    }}
                                    disabled={rejecting === `invoice-${payment.invoiceId}-${payment.paymentId}`}
                                  >
                                    {rejecting === `invoice-${payment.invoiceId}-${payment.paymentId}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invoice Payments Pagination */}
              {invoicePaymentsTotal > limit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {invoicePaymentsPage + 1} of {Math.ceil(invoicePaymentsTotal / limit)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoicePaymentsPage(p => Math.max(0, p - 1))}
                      disabled={invoicePaymentsPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoicePaymentsPage(p => p + 1)}
                      disabled={(invoicePaymentsPage + 1) * limit >= invoicePaymentsTotal}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <>
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Invoice Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Invoice Payments
                  </CardTitle>
                  <CardDescription>
                    {pendingInvoicePayments.length} payment(s) awaiting approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingInvoicePayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No pending invoice payments</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingInvoicePayments.map((payment) => (
                        <div key={`${payment.invoiceId}-${payment.paymentId}`} className="border rounded-lg p-4 bg-yellow-50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                <span className="font-mono text-sm">{payment.invoiceNumber}</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Shop:</span>
                                  <p className="font-medium">{payment.shopName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Customer:</span>
                                  <p className="font-medium">{payment.customerName || 'Walk-in'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Method:</span>
                                  <p className="font-medium flex items-center gap-1">
                                    {methodIcons[payment.paymentMethod]}
                                    {methodLabels[payment.paymentMethod] || payment.paymentMethod}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>
                                  <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                                </div>
                              </div>
                              {payment.reference && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Reference: <span className="font-mono">{payment.reference}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveInvoicePayment(payment.invoiceId, payment.paymentId)}
                                disabled={approving === `invoice-${payment.invoiceId}-${payment.paymentId}`}
                              >
                                {approving === `invoice-${payment.invoiceId}-${payment.paymentId}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) {
                                    rejectInvoicePayment(payment.invoiceId, payment.paymentId, reason);
                                  }
                                }}
                                disabled={rejecting === `invoice-${payment.invoiceId}-${payment.paymentId}`}
                              >
                                {rejecting === `invoice-${payment.invoiceId}-${payment.paymentId}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Subscription Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Subscription Payments
                  </CardTitle>
                  <CardDescription>
                    {pendingSubscriptionPayments.length} payment(s) awaiting approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingSubscriptionPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No pending subscription payments</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingSubscriptionPayments.map((payment) => (
                        <div key={payment._id} className="border rounded-lg p-4 bg-yellow-50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                                <Badge variant="outline" className="capitalize">{payment.type}</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Shop:</span>
                                  <p className="font-medium">{payment.shopName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">User:</span>
                                  <p className="font-medium">{payment.userEmail || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Method:</span>
                                  <p className="font-medium flex items-center gap-1">
                                    {methodIcons[payment.method]}
                                    {methodLabels[payment.method] || payment.method}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>
                                  <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Submitted: {formatDate(payment.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveSubscriptionPayment(payment._id)}
                                disabled={approving === `subscription-${payment._id}`}
                              >
                                {approving === `subscription-${payment._id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) {
                                    rejectSubscriptionPayment(payment._id, reason);
                                  }
                                }}
                                disabled={rejecting === `subscription-${payment._id}`}
                              >
                                {rejecting === `subscription-${payment._id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// SECURITY: Protect with AuthGuard
export default function SuperAdminPaymentsPage() {
  return (
    <AuthGuard requiredRole="super_admin" fallbackRoute="/login">
      <SuperAdminPaymentsContent />
    </AuthGuard>
  );
}
