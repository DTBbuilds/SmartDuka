'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Package,
  TrendingUp,
  Settings,
  CreditCard,
  Activity,
  AlertCircle,
  Edit2,
  Loader2,
} from 'lucide-react';

interface Branch {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  inventoryType: 'shared' | 'separate';
  canTransferStock?: boolean;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  location?: {
    county?: string;
    subCounty?: string;
    ward?: string;
    landmark?: string;
    buildingName?: string;
    floor?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    deliveryRadius?: number;
  };
  operations?: {
    acceptsWalkIn?: boolean;
    acceptsDelivery?: boolean;
    acceptsPickup?: boolean;
    deliveryFee?: number;
    minimumOrderAmount?: number;
  };
  contacts?: {
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
  };
  paymentConfig?: {
    enabled?: boolean;
    useShopConfig?: boolean;
    type?: 'paybill' | 'till';
    shortCode?: string;
    verificationStatus?: 'pending' | 'verified' | 'failed';
  };
  managerId?: string;
  staffIds?: string[];
  maxStaff?: number;
  targetRevenue?: number;
  createdAt: string;
  updatedAt?: string;
}

interface BranchStats {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  staffCount: number;
  productCount: number;
  lowStockCount: number;
}

interface RecentActivity {
  _id: string;
  action: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  details?: any;
  timestamp: string;
  createdAt?: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  lastActive?: string;
}

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const branchId = params.id as string;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = config.apiUrl;

  useEffect(() => {
    if (branchId) {
      fetchBranchDetails();
    }
  }, [branchId]);

  const fetchBranchDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch branch details
      const branchRes = await fetch(`${apiUrl}/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!branchRes.ok) {
        throw new Error('Branch not found');
      }

      const branchData = await branchRes.json();
      setBranch(branchData.data || branchData);

      // Fetch branch stats (optional - may not exist yet)
      try {
        const statsRes = await fetch(`${apiUrl}/branches/${branchId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || statsData);
        }
      } catch {
        // Stats endpoint may not exist yet
      }

      // Fetch recent activity
      setActivityLoading(true);
      try {
        const activityRes = await fetch(`${apiUrl}/activity?branchId=${branchId}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          const activityList = Array.isArray(activityData) ? activityData : (activityData.data || []);
          // Filter out heartbeat actions for cleaner display
          setActivities(activityList.filter((a: RecentActivity) => a.action !== 'heartbeat'));
        }
      } catch {
        // Activity endpoint may not exist yet
      } finally {
        setActivityLoading(false);
      }

      // Fetch staff members for this branch using staff-assignment API
      try {
        const staffRes = await fetch(`${apiUrl}/staff-assignment/branch/${branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          const staffList = Array.isArray(staffData) ? staffData : (staffData.data || []);
          setStaffMembers(staffList);
        }
      } catch {
        // Staff endpoint may not exist
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branch details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getActivityIcon = (action: string): { icon: React.ReactNode; bg: string } => {
    const icons: Record<string, { icon: React.ReactNode; bg: string }> = {
      login: { icon: <Users className="h-4 w-4 text-green-600" />, bg: 'bg-green-100' },
      login_pin: { icon: <Users className="h-4 w-4 text-green-600" />, bg: 'bg-green-100' },
      logout: { icon: <Users className="h-4 w-4 text-gray-600" />, bg: 'bg-gray-100' },
      checkout: { icon: <TrendingUp className="h-4 w-4 text-blue-600" />, bg: 'bg-blue-100' },
      product_add: { icon: <Package className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-100' },
      product_edit: { icon: <Edit2 className="h-4 w-4 text-orange-600" />, bg: 'bg-orange-100' },
      stock_update: { icon: <Package className="h-4 w-4 text-indigo-600" />, bg: 'bg-indigo-100' },
      status_change: { icon: <Activity className="h-4 w-4 text-yellow-600" />, bg: 'bg-yellow-100' },
    };
    return icons[action] || { icon: <Activity className="h-4 w-4 text-gray-600" />, bg: 'bg-gray-100' };
  };

  const formatActivityAction = (action: string): string => {
    const labels: Record<string, string> = {
      login: 'Logged In',
      login_pin: 'Logged In (PIN)',
      logout: 'Logged Out',
      checkout: 'Completed Sale',
      product_add: 'Added Product',
      product_edit: 'Edited Product',
      product_delete: 'Deleted Product',
      stock_update: 'Updated Stock',
      status_change: 'Status Changed',
      shift_start: 'Started Shift',
      shift_end: 'Ended Shift',
      transaction_void: 'Voided Transaction',
      transaction_refund: 'Processed Refund',
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatActivityDetails = (details: any): string => {
    if (!details) return '';
    const parts: string[] = [];
    if (details.amount) parts.push(`KES ${details.amount.toLocaleString()}`);
    if (details.items) parts.push(`${details.items} items`);
    if (details.productName) parts.push(details.productName);
    if (details.paymentMethod) parts.push(details.paymentMethod);
    if (details.status) parts.push(details.status);
    return parts.join(' • ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Branch not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{branch.name}</h1>
              <Badge className={getStatusColor(branch.status)}>{branch.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Code: {branch.code} • Created {formatDate(branch.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/branches/${branchId}/settings`)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button onClick={() => router.push(`/admin/branches`)} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Branch
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.todaySales || 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.todayOrders || 0} orders today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalSales || 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.totalOrders || 0} total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branch.staffIds?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {branch.maxStaff ? `of ${branch.maxStaff} max` : 'No limit set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.productCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.lowStockCount || 0} low stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Branch Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Branch Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {branch.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{branch.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Type</p>
                  <p className="font-medium capitalize">{branch.inventoryType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Transfer</p>
                  <p className="font-medium">
                    {branch.canTransferStock ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {branch.targetRevenue && (
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Target</p>
                    <p className="font-medium">{formatCurrency(branch.targetRevenue)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact & Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Contact & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {branch.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{branch.address}</p>
                      {branch.location?.county && (
                        <p className="text-sm text-muted-foreground">
                          {branch.location.subCounty && `${branch.location.subCounty}, `}
                          {branch.location.county}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {(branch.phone || branch.contacts?.primaryPhone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{branch.phone || branch.contacts?.primaryPhone}</p>
                  </div>
                )}
                {(branch.email || branch.contacts?.email) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{branch.email || branch.contacts?.email}</p>
                  </div>
                )}
                {(branch.openingTime || branch.closingTime) && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {branch.openingTime || '00:00'} - {branch.closingTime || '23:59'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Walk-in</span>
                  <Badge variant={branch.operations?.acceptsWalkIn ? 'default' : 'secondary'}>
                    {branch.operations?.acceptsWalkIn ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Delivery</span>
                  <Badge variant={branch.operations?.acceptsDelivery ? 'default' : 'secondary'}>
                    {branch.operations?.acceptsDelivery ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pickup</span>
                  <Badge variant={branch.operations?.acceptsPickup ? 'default' : 'secondary'}>
                    {branch.operations?.acceptsPickup ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {branch.operations?.deliveryFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delivery Fee</span>
                    <span className="font-medium">{formatCurrency(branch.operations.deliveryFee)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">M-Pesa Enabled</span>
                  <Badge variant={branch.paymentConfig?.enabled ? 'default' : 'secondary'}>
                    {branch.paymentConfig?.enabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Config Source</span>
                  <span className="font-medium">
                    {branch.paymentConfig?.useShopConfig ? 'Shop Default' : 'Branch Specific'}
                  </span>
                </div>
                {branch.paymentConfig?.shortCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Short Code</span>
                    <span className="font-medium">{branch.paymentConfig.shortCode}</span>
                  </div>
                )}
                {branch.paymentConfig?.type && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Type</span>
                    <span className="font-medium capitalize">{branch.paymentConfig.type}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verification</span>
                  <Badge
                    variant={
                      branch.paymentConfig?.verificationStatus === 'verified'
                        ? 'default'
                        : branch.paymentConfig?.verificationStatus === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {branch.paymentConfig?.verificationStatus || 'Not configured'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/admin/branches/${branchId}/settings?tab=payments`)}
                >
                  Configure Payments
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions at this branch</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity recorded for this branch</p>
                  <p className="text-sm mt-1">Activity will appear here as staff perform actions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getActivityIcon(activity.action).bg}`}>
                          {getActivityIcon(activity.action).icon}
                        </div>
                        <div>
                          <p className="font-medium">{formatActivityAction(activity.action)}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {activity.userName && <span>by {activity.userName}</span>}
                            {activity.userRole && (
                              <Badge variant="outline" className="text-xs">
                                {activity.userRole}
                              </Badge>
                            )}
                          </div>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatActivityDetails(activity.details)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{formatDate(activity.timestamp || activity.createdAt || '')}</p>
                        <p>{formatTime(activity.timestamp || activity.createdAt || '')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Branch Staff</CardTitle>
                <CardDescription>
                  {staffMembers.length} staff members assigned
                  {branch.maxStaff && ` (max: ${branch.maxStaff})`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/staff-assignment')}
              >
                Manage Staff
              </Button>
            </CardHeader>
            <CardContent>
              {staffMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No staff assigned to this branch yet</p>
                  <Button
                    variant="link"
                    onClick={() => router.push('/admin/staff-assignment')}
                    className="mt-2"
                  >
                    Assign Staff Members
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffMembers.map((staff) => (
                    <div
                      key={staff._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {staff.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {staff.role}
                        </Badge>
                        {staff.status && (
                          <Badge 
                            variant={staff.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {staff.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure M-Pesa and other payment methods for this branch</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/admin/branches/${branchId}/settings?tab=payments`)}
              >
                Configure Payment Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
