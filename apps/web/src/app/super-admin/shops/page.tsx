'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Button, Input } from '@smartduka/ui';
import { Search, Eye, CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
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
};

export default function ShopsManagement() {
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadShops();
  }, [token, activeTab]);

  const loadShops = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = `/super-admin/shops/${activeTab}`;
      const res = await fetch(`${base}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/verify`, {
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/reject`, {
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/suspend`, {
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/reactivate`, {
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

      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Shops Management</h1>
            <p className="text-muted-foreground mt-2">Manage and verify shops</p>
          </div>
          <button
            onClick={loadShops}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
          </TabsList>

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
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
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
  getStatusIcon: (status: string) => React.ReactNode;
}

function ShopCard({
  shop,
  onVerify,
  onReject,
  onSuspend,
  onReactivate,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {onVerify && (
            <button
              onClick={onVerify}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Verify
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Reject
            </button>
          )}
          {onSuspend && (
            <button
              onClick={onSuspend}
              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
            >
              Suspend
            </button>
          )}
          {onReactivate && (
            <button
              onClick={onReactivate}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Reactivate
            </button>
          )}
          <button
            onClick={() => window.location.href = `/super-admin/shops/${shop._id}`}
            className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
