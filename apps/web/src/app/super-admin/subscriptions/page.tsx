'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
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
  MoreVertical,
  Eye,
  Edit,
  Ban,
} from 'lucide-react';

interface ShopSubscription {
  shopId: string;
  shopName: string;
  shopEmail: string;
  planCode: string;
  planName: string;
  status: string;
  billingCycle: string;
  currentPrice: number;
  currentPeriodEnd: string;
  daysRemaining: number;
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

export default function SuperAdminSubscriptionsPage() {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ShopSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch real data from API
      const [subsData, statsData] = await Promise.all([
        api.get<ShopSubscription[]>('/subscriptions/admin/all'),
        api.get<SubscriptionStats>('/subscriptions/admin/stats'),
      ]);
      
      setSubscriptions(subsData || []);
      setStats(statsData || null);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      // Set empty state on error
      setSubscriptions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = 
      sub.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.shopEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.planCode === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" />
            Subscription Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage all shop subscriptions</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Shops</p>
                <p className="text-2xl font-bold mt-1">{stats.totalShops}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Subscriptions</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trial Users</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{stats.trialSubscriptions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-bold mt-1">KES {stats.monthlyRevenue.toLocaleString()}</p>
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
          <div className="grid grid-cols-4 gap-4">
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
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSubscriptions.map((sub) => {
                const statusConfig = statusColors[sub.status] || statusColors.active;
                return (
                  <tr key={sub.shopId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sub.shopName}</p>
                        <p className="text-sm text-gray-500">{sub.shopEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        sub.planCode === 'starter' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        sub.planCode === 'basic' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        sub.planCode === 'silver' ? 'bg-violet-100 text-violet-900 border-violet-300' :
                        'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {sub.planName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.icon}
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium">KES {sub.currentPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 capitalize">{sub.billingCycle}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
                        <p className={`text-xs ${sub.daysRemaining < 0 ? 'text-red-600' : sub.daysRemaining < 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {sub.daysRemaining < 0 ? `${Math.abs(sub.daysRemaining)} days overdue` : `${sub.daysRemaining} days left`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No subscriptions found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
