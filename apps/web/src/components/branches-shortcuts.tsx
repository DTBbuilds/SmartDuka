'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@smartduka/ui';
import { MapPin, Users, Package, TrendingUp, Plus, Eye, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';

type Branch = {
  _id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'suspended';
  staffCount?: number;
  inventory?: number;
  sales?: number;
  lastActivity?: string;
};

export function BranchesShortcuts() {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);

  useEffect(() => {
    loadBranches();
  }, [token]);

  const loadBranches = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${base}/branches`, { headers });
      if (res.ok) {
        const data = await res.json();
        const branchList = Array.isArray(data) ? data : data.data || [];
        setBranches(branchList);

        // Calculate totals
        const sales = branchList.reduce((sum: number, b: Branch) => sum + (b.sales || 0), 0);
        const staff = branchList.reduce((sum: number, b: Branch) => sum + (b.staffCount || 0), 0);
        setTotalSales(sales);
        setTotalStaff(staff);
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'suspended':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'inactive':
        return '⚪';
      case 'suspended':
        return '🔴';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Branch Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage all branches and view activity</p>
        </div>
        <Button
          onClick={() => router.push('/admin/branches')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Branches */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Branches</p>
                <p className="text-2xl font-bold">{branches.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Branches */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {branches.filter(b => b.status === 'active').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Staff */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{totalStaff}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Inventory */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">
                  {branches.reduce((sum: number, b: Branch) => sum + (b.inventory || 0), 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branches</CardTitle>
              <CardDescription>
                {loading ? 'Loading branches...' : `${branches.length} branch${branches.length !== 1 ? 'es' : ''}`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBranches}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && branches.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No branches yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/branches')}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Branch
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch) => (
                <div
                  key={branch._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  {/* Branch Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getStatusIcon(branch.status)}</span>
                      <h3 className="font-semibold truncate">{branch.name}</h3>
                      <Badge className={getStatusColor(branch.status)}>
                        {branch.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {branch.location}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 px-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Staff</p>
                      <p className="text-lg font-semibold">{branch.staffCount || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Items</p>
                      <p className="text-lg font-semibold">{branch.inventory || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Sales</p>
                      <p className="text-lg font-semibold">{branch.sales || 0}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/branches/${branch._id}`)}
                      title="View branch details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/branches/${branch._id}/settings`)}
                      title="Branch settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/branches')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Manage Branches</p>
                <p className="text-xs text-muted-foreground">View and edit all branches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/staff-assignment')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Staff Assignment</p>
                <p className="text-xs text-muted-foreground">Assign staff to branches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/branch-inventory')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Branch Inventory</p>
                <p className="text-xs text-muted-foreground">Manage inventory per branch</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/monitoring')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Activity Monitor</p>
                <p className="text-xs text-muted-foreground">View branch activity logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
