'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Filter, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditLog {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  branchId?: string;
  changes?: Record<string, any>;
  reason?: string;
  createdAt: string;
  ipAddress?: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

export default function AuditLogsPage() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    branchId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const limit = 20;

  useEffect(() => {
    fetchBranches();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, page]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const brText = await res.text();
      const brData = brText ? JSON.parse(brText) : [];
      
      if (res.ok) {
        setBranches(Array.isArray(brData) ? brData : []);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      params.append('limit', limit.toString());
      params.append('skip', ((page - 1) * limit).toString());

      const res = await fetch(`${config.apiUrl}/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const logsText = await res.text();
      const data = logsText ? JSON.parse(logsText) : {};
      
      if (res.ok) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotalPages(Math.ceil((data.total || 0) / limit));
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`${config.apiUrl}/audit/logs/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      setError('Failed to export logs');
    }
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      assign: 'bg-purple-100 text-purple-800',
      remove: 'bg-orange-100 text-orange-800',
      checkout: 'bg-cyan-100 text-cyan-800',
      login: 'bg-indigo-100 text-indigo-800',
      logout: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'System';
    const branch = branches.find((b) => b._id === branchId);
    return branch?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">View all system actions and changes</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
              />
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => {
                  setFilters({ ...filters, action: value });
                  setPage(1);
                }}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="assign">Assign</SelectItem>
                  <SelectItem value="remove">Remove</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resource */}
            <div className="space-y-2">
              <Label htmlFor="resource">Resource</Label>
              <Select
                value={filters.resource}
                onValueChange={(value) => {
                  setFilters({ ...filters, resource: value });
                  setPage(1);
                }}
              >
                <SelectTrigger id="resource">
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All resources</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={filters.branchId}
                onValueChange={(value) => {
                  setFilters({ ...filters, branchId: value });
                  setPage(1);
                }}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Date Range</Label>
              <div className="flex gap-2">
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setPage(1);
                  }}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setPage(1);
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading audit logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No logs found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                      <th className="text-left py-3 px-4 font-semibold">Action</th>
                      <th className="text-left py-3 px-4 font-semibold">Resource</th>
                      <th className="text-left py-3 px-4 font-semibold">Branch</th>
                      <th className="text-left py-3 px-4 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{log.resource}</td>
                        <td className="py-3 px-4 text-sm">{getBranchName(log.branchId)}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {log.reason || log.resourceId || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
