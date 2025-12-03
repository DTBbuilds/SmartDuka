'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@smartduka/ui';
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Package,
  ArrowRight,
  Plus,
  Trash2,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';

type Branch = {
  _id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'suspended';
};

type Product = {
  _id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

type StockTransfer = {
  _id: string;
  fromBranch: string;
  fromBranchName: string;
  toBranch: string;
  toBranchName: string;
  product: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
};

export function BranchStockSharing() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [fromBranch, setFromBranch] = useState<string>('');
  const [toBranch, setToBranch] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [token]);

  const loadInitialData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };

      const [branchesRes, productsRes, transfersRes] = await Promise.all([
        fetch(`${base}/branches`, { headers }),
        fetch(`${base}/inventory/products?limit=200`, { headers }),
        fetch(`${base}/inventory/stock-transfers`, { headers }),
      ]);

      if (branchesRes.ok) {
        const data = await branchesRes.json();
        const branchList = Array.isArray(data) ? data : data.data || [];
        setBranches(branchList);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        const productList = Array.isArray(data) ? data : data.data || [];
        setProducts(productList);
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        const transferList = Array.isArray(data) ? data : data.data || [];
        setTransfers(transferList);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      toast({ type: 'error', title: 'Error', message: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromBranch || !toBranch || !selectedProduct || quantity <= 0) {
      toast({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
      return;
    }

    if (fromBranch === toBranch) {
      toast({ type: 'error', title: 'Error', message: 'Source and destination branches must be different' });
      return;
    }

    try {
      setSubmitting(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/inventory/stock-transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromBranch,
          toBranch,
          product: selectedProduct,
          quantity,
        }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Stock transfer created successfully' });
        setFromBranch('');
        setToBranch('');
        setSelectedProduct('');
        setQuantity(1);
        loadInitialData();
      } else {
        const error = await res.json();
        toast({ type: 'error', title: 'Error', message: error.message || 'Failed to create transfer' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/inventory/stock-transfers/${transferId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Transfer approved' });
        loadInitialData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Failed to approve transfer' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/inventory/stock-transfers/${transferId}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Transfer rejected' });
        loadInitialData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Failed to reject transfer' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'approved':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'completed':
        return '✓';
      case 'rejected':
        return '❌';
      default:
        return '❓';
    }
  };

  const selectedProductData = products.find(p => p._id === selectedProduct);
  const fromBranchData = branches.find(b => b._id === fromBranch);
  const fromBranchStock = fromBranchData ? selectedProductData?.stock || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Stock Sharing Between Branches
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Transfer inventory between branches to optimize stock levels</p>
      </div>

      {/* Create Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Stock Transfer</CardTitle>
          <CardDescription>Send inventory from one branch to another</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Branch */}
              <div>
                <label className="text-sm font-medium mb-2 block">From Branch</label>
                <select
                  value={fromBranch}
                  onChange={(e) => setFromBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={submitting}
                >
                  <option value="">Select source branch...</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} • {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Branch */}
              <div>
                <label className="text-sm font-medium mb-2 block">To Branch</label>
                <select
                  value={toBranch}
                  onChange={(e) => setToBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={submitting}
                >
                  <option value="">Select destination branch...</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id} disabled={branch._id === fromBranch}>
                      {branch.name} • {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="text-sm font-medium mb-2 block">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={submitting}
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} (SKU: {product.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={fromBranchStock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                    disabled={submitting}
                  />
                  <span className="flex items-center text-sm text-muted-foreground">
                    / {fromBranchStock} available
                  </span>
                </div>
              </div>
            </div>

            {/* Available Stock Warning */}
            {fromBranchStock > 0 && quantity > fromBranchStock && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">Insufficient stock. Only {fromBranchStock} units available.</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !fromBranch || !toBranch || !selectedProduct || quantity > fromBranchStock}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Transfer...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Transfers</CardTitle>
              <CardDescription>All stock transfers between branches</CardDescription>
            </div>
            <Badge variant="secondary">{transfers.length} transfers</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No stock transfers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => (
                <div
                  key={transfer._id}
                  className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  {/* Transfer Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{transfer.productName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{transfer.fromBranchName}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{transfer.toBranchName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{transfer.quantity} units</p>
                      <Badge className={getStatusColor(transfer.status)}>
                        {getStatusIcon(transfer.status)} {transfer.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3 pb-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                    </div>
                    {transfer.approvedAt && (
                      <div>
                        <p className="text-muted-foreground">Approved</p>
                        <p className="font-medium">{new Date(transfer.approvedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {transfer.completedAt && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium">{new Date(transfer.completedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {transfer.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveTransfer(transfer._id)}
                        className="flex-1 text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectTransfer(transfer._id)}
                        className="flex-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Optimization Tips */}
      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Transfer slow-moving items from high-stock branches to branches with demand</p>
          <p>• Balance inventory levels across branches to reduce holding costs</p>
          <p>• Use transfers to address low-stock alerts before they become out-of-stock</p>
          <p>• Monitor transfer history to identify patterns and optimize stock distribution</p>
        </CardContent>
      </Card>
    </div>
  );
}
