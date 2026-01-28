'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRefreshEvent } from '@/lib/refresh-events';
import { AuthGuard } from '@/components/auth-guard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartduka/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Crown,
  Search,
  Filter,
  RefreshCw,
  Store,
  Users,
  Package,
  Calendar,
  AlertCircle,
  Check,
  Clock,
  X,
  TrendingUp,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  Play,
  Trash2,
  Mail,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';

interface ShopSubscription {
  shopId: string;
  shopName: string;
  shopEmail: string;
  planCode: string;
  planName: string;
  status: string;
  billingCycle: string;
  billingDisplay?: string;
  currentPrice: number;
  currentPeriodEnd: string;
  daysRemaining: number;
  isTrial?: boolean;
  createdAt?: string;
  subscriptionId?: string;
  usage: {
    shops: { current: number; limit: number };
    employees: { current: number; limit: number };
    products: { current: number; limit: number };
  };
}

interface SubscriptionStats {
  totalShops: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  monthlyRevenue: number;
  planBreakdown: {
    starter: number;
    basic: number;
    silver: number;
    gold: number;
  };
}

// Status colors - high contrast
const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  trial: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', icon: <Clock className="h-4 w-4" /> },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', icon: <Check className="h-4 w-4" /> },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', icon: <AlertCircle className="h-4 w-4" /> },
  suspended: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', icon: <Ban className="h-4 w-4" /> },
  cancelled: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <X className="h-4 w-4" /> },
  expired: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <Clock className="h-4 w-4" /> },
};

// Cache for subscriptions data
const subscriptionCache: { data: ShopSubscription[] | null; stats: SubscriptionStats | null; timestamp: number } = {
  data: null,
  stats: null,
  timestamp: 0,
};
const CACHE_DURATION = 10000; // 10 seconds cache for faster updates

const ITEMS_PER_PAGE = 20;

