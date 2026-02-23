'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartLoader } from '@/components/ui/cart-loader';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  ArrowRight,
  ArrowLeft,
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
import { useRouter } from 'next/navigation';

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
  type?: 'main' | 'branch' | 'warehouse';
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
  const { token, shop } = useAuth();
  const { branches: contextBranches } = useBranch();
  const router = useRouter();
  
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

  // Receive transfer state
  const [isReceiveMode, setIsReceiveMode] = useState(false);
  const [receiveItems, setReceiveItems] = useState<{ productId: string; receivedQuantity: number; damagedQuantity: number }[]>([]);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

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
        // Handle both array response and {data: [...]} response format
        const branchList: Branch[] = Array.isArray(data) ? data : (data.data || data.branches || []);
        
        // Check if main branch exists, if not create a virtual one from shop data
        const hasMainBranch = branchList.some(b => b.type === 'main');
        if (!hasMainBranch && shop) {
          const virtualMainBranch: Branch = {
            _id: 'main',
            name: shop.name || 'Main Store',
            code: 'MAIN',
            type: 'main',
            status: 'active',
          };
          branchList.unshift(virtualMainBranch);
        }
        
        setBranches(branchList);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, [token, shop]);

  const fetchProducts = useCallback(async (branchId?: string) => {
    if (!token) return;
    
    try {
      // Filter products by source branch if specified
      const params = new URLSearchParams({ status: 'active', limit: '200' });
      if (branchId && branchId !== 'main') {
        params.set('branchId', branchId);
      }
      
      const res = await fetch(`${config.apiUrl}/inventory/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data.data || data || []);
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

  // Reload products when source branch changes and clear selected items
  useEffect(() => {
    if (createForm.fromBranchId) {
      fetchProducts(createForm.fromBranchId);
      setSelectedItems([]); // Clear selected items when source branch changes
    }
  }, [createForm.fromBranchId, fetchProducts]);

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
        const transferNum = data.transferNumber || '';
        setSuccess(`Stock transfer ${transferNum} created successfully! Awaiting approval.`);
        setIsCreateOpen(false);
        setCreateForm({ fromBranchId: '', toBranchId: '', priority: 'normal', reason: '', notes: '' });
        setSelectedItems([]);
        fetchTransfers();
        fetchStats();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        // Extract detailed error message
        const errorMsg = Array.isArray(data.message) 
          ? data.message.join(', ') 
          : (data.message || data.error || 'Failed to create transfer');
        setError(`Transfer failed: ${errorMsg}`);
        setTimeout(() => setError(null), 8000);
      }
    } catch (err: any) {
      setError(`Transfer failed: ${err?.message || 'Network error. Please try again.'}`);
      setTimeout(() => setError(null), 8000);
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

  const startReceive = (transfer: StockTransfer) => {
    setReceiveItems(
      transfer.items.map((item) => ({
        productId: item.productId,
        receivedQuantity: item.quantity,
        damagedQuantity: 0,
      })),
    );
    setReceiveNotes('');
    setIsReceiveMode(true);
  };

  const handleReceive = async () => {
    if (!viewTransfer) return;
    setIsReceiving(true);
    setError(null);

    try {
      const res = await fetch(`${config.apiUrl}/stock-transfers/${viewTransfer._id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: receiveItems,
          notes: receiveNotes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const msg = data.data?.status === 'received'
          ? 'Transfer fully received — stock updated at destination branch'
          : 'Transfer partially received — some items pending';
        setSuccess(msg);
        setIsReceiveMode(false);
        setIsViewOpen(false);
        fetchTransfers();
        fetchStats();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Failed to receive transfer');
      }
    } catch (err: any) {
      setError(`Receive failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsReceiving(false);
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
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Stock Transfers</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Transfer inventory between branches
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Transfer</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
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
        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{stats.pending}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          
          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{stats.inTransit}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Being shipped</p>
            </CardContent>
          </Card>
          
          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{stats.received}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">This month: {stats.thisMonth}</p>
            </CardContent>
          </Card>
          
          <Card className="p-3 md:p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="p-0 pt-2 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(stats.totalValue)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Transferred goods</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border rounded-md bg-background text-sm h-9"
          >
            <option value="all">All Status</option>
            <option value="pending_approval">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => { fetchTransfers(); fetchStats(); }} className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Transfers List */}
      {isLoading ? (
        <CartLoader size="md" className="h-64" />
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 md:h-64">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold">No transfers found</h3>
            <p className="text-muted-foreground text-xs mb-4">
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Create your first stock transfer'}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Transfer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((transfer) => (
            <Card
              key={transfer._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setViewTransfer(transfer); setIsReceiveMode(false); setIsViewOpen(true); }}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-semibold text-sm">{transfer.transferNumber}</span>
                      {getStatusBadge(transfer.status)}
                      {getPriorityBadge(transfer.priority)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[100px]">{transfer.fromBranchName}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[100px]">{transfer.toBranchName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{transfer.items.length} items</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(transfer.totalValue || 0)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{formatDate(transfer.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Transfer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one branch to another
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Branch Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
      <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setIsReceiveMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
              {viewTransfer?.transferNumber}
              {viewTransfer && getStatusBadge(viewTransfer.status)}
            </DialogTitle>
          </DialogHeader>
          
          {viewTransfer && (
            <div className="space-y-4">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm font-medium">{viewTransfer.fromBranchName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="text-sm font-medium">{viewTransfer.toBranchName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  {getPriorityBadge(viewTransfer.priority)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(viewTransfer.createdAt)}</p>
                </div>
              </div>

              {viewTransfer.reason && (
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm font-medium">{viewTransfer.reason}</p>
                </div>
              )}

              {/* Items — Normal view */}
              {!isReceiveMode && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Items ({viewTransfer.items.length})</p>
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {viewTransfer.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 sm:p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-medium">{item.quantity} units</p>
                          {item.receivedQuantity !== undefined && item.receivedQuantity > 0 && (
                            <p className="text-[10px] sm:text-xs text-green-600">
                              Received: {item.receivedQuantity}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items — Receive mode: editable quantities */}
              {isReceiveMode && (
                <div>
                  <p className="text-xs font-medium text-orange-600 mb-2">
                    Confirm received quantities for each item:
                  </p>
                  <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                    {viewTransfer.items.map((item, index) => {
                      const ri = receiveItems[index];
                      return (
                        <div key={index} className="p-2.5 sm:p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Sent: {item.quantity} units
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Received</Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={ri?.receivedQuantity ?? item.quantity}
                                onChange={(e) => {
                                  const newItems = [...receiveItems];
                                  newItems[index] = { ...newItems[index], receivedQuantity: parseInt(e.target.value) || 0 };
                                  setReceiveItems(newItems);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Damaged</Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={ri?.damagedQuantity ?? 0}
                                onChange={(e) => {
                                  const newItems = [...receiveItems];
                                  newItems[index] = { ...newItems[index], damagedQuantity: parseInt(e.target.value) || 0 };
                                  setReceiveItems(newItems);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                    <Input
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      placeholder="e.g., 1 item arrived damaged"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Total Value */}
              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="text-sm font-medium">Total Value</span>
                <span className="text-base font-bold">{formatCurrency(viewTransfer.totalValue || 0)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-end">
                {/* Receive mode actions */}
                {isReceiveMode && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsReceiveMode(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleReceive} disabled={isReceiving} className="gap-1.5 bg-green-600 hover:bg-green-700">
                      {isReceiving ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                      ) : (
                        <><PackageCheck className="h-3.5 w-3.5" /> Confirm Receipt</>
                      )}
                    </Button>
                  </>
                )}

                {/* Normal mode actions */}
                {!isReceiveMode && (
                  <>
                    {viewTransfer.status === 'pending_approval' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) handleAction(viewTransfer._id, 'reject', reason);
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleAction(viewTransfer._id, 'approve')}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Approve
                        </Button>
                      </>
                    )}
                    {viewTransfer.status === 'approved' && (
                      <Button size="sm" onClick={() => handleAction(viewTransfer._id, 'ship')}>
                        <Truck className="h-3.5 w-3.5 mr-1.5" />
                        Mark as Shipped
                      </Button>
                    )}
                    {(viewTransfer.status === 'in_transit' || viewTransfer.status === 'partially_received') && (
                      <Button size="sm" onClick={() => startReceive(viewTransfer)} className="gap-1.5 bg-green-600 hover:bg-green-700">
                        <PackageCheck className="h-3.5 w-3.5" />
                        Receive Transfer
                      </Button>
                    )}
                    {['pending_approval', 'approved'].includes(viewTransfer.status) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Enter cancellation reason:');
                          if (reason) handleAction(viewTransfer._id, 'cancel', reason);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
