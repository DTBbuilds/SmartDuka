'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartLoader } from '@/components/ui/cart-loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Activity,
  TrendingUp,
  Clock,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  Calendar,
  Timer,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  UserCheck,
  UserX,
  Coffee,
  Pause,
  Play,
} from 'lucide-react';

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
  status: 'active' | 'inactive' | 'disabled';
  branchIds?: string[];
  lastActive?: string;
  createdAt: string;
}

interface StaffStats {
  userId: string;
  userName: string;
  role: string;
  todaySales: number;
  todayTransactions: number;
  weekSales: number;
  weekTransactions: number;
  monthSales: number;
  monthTransactions: number;
  avgTransactionValue: number;
  lastActivity?: string;
  status: 'online' | 'idle' | 'offline';
  shiftStart?: string;
  hoursWorked?: number;
}

interface ActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details?: any;
  timestamp: string;
}

interface DashboardStats {
  totalStaff: number;
  activeNow: number;
  idleNow: number;
  offlineNow: number;
  todayTotalSales: number;
  todayTotalTransactions: number;
  avgSalesPerCashier: number;
  topPerformer?: { name: string; sales: number };
}

export default function StaffMonitoringPage() {
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Build branch query parameter
      const branchQuery = currentBranch ? `&branchId=${currentBranch._id}` : '';

      // Fetch staff list filtered by branch
      const staffUrl = currentBranch 
        ? `${config.apiUrl}/staff-assignment/branch/${currentBranch._id}`
        : `${config.apiUrl}/users?role=cashier,admin`;
      
      const staffRes = await fetch(staffUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const staffList = Array.isArray(staffData) ? staffData : (staffData.data || []);
        setStaff(staffList);
      }

      // Fetch today's activity with limit, filtered by branch
      const activityRes = await fetch(`${config.apiUrl}/activity?limit=100${branchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        const activityList = Array.isArray(activityData) ? activityData : (activityData.data || []);
        // Filter out heartbeats for cleaner display
        setActivities(activityList.filter((a: ActivityLog) => a.action !== 'heartbeat').slice(0, 50));
      }
      setLastRefresh(new Date());

      // Calculate dashboard stats from activities
      calculateDashboardStats();
    } catch (err: any) {
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, [token, currentBranch]);

  const calculateDashboardStats = () => {
    // This would ideally come from a dedicated backend endpoint
    // For now, we'll calculate from available data
    const activeStaff = staff.filter(s => s.status === 'active');
    const checkoutActivities = activities.filter(a => a.action === 'checkout');
    
    // Note: checkout activity stores 'total' not 'amount'
    const totalSales = checkoutActivities.reduce((sum, a) => sum + (a.details?.total || a.details?.amount || 0), 0);
    
    // Group by user to find top performer
    const salesByUser: Record<string, { name: string; sales: number }> = {};
    checkoutActivities.forEach(a => {
      if (!salesByUser[a.userId]) {
        salesByUser[a.userId] = { name: a.userName, sales: 0 };
      }
      salesByUser[a.userId].sales += a.details?.total || a.details?.amount || 0;
    });
    
    const topPerformer = Object.values(salesByUser).sort((a, b) => b.sales - a.sales)[0];

    setDashboardStats({
      totalStaff: staff.length,
      activeNow: staff.filter(s => s.status === 'active').length,
      idleNow: 0, // Would need real-time status
      offlineNow: staff.filter(s => s.status !== 'active').length,
      todayTotalSales: totalSales,
      todayTotalTransactions: checkoutActivities.length,
      avgSalesPerCashier: activeStaff.length > 0 ? totalSales / activeStaff.length : 0,
      topPerformer,
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  useEffect(() => {
    if (staff.length > 0 && activities.length > 0) {
      calculateDashboardStats();
    }
  }, [staff, activities]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      online: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      idle: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-gray-100 text-gray-800',
      inactive: 'bg-gray-100 text-gray-800',
      disabled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      login: <UserCheck className="h-4 w-4 text-green-600" />,
      logout: <UserX className="h-4 w-4 text-gray-600" />,
      checkout: <ShoppingCart className="h-4 w-4 text-blue-600" />,
      status_change: <Activity className="h-4 w-4 text-yellow-600" />,
      shift_start: <Clock className="h-4 w-4 text-green-600" />,
      shift_end: <Clock className="h-4 w-4 text-red-600" />,
    };
    return icons[action] || <Activity className="h-4 w-4 text-gray-600" />;
  };

  const formatActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: 'Logged In',
      login_pin: 'Logged In (PIN)',
      logout: 'Logged Out',
      checkout: 'Completed Sale',
      status_change: 'Status Changed',
      shift_start: 'Started Shift',
      shift_end: 'Ended Shift',
      transaction_void: 'Voided Transaction',
      transaction_refund: 'Processed Refund',
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cashiers = filteredStaff.filter(s => s.role === 'cashier');
  const admins = filteredStaff.filter(s => s.role === 'admin');

  if (isLoading) {
    return <CartLoader size="lg" className="h-96" />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Staff Monitoring</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Real-time staff activity and performance tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle with high contrast */}
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            className={`gap-2 transition-all ${
              autoRefresh 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
            }`}
          >
            {autoRefresh ? (
              <><Play className="h-3 w-3" /> Auto-refresh ON</>
            ) : (
              <><Pause className="h-3 w-3" /> Auto-refresh OFF</>
            )}
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Last refresh indicator */}
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Last updated: {lastRefresh.toLocaleTimeString()}
        {autoRefresh && <span className="text-green-600 ml-2">• Auto-refreshing every 30s</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Stats - Mobile optimized */}
      {dashboardStats && (
        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{dashboardStats.totalStaff}</div>
              <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                <span className="text-[10px] md:text-xs text-green-600">{dashboardStats.activeNow} active</span>
                <span className="text-[10px] md:text-xs text-gray-500">{dashboardStats.offlineNow} offline</span>
              </div>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(dashboardStats.todayTotalSales)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {dashboardStats.todayTotalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Avg per Cashier</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(dashboardStats.avgSalesPerCashier)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Today's average</p>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Top Performer</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-base md:text-2xl font-bold truncate">
                {dashboardStats.topPerformer?.name || 'N/A'}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                {dashboardStats.topPerformer ? formatCurrency(dashboardStats.topPerformer.sales) : 'No sales yet'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search - Mobile optimized */}
      <div className="flex gap-2 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 md:h-10 text-sm"
          />
        </div>
      </div>

      {/* Tabs - Mobile scrollable */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="cashiers" className="text-xs md:text-sm">Cashiers ({cashiers.length})</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs md:text-sm">Live Activity</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs md:text-sm">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Mobile optimized */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {/* Active Staff */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Active Staff
                </CardTitle>
                <CardDescription>Currently working staff members</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredStaff.filter(s => s.status === 'active').length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No active staff at the moment
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredStaff.filter(s => s.status === 'active').slice(0, 5).map((member) => (
                      <div key={member._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700">
                              {member.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest staff actions</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No recent activity
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-muted">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{formatActionLabel(activity.action)}</p>
                            <p className="text-xs text-muted-foreground">{activity.userName}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cashiers Tab */}
        <TabsContent value="cashiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cashier Performance</CardTitle>
              <CardDescription>Individual cashier metrics and activity</CardDescription>
            </CardHeader>
            <CardContent>
              {cashiers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No cashiers found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cashiers.map((cashier) => {
                    const cashierActivities = activities.filter(a => a.userId === cashier._id);
                    const cashierSales = cashierActivities
                      .filter(a => a.action === 'checkout')
                      .reduce((sum, a) => sum + (a.details?.amount || 0), 0);
                    const transactionCount = cashierActivities.filter(a => a.action === 'checkout').length;

                    return (
                      <div
                        key={cashier._id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-medium text-primary">
                                {cashier.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">{cashier.name}</p>
                              <p className="text-sm text-muted-foreground">{cashier.email}</p>
                            </div>
                          </div>
                          {getStatusBadge(cashier.status)}
                        </div>

                        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-3 md:mt-4">
                          <div className="text-center p-1.5 md:p-2 bg-muted/50 rounded-lg">
                            <p className="text-sm md:text-lg font-bold text-green-600 truncate">{formatCurrency(cashierSales)}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Sales</p>
                          </div>
                          <div className="text-center p-1.5 md:p-2 bg-muted/50 rounded-lg">
                            <p className="text-sm md:text-lg font-bold text-blue-600">{transactionCount}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Trans.</p>
                          </div>
                          <div className="text-center p-1.5 md:p-2 bg-muted/50 rounded-lg">
                            <p className="text-sm md:text-lg font-bold text-purple-600 truncate">
                              {transactionCount > 0 ? formatCurrency(cashierSales / transactionCount) : 'N/A'}
                            </p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Avg</p>
                          </div>
                        </div>

                        {cashierActivities.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
                            <div className="flex flex-wrap gap-2">
                              {cashierActivities.slice(0, 3).map((a) => (
                                <Badge key={a._id} variant="outline" className="text-xs">
                                  {formatActionLabel(a.action)} • {formatTime(a.timestamp)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
              </CardTitle>
              <CardDescription>Real-time staff actions across all branches</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded today</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {activities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div>
                          <p className="font-medium">{formatActionLabel(activity.action)}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{activity.userName}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.userRole}
                            </Badge>
                          </div>
                          {activity.details && activity.action === 'checkout' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(activity.details.amount || 0)} • {activity.details.items || 0} items
                              {activity.details.paymentMethod && ` • ${activity.details.paymentMethod}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(activity.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sales Leaderboard
                </CardTitle>
                <CardDescription>Top performing cashiers today</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const salesByUser: Record<string, { name: string; sales: number; transactions: number }> = {};
                  activities.filter(a => a.action === 'checkout').forEach(a => {
                    if (!salesByUser[a.userId]) {
                      salesByUser[a.userId] = { name: a.userName, sales: 0, transactions: 0 };
                    }
                    salesByUser[a.userId].sales += a.details?.amount || 0;
                    salesByUser[a.userId].transactions += 1;
                  });
                  const leaderboard = Object.entries(salesByUser)
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => b.sales - a.sales);

                  if (leaderboard.length === 0) {
                    return (
                      <div className="text-center py-6 text-muted-foreground">
                        No sales data available
                      </div>
                    );
                  }

                  const maxSales = leaderboard[0]?.sales || 1;

                  return (
                    <div className="space-y-4">
                      {leaderboard.slice(0, 5).map((entry, index) => (
                        <div key={entry.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(entry.sales)}</p>
                              <p className="text-xs text-muted-foreground">{entry.transactions} sales</p>
                            </div>
                          </div>
                          <Progress value={(entry.sales / maxSales) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Activity Summary
                </CardTitle>
                <CardDescription>Today's activity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const actionCounts: Record<string, number> = {};
                  activities.forEach(a => {
                    actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
                  });

                  const sortedActions = Object.entries(actionCounts)
                    .sort((a, b) => b[1] - a[1]);

                  if (sortedActions.length === 0) {
                    return (
                      <div className="text-center py-6 text-muted-foreground">
                        No activity data available
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {sortedActions.map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            {getActivityIcon(action)}
                            <span className="font-medium">{formatActionLabel(action)}</span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