function SuperAdminSubscriptionsContent() {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ShopSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [viewDialog, setViewDialog] = useState<ShopSubscription | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'reactivate' | 'delete' | 'bulk_suspend' | 'bulk_reactivate';
    subscription?: ShopSubscription;
  }>({ open: false, type: 'suspend' });
  
  // Edit Plan Dialog
  const [editDialog, setEditDialog] = useState<ShopSubscription | null>(null);
  const [editForm, setEditForm] = useState({
    planCode: '',
    status: '',
    billingCycle: '',
    currentPeriodEnd: '',
    currentPrice: 0,
  });
  
  // Grace Period Dialog
  const [graceDialog, setGraceDialog] = useState<ShopSubscription | null>(null);
  const [graceDays, setGraceDays] = useState(7);
  const [graceStartDate, setGraceStartDate] = useState('');
  const [graceEndDate, setGraceEndDate] = useState('');
  const [graceReason, setGraceReason] = useState('');
  
  // Calculate days when dates change
  const calculateGraceDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return Math.max(0, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));
  };
  
  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    
    // Check cache
    const now = Date.now();
    if (!forceRefresh && subscriptionCache.data && (now - subscriptionCache.timestamp) < CACHE_DURATION) {
      setSubscriptions(subscriptionCache.data);
      setStats(subscriptionCache.stats);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [subsData, statsData] = await Promise.all([
        api.get<ShopSubscription[]>('/subscriptions/admin/all'),
        api.get<SubscriptionStats>('/subscriptions/admin/stats'),
      ]);
      
      setSubscriptions(subsData || []);
      setStats(statsData || null);
      
      // Update cache
      subscriptionCache.data = subsData || [];
      subscriptionCache.stats = statsData || null;
      subscriptionCache.timestamp = now;
    } catch (error: any) {
      console.error('Failed to fetch subscriptions:', error);
      const errorMsg = error?.message || 'Failed to fetch subscriptions. Please ensure you are logged in as super admin.';
      setMessage({ type: 'error', text: errorMsg });
      setSubscriptions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for refresh events that should trigger data refetch
  useRefreshEvent(
    ['shop:updated', 'subscription:updated', 'payment:completed', 'invoice:paid'],
    () => {
      // Force refresh when payments are verified or subscriptions are updated
      fetchData(true);
    },
    [fetchData]
  );

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch = 
        sub.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.shopEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesPlan = planFilter === 'all' || sub.planCode === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [subscriptions, searchQuery, statusFilter, planFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubscriptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubscriptions, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, planFilter]);

  // Multi-select handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSubscriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSubscriptions.map(s => s.shopId)));
    }
  };

  const toggleSelect = (shopId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(shopId)) {
      newSet.delete(shopId);
    } else {
      newSet.add(shopId);
    }
    setSelectedIds(newSet);
  };

  // Action handlers
  const handleSuspend = async (sub: ShopSubscription) => {
    try {
      setActionLoading(sub.shopId);
      await api.post(`/subscriptions/admin/${sub.shopId}/suspend`);
      setMessage({ type: 'success', text: `${sub.shopName} subscription suspended` });
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to suspend subscription' });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: 'suspend' });
    }
  };

  const handleReactivate = async (sub: ShopSubscription) => {
    try {
      setActionLoading(sub.shopId);
      await api.post(`/subscriptions/admin/${sub.shopId}/reactivate`);
      setMessage({ type: 'success', text: `${sub.shopName} subscription reactivated` });
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to reactivate subscription' });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: 'reactivate' });
    }
  };

  const handleSendInvoice = async (sub: ShopSubscription) => {
    try {
      setActionLoading(sub.shopId);
      await api.post(`/subscriptions/admin/${sub.shopId}/send-invoice`);
      setMessage({ type: 'success', text: `Invoice sent to ${sub.shopEmail}` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send invoice' });
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (sub: ShopSubscription) => {
    setEditForm({
      planCode: sub.planCode,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodEnd: new Date(sub.currentPeriodEnd).toISOString().split('T')[0],
      currentPrice: sub.currentPrice,
    });
    setEditDialog(sub);
  };

  // Handle manual plan update
  const handleUpdatePlan = async () => {
    if (!editDialog) return;
    
    try {
      setActionLoading(editDialog.shopId);
      await api.put(`/subscriptions/admin/${editDialog.shopId}/update`, {
        planCode: editForm.planCode,
        status: editForm.status,
        billingCycle: editForm.billingCycle,
        currentPeriodEnd: new Date(editForm.currentPeriodEnd).toISOString(),
        currentPrice: editForm.currentPrice,
      });
      setMessage({ type: 'success', text: `${editDialog.shopName} subscription updated successfully` });
      setEditDialog(null);
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update subscription' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle fix trial subscriptions
  const handleFixTrialSubscriptions = async () => {
    try {
      setActionLoading('maintenance');
      const result = await api.post<{ fixed: number; skipped: number; details: string[] }>('/subscriptions/admin/fix-trial-subscriptions');
      setMessage({ 
        type: 'success', 
        text: `Fixed ${result.fixed} trial subscriptions. ${result.details.slice(0, 3).join(', ')}${result.details.length > 3 ? '...' : ''}` 
      });
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to fix trial subscriptions' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle audit subscriptions
  const handleAuditSubscriptions = async () => {
    try {
      setActionLoading('maintenance');
      const result = await api.post<{ audited: number; fixed: number; issues: string[] }>('/subscriptions/admin/audit-subscriptions');
      setMessage({ 
        type: 'success', 
        text: `Audited ${result.audited} subscriptions, fixed ${result.fixed} issues. ${result.issues.slice(0, 3).join(', ')}${result.issues.length > 3 ? '...' : ''}` 
      });
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to audit subscriptions' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle grace period grant
  const handleGrantGracePeriod = async () => {
    if (!graceDialog) return;
    
    // Calculate days from date range if dates are provided, otherwise use manual days
    const calculatedDays = graceEndDate && graceStartDate 
      ? calculateGraceDays(graceStartDate, graceEndDate) 
      : graceDays;
    
    if (calculatedDays < 1) {
      setMessage({ type: 'error', text: 'Please select a valid date range (end date must be after start date)' });
      return;
    }
    
    try {
      setActionLoading(graceDialog.shopId);
      await api.post(`/subscriptions/admin/${graceDialog.shopId}/grace-period`, {
        days: calculatedDays,
        startDate: graceStartDate || undefined,
        endDate: graceEndDate || undefined,
        reason: graceReason,
        sendEmail: true,
      });
      setMessage({ type: 'success', text: `Grace period of ${calculatedDays} days granted to ${graceDialog.shopName}` });
      setGraceDialog(null);
      setGraceDays(7);
      setGraceStartDate('');
      setGraceEndDate('');
      setGraceReason('');
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to grant grace period' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: 'suspend' | 'reactivate') => {
    const selectedSubs = subscriptions.filter(s => selectedIds.has(s.shopId));
    if (selectedSubs.length === 0) return;

    try {
      setActionLoading('bulk');
      const endpoint = action === 'suspend' ? 'suspend' : 'reactivate';
      await Promise.all(
        selectedSubs.map(sub => api.post(`/subscriptions/admin/${sub.shopId}/${endpoint}`))
      );
      setMessage({ type: 'success', text: `${selectedSubs.length} subscriptions ${action}d` });
      setSelectedIds(new Set());
      await fetchData(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || `Failed to ${action} subscriptions` });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: action === 'suspend' ? 'bulk_suspend' : 'bulk_reactivate' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="h-6 w-6 md:h-7 md:w-7 text-amber-500" />
            Subscription Management
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Monitor and manage all shop subscriptions</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">{selectedIds.size} Selected</span>
                  <span className="sm:hidden">{selectedIds.size}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setConfirmDialog({ open: true, type: 'bulk_suspend' })}
                  className="text-red-600"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Selected
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setConfirmDialog({ open: true, type: 'bulk_reactivate' })}
                  className="text-green-600"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Reactivate Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Maintenance</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleFixTrialSubscriptions}>
                <Clock className="h-4 w-4 mr-2" />
                Fix Trial Periods (14 days)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAuditSubscriptions}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Audit & Fix Mismatches
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fetchData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Total Shops</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{stats.totalShops}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Active Subscriptions</p>
                <p className="text-xl md:text-2xl font-bold mt-1 text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Trial Users</p>
                <p className="text-xl md:text-2xl font-bold mt-1 text-blue-600">{stats.trialSubscriptions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Monthly Revenue</p>
                <p className="text-xl md:text-2xl font-bold mt-1">KES {stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Breakdown */}
      {stats && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Plan Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Object.entries(stats.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{plan}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      plan === 'starter' ? 'bg-blue-500' :
                      plan === 'basic' ? 'bg-green-500' :
                      plan === 'silver' ? 'bg-purple-500' :
                      'bg-amber-500'
                    }`}
                    style={{ width: `${(count / stats.totalShops) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 md:gap-4">
          <div className="flex-1 md:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="basic">Basic</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {selectedIds.size === paginatedSubscriptions.length && paginatedSubscriptions.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Expires</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedSubscriptions.map((sub) => {
                const statusConfig = statusColors[sub.status] || statusColors.active;
                const isSelected = selectedIds.has(sub.shopId);
                const isLoading = actionLoading === sub.shopId;
                return (
                  <tr key={sub.shopId} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => toggleSelect(sub.shopId)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sub.shopName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{sub.shopEmail}</p>
                        <p className="text-xs text-gray-400 md:hidden mt-1">{sub.planName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        sub.planCode === 'starter' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        sub.planCode === 'basic' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        sub.planCode === 'silver' ? 'bg-violet-100 text-violet-900 border-violet-300' :
                        sub.planCode === 'trial' ? 'bg-gray-100 text-gray-900 border-gray-300' :
                        'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {sub.planName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.icon}
                        <span className="hidden sm:inline">{sub.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div>
                        <p className="font-medium">KES {sub.currentPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 capitalize">{sub.billingDisplay || sub.billingCycle}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Store className="h-3 w-3 text-gray-400" />
                          <span>{sub.usage.shops.current}/{sub.usage.shops.limit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span>{sub.usage.employees.current}/{sub.usage.employees.limit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-gray-400" />
                          <span>{sub.usage.products.current}/{sub.usage.products.limit}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div>
                        <p className="font-medium">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
                        <p className={`text-xs ${sub.daysRemaining < 0 ? 'text-red-600' : sub.daysRemaining < 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {sub.daysRemaining < 0 ? `${Math.abs(sub.daysRemaining)} days overdue` : `${sub.daysRemaining} days left`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setViewDialog(sub)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendInvoice(sub)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setGraceDialog(sub)}
                              className="text-blue-600"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Grant Grace Period
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sub.status === 'suspended' || sub.status === 'cancelled' ? (
                              <DropdownMenuItem 
                                onClick={() => setConfirmDialog({ open: true, type: 'reactivate', subscription: sub })}
                                className="text-green-600"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => setConfirmDialog({ open: true, type: 'suspend', subscription: sub })}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginatedSubscriptions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No subscriptions found matching your criteria
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubscriptions.length)} of {filteredSubscriptions.length} subscriptions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {viewDialog?.shopName}
            </DialogTitle>
            <DialogDescription>{viewDialog?.shopEmail}</DialogDescription>
          </DialogHeader>
          {viewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium">{viewDialog.planName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    statusColors[viewDialog.status]?.bg || 'bg-gray-100'
                  } ${statusColors[viewDialog.status]?.text || 'text-gray-900'}`}>
                    {viewDialog.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Billing</p>
                  <p className="font-medium">KES {viewDialog.currentPrice.toLocaleString()} / {viewDialog.billingCycle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="font-medium">{new Date(viewDialog.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Usage</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Store className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                    <p className="font-bold">{viewDialog.usage.shops.current}/{viewDialog.usage.shops.limit}</p>
                    <p className="text-xs text-gray-500">Shops</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                    <p className="font-bold">{viewDialog.usage.employees.current}/{viewDialog.usage.employees.limit}</p>
                    <p className="text-xs text-gray-500">Employees</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Package className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                    <p className="font-bold">{viewDialog.usage.products.current}/{viewDialog.usage.products.limit}</p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewDialog(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewDialog) handleSendInvoice(viewDialog);
              setViewDialog(null);
            }}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Subscription
            </DialogTitle>
            <DialogDescription>
              Manually configure {editDialog?.shopName}'s subscription
            </DialogDescription>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Plan</label>
                <Select value={editForm.planCode} onValueChange={(v) => setEditForm(prev => ({ ...prev, planCode: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (Free - 14 days)</SelectItem>
                    <SelectItem value="starter">Starter (Daily KES 99)</SelectItem>
                    <SelectItem value="basic">Basic (Monthly KES 1,500)</SelectItem>
                    <SelectItem value="silver">Silver (Monthly KES 3,000)</SelectItem>
                    <SelectItem value="gold">Gold (Monthly KES 4,500)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Billing Cycle</label>
                <Select value={editForm.billingCycle} onValueChange={(v) => setEditForm(prev => ({ ...prev, billingCycle: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Period End Date</label>
                <Input
                  type="date"
                  value={editForm.currentPeriodEnd}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currentPeriodEnd: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Price (KES)</label>
                <Input
                  type="number"
                  value={editForm.currentPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currentPrice: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlan} disabled={actionLoading !== null}>
              {actionLoading === editDialog?.shopId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grace Period Dialog - Calendar-based Date Selection */}
      <Dialog open={!!graceDialog} onOpenChange={() => {
        setGraceDialog(null);
        setGraceStartDate('');
        setGraceEndDate('');
        setGraceDays(7);
        setGraceReason('');
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Grant Grace Period
            </DialogTitle>
            <DialogDescription>
              Extend {graceDialog?.shopName}'s subscription. Choose a date range or enter days manually.
            </DialogDescription>
          </DialogHeader>
          {graceDialog && (
            <div className="space-y-4">
              {/* Current subscription info */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Expiry:</span>
                  <span className="font-medium">{new Date(graceDialog.currentPeriodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={graceDialog.status === 'active' ? 'default' : 'destructive'}>
                    {graceDialog.status}
                  </Badge>
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Date Range
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Start Date</label>
                    <Input
                      type="date"
                      value={graceStartDate}
                      onChange={(e) => {
                        setGraceStartDate(e.target.value);
                        // Auto-calculate days when both dates are set
                        if (graceEndDate) {
                          setGraceDays(calculateGraceDays(e.target.value, graceEndDate));
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End Date</label>
                    <Input
                      type="date"
                      value={graceEndDate}
                      onChange={(e) => {
                        setGraceEndDate(e.target.value);
                        // Auto-calculate days when both dates are set
                        if (graceStartDate) {
                          setGraceDays(calculateGraceDays(graceStartDate, e.target.value));
                        }
                      }}
                      min={graceStartDate || new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>
                </div>
                {graceStartDate && graceEndDate && (
                  <p className="text-sm text-center text-blue-600 font-medium">
                    = {calculateGraceDays(graceStartDate, graceEndDate)} days extension
                  </p>
                )}
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Manual Days Entry */}
              <div>
                <label className="text-sm font-medium text-gray-700">Enter Days Manually</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={graceDays}
                    onChange={(e) => {
                      setGraceDays(Number(e.target.value));
                      // Clear date selection when manually entering days
                      setGraceStartDate('');
                      setGraceEndDate('');
                    }}
                    className="w-24"
                  />
                  <span className="flex items-center text-sm text-gray-500">days from current expiry</span>
                </div>
                {!graceStartDate && !graceEndDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    New expiry: {new Date(new Date(graceDialog.currentPeriodEnd).getTime() + graceDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
                <Input
                  value={graceReason}
                  onChange={(e) => setGraceReason(e.target.value)}
                  placeholder="e.g., Service downtime compensation, Customer loyalty"
                  className="mt-1"
                />
              </div>

              {/* Summary */}
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-green-800">
                <p className="font-medium">This action will:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Extend subscription by <strong>{graceEndDate && graceStartDate ? calculateGraceDays(graceStartDate, graceEndDate) : graceDays}</strong> days</li>
                  <li>Set new expiry to <strong>{
                    graceEndDate 
                      ? new Date(graceEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : new Date(new Date(graceDialog.currentPeriodEnd).getTime() + graceDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  }</strong></li>
                  <li>Reactivate account if suspended/expired</li>
                  <li>Send notification email to shop owner</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setGraceDialog(null);
              setGraceStartDate('');
              setGraceEndDate('');
              setGraceDays(7);
              setGraceReason('');
            }} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button 
              onClick={handleGrantGracePeriod} 
              disabled={actionLoading !== null || (Boolean(graceStartDate || graceEndDate) && calculateGraceDays(graceStartDate, graceEndDate) < 1)}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === graceDialog?.shopId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Grant Grace Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'suspend' && 'Suspend Subscription'}
              {confirmDialog.type === 'reactivate' && 'Reactivate Subscription'}
              {confirmDialog.type === 'bulk_suspend' && `Suspend ${selectedIds.size} Subscriptions`}
              {confirmDialog.type === 'bulk_reactivate' && `Reactivate ${selectedIds.size} Subscriptions`}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'suspend' && `Are you sure you want to suspend ${confirmDialog.subscription?.shopName}'s subscription? They will lose access to their shop.`}
              {confirmDialog.type === 'reactivate' && `Are you sure you want to reactivate ${confirmDialog.subscription?.shopName}'s subscription?`}
              {confirmDialog.type === 'bulk_suspend' && `Are you sure you want to suspend ${selectedIds.size} subscriptions? These shops will lose access.`}
              {confirmDialog.type === 'bulk_reactivate' && `Are you sure you want to reactivate ${selectedIds.size} subscriptions?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, type: 'suspend' })}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type.includes('suspend') ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmDialog.type === 'suspend' && confirmDialog.subscription) {
                  handleSuspend(confirmDialog.subscription);
                } else if (confirmDialog.type === 'reactivate' && confirmDialog.subscription) {
                  handleReactivate(confirmDialog.subscription);
                } else if (confirmDialog.type === 'bulk_suspend') {
                  handleBulkAction('suspend');
                } else if (confirmDialog.type === 'bulk_reactivate') {
                  handleBulkAction('reactivate');
                }
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog.type.includes('suspend') ? 'Suspend' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// SECURITY: Protect with AuthGuard
export default function SuperAdminSubscriptions() {
  return (
    <AuthGuard requiredRole="super_admin" fallbackRoute="/login">
      <SuperAdminSubscriptionsContent />
    </AuthGuard>
  );
}
