'use client';

import { config } from '@/lib/config';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Button, Input } from '@smartduka/ui';
import { Search, Eye, CheckCircle, XCircle, AlertCircle, Clock, RefreshCw, ArrowLeft, Store, Trash2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';

type Shop = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessType?: string;
  status: string;
  complianceScore: number;
  isFlagged: boolean;
  flagReason?: string;
  verificationDate?: string;
  suspensionDate?: string;
  createdAt: string;
  deletedAt?: string;
  deletionReason?: string;
};

export default function ShopsManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  
  // Get initial tab from URL or default to 'all'
  const statusFromUrl = searchParams.get('status');
  const [activeTab, setActiveTab] = useState(statusFromUrl || 'all');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Update tab when URL changes
  useEffect(() => {
    const status = searchParams.get('status');
    if (status && status !== activeTab) {
      setActiveTab(status);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'all') {
      router.push('/super-admin/shops');
    } else {
      router.push(`/super-admin/shops?status=${tab}`);
    }
  };

  useEffect(() => {
    loadShops();
  }, [token, activeTab]);

  const loadShops = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Use 'all' endpoint for all shops, 'shops-deleted' for deleted, otherwise use status-specific endpoint
      let endpoint = '/super-admin/shops';
      if (activeTab === 'deleted') {
        endpoint = '/super-admin/shops-deleted';
      } else if (activeTab !== 'all') {
        endpoint = `/super-admin/shops/${activeTab}`;
      }
      
      const res = await fetch(`${config.apiUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setShops(data.shops || []);
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not load shops' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (shopId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Verified by super admin' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop verified successfully' });
        loadShops();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not verify shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleReject = async (shopId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Rejected by super admin', notes: 'Does not meet requirements' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop rejected successfully' });
        loadShops();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not reject shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleSuspend = async (shopId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Suspended by super admin', notes: 'Policy violation' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop suspended successfully' });
        loadShops();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not suspend shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleReactivate = async (shopId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopId}/reactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Reactivated by super admin' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop reactivated successfully' });
        loadShops();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not reactivate shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const openDeleteDialog = (shop: Shop) => {
    setShopToDelete(shop);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !shopToDelete || !deleteReason.trim()) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: deleteReason }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop deleted successfully' });
        setDeleteDialogOpen(false);
        setShopToDelete(null);
        setDeleteReason('');
        loadShops();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ type: 'error', title: 'Failed', message: data.message || 'Could not delete shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (shopId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/shops/${shopId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Restored by super admin' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop restored successfully' });
        loadShops();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not restore shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'flagged':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <main className="bg-background min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-0">
            <button
              onClick={() => router.push('/super-admin')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                <Store className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                Shops Management
              </h1>
              <p className="text-xs md:text-base text-muted-foreground mt-1 md:mt-2">Manage and verify shops</p>
            </div>
            <button
              onClick={loadShops}
              disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm md:text-base flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by shop name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="all" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <Store className="h-4 w-4" />
              <span className="text-xs md:text-sm">All</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs md:text-sm">Pending</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs md:text-sm">Active</span>
            </TabsTrigger>
            <TabsTrigger value="suspended" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs md:text-sm">Suspended</span>
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-xs md:text-sm">Flagged</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5">
              <Trash2 className="h-4 w-4 text-slate-500" />
              <span className="text-xs md:text-sm">Deleted</span>
            </TabsTrigger>
          </TabsList>

          {/* All Shops */}
          <TabsContent value="all" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No shops found
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onVerify={shop.status === 'pending' ? () => handleVerify(shop._id) : undefined}
                  onReject={shop.status === 'pending' ? () => handleReject(shop._id) : undefined}
                  onSuspend={shop.status === 'active' ? () => handleSuspend(shop._id) : undefined}
                  onReactivate={shop.status === 'suspended' || shop.status === 'flagged' ? () => handleReactivate(shop._id) : undefined}
                  onDelete={!shop.deletedAt ? () => openDeleteDialog(shop) : undefined}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>

          {/* Pending Shops */}
          <TabsContent value="pending" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No pending shops
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onVerify={() => handleVerify(shop._id)}
                  onReject={() => handleReject(shop._id)}
                  onDelete={() => openDeleteDialog(shop)}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>

          {/* Active Shops */}
          <TabsContent value="active" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active shops
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onSuspend={() => handleSuspend(shop._id)}
                  onDelete={() => openDeleteDialog(shop)}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>

          {/* Suspended Shops */}
          <TabsContent value="suspended" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No suspended shops
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onReactivate={() => handleReactivate(shop._id)}
                  onDelete={() => openDeleteDialog(shop)}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>

          {/* Flagged Shops */}
          <TabsContent value="flagged" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No flagged shops
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onReactivate={() => handleReactivate(shop._id)}
                  onDelete={() => openDeleteDialog(shop)}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>

          {/* Deleted Shops */}
          <TabsContent value="deleted" className="space-y-4">
            {filteredShops.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No deleted shops
                </CardContent>
              </Card>
            ) : (
              filteredShops.map((shop) => (
                <ShopCard
                  key={shop._id}
                  shop={shop}
                  onRestore={() => handleRestore(shop._id)}
                  getStatusIcon={getStatusIcon}
                  isDeleted
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Shop
              </DialogTitle>
              <DialogDescription>
                This will soft delete the shop and all its data. The shop can be restored later if needed.
              </DialogDescription>
            </DialogHeader>
            {shopToDelete && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{shopToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">{shopToDelete.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason for deletion <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter the reason for deleting this shop..."
                    className="w-full p-3 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteReason.trim() || deleteLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Shop
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

interface ShopCardProps {
  shop: Shop;
  onVerify?: () => void;
  onReject?: () => void;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isDeleted?: boolean;
  getStatusIcon: (status: string) => React.ReactNode;
}

function ShopCard({
  shop,
  onVerify,
  onReject,
  onSuspend,
  onReactivate,
  onDelete,
  onRestore,
  isDeleted,
  getStatusIcon,
}: ShopCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(shop.status)}
              {shop.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {shop.email} • {shop.phone}
            </CardDescription>
          </div>
          <Badge variant={shop.status === 'active' ? 'default' : 'secondary'}>
            {shop.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Business Type</p>
            <p className="font-medium">{shop.businessType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Compliance Score</p>
            <p className="font-medium">{shop.complianceScore}/100</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="font-medium">{new Date(shop.createdAt).toLocaleDateString()}</p>
          </div>
          {shop.isFlagged && (
            <div>
              <p className="text-xs text-muted-foreground">Flag Reason</p>
              <p className="font-medium text-orange-600">{shop.flagReason || 'Flagged'}</p>
            </div>
          )}
          {isDeleted && shop.deletedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Deleted On</p>
              <p className="font-medium text-red-600">{new Date(shop.deletedAt).toLocaleDateString()}</p>
            </div>
          )}
          {isDeleted && shop.deletionReason && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Deletion Reason</p>
              <p className="font-medium text-red-600">{shop.deletionReason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {onVerify && (
            <button
              onClick={onVerify}
              className="px-2 md:px-3 py-1 bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-700"
            >
              Verify
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-2 md:px-3 py-1 bg-red-600 text-white text-xs md:text-sm rounded hover:bg-red-700"
            >
              Reject
            </button>
          )}
          {onSuspend && (
            <button
              onClick={onSuspend}
              className="px-2 md:px-3 py-1 bg-orange-600 text-white text-xs md:text-sm rounded hover:bg-orange-700"
            >
              Suspend
            </button>
          )}
          {onReactivate && (
            <button
              onClick={onReactivate}
              className="px-2 md:px-3 py-1 bg-blue-600 text-white text-xs md:text-sm rounded hover:bg-blue-700"
            >
              Reactivate
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              className="px-2 md:px-3 py-1 bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Restore
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-2 md:px-3 py-1 bg-red-600 text-white text-xs md:text-sm rounded hover:bg-red-700 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
          <button
            onClick={() => window.location.href = `/super-admin/shops/${shop._id}`}
            className="px-2 md:px-3 py-1 bg-slate-600 text-white text-xs md:text-sm rounded hover:bg-slate-700 flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
