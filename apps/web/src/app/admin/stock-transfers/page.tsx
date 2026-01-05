'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  ArrowRight,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Send,
  PackageCheck,
  Loader2,
  Building2,
  ArrowLeftRight,
} from 'lucide-react';

interface TransferItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
}

interface StockTransfer {
  _id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  transferType: string;
  items: TransferItem[];
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'partially_received' | 'received' | 'cancelled' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reason?: string;
  notes?: string;
  totalValue?: number;
  createdAt: string;
  requestedBy?: string;
  approvedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
}

interface TransferStats {
  pending: number;
  inTransit: number;
  received: number;
  cancelled: number;
  totalValue: number;
  thisMonth: number;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
  status: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  stock?: number;
  price: number;
  cost?: number;
}

export default function StockTransfersPage() {
  const { token } = useAuth();
  const { branches: contextBranches } = useBranch();
  
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create transfer dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fromBranchId: '',
    toBranchId: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    reason: '',
    notes: '',
  });
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View transfer dialog
  const [viewTransfer, setViewTransfer] = useState<StockTransfer | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchTransfers = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`${config.apiUrl}/stock-transfers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${config.apiUrl}/stock-transfers/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

  const fetchBranches = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${config.apiUrl}/branches/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setBranches(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${config.apiUrl}/inventory/products?status=active&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTransfers();
    fetchStats();
    fetchBranches();
    fetchProducts();
  }, [fetchTransfers, fetchStats, fetchBranches, fetchProducts]);

  const handleCreateTransfer = async () => {
    if (!createForm.fromBranchId || !createForm.toBranchId) {
      setError('Please select source and destination branches');
      return;
    }
    if (createForm.fromBranchId === createForm.toBranchId) {
      setError('Source and destination branches must be different');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please add at least one item to transfer');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`${config.apiUrl}/stock-transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...createForm,
          items: selectedItems,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess('Stock transfer request created successfully');
        setIsCreateOpen(false);
        setCreateForm({ fromBranchId: '', toBranchId: '', priority: 'normal', reason: '', notes: '' });
        setSelectedItems([]);
        fetchTransfers();
        fetchStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to create transfer');
      }
    } catch (err) {
      setError('Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (transferId: string, action: 'approve' | 'reject' | 'ship' | 'cancel', reason?: string) => {
    try {
      const body: any = {};
      if (action === 'reject' || action === 'cancel') {
        body.reason = reason || 'No reason provided';
      }
      
      const res = await fetch(`${config.apiUrl}/stock-transfers/${transferId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        setSuccess(`Transfer ${action}ed successfully`);
        fetchTransfers();
        fetchStats();
        setIsViewOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.message || `Failed to ${action} transfer`);
      }
    } catch (err) {
      setError(`Failed to ${action} transfer`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      partially_received: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      in_transit: 'In Transit',
      partially_received: 'Partial',
      received: 'Received',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
    };
    
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    };
    
    return (
      <Badge variant="outline" className={styles[priority]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
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
      hour: '2-digit',
      minute: '2-digit',
    });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredTransfers = transfers.filter(t =>
    t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fromBranchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.toBranchName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-2">
            Transfer inventory between branches
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inTransit}</div>
              <p className="text-xs text-muted-foreground">Being shipped</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.received}</div>
              <p className="text-xs text-muted-foreground">This month: {stats.thisMonth}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">Transferred goods</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Status</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button variant="outline" onClick={() => { fetchTransfers(); fetchStats(); }} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Transfers List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No transfers found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Create your first stock transfer'}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              New Transfer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTransfers.map((transfer) => (
            <Card key={transfer._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ArrowLeftRight className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{transfer.transferNumber}</span>
                        {getStatusBadge(transfer.status)}
                        {getPriorityBadge(transfer.priority)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        <span>{transfer.fromBranchName}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{transfer.toBranchName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{transfer.items.length} items</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(transfer.totalValue || 0)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDate(transfer.createdAt)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setViewTransfer(transfer); setIsViewOpen(true); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Transfer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one branch to another
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Branch Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Branch *</Label>
                <select
                  value={createForm.fromBranchId}
                  onChange={(e) => setCreateForm({ ...createForm, fromBranchId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select source branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>To Branch *</Label>
                <select
                  value={createForm.toBranchId}
                  onChange={(e) => setCreateForm({ ...createForm, toBranchId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select destination branch</option>
                  {branches.filter(b => b._id !== createForm.fromBranchId).map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Reason */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="e.g., Stock replenishment"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Add Products *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {productSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        if (!selectedItems.find(i => i.productId === product._id)) {
                          setSelectedItems([...selectedItems, { productId: product._id, quantity: 1 }]);
                        }
                        setProductSearch('');
                      }}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku || 'N/A'} • Stock: {product.stock || 0}
                        </p>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Items ({selectedItems.length})</Label>
                <div className="border rounded-md divide-y">
                  {selectedItems.map((item, index) => {
                    const product = products.find(p => p._id === item.productId);
                    return (
                      <div key={item.productId} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Available: {product?.stock || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={product?.stock || 999}
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...selectedItems];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setSelectedItems(newItems);
                            }}
                            className="w-20"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transfer {viewTransfer?.transferNumber}
              {viewTransfer && getStatusBadge(viewTransfer.status)}
            </DialogTitle>
          </DialogHeader>
          
          {viewTransfer && (
            <div className="space-y-6">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{viewTransfer.fromBranchName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{viewTransfer.toBranchName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  {getPriorityBadge(viewTransfer.priority)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(viewTransfer.createdAt)}</p>
                </div>
              </div>

              {viewTransfer.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="font-medium">{viewTransfer.reason}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Items ({viewTransfer.items.length})</p>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {viewTransfer.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.quantity} units</p>
                        {item.receivedQuantity !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Received: {item.receivedQuantity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Value */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="font-medium">Total Value</span>
                <span className="text-lg font-bold">{formatCurrency(viewTransfer.totalValue || 0)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {viewTransfer.status === 'pending_approval' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) handleAction(viewTransfer._id, 'reject', reason);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleAction(viewTransfer._id, 'approve')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {viewTransfer.status === 'approved' && (
                  <Button onClick={() => handleAction(viewTransfer._id, 'ship')}>
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Shipped
                  </Button>
                )}
                {['pending_approval', 'approved'].includes(viewTransfer.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Enter cancellation reason:');
                      if (reason) handleAction(viewTransfer._id, 'cancel', reason);
                    }}
                  >
                    Cancel Transfer
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
