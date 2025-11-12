'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@smartduka/ui';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, Flag, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';

type ShopDetails = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  businessType?: string;
  kraPin?: string;
  status: string;
  complianceScore: number;
  chargebackRate: number;
  refundRate: number;
  violationCount: number;
  cashierCount: number;
  totalSales: number;
  totalOrders: number;
  isFlagged: boolean;
  flagReason?: string;
  isMonitored: boolean;
  verificationDate?: string;
  suspensionDate?: string;
  createdAt: string;
  updatedAt: string;
};

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const shopId = params.id as string;

  useEffect(() => {
    if (token && shopId) {
      loadShopDetails();
    }
  }, [token, shopId]);

  const loadShopDetails = async () => {
    if (!token || !shopId) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setShop(data);
      } else if (res.status === 404) {
        toast({ type: 'error', title: 'Not Found', message: 'Shop not found' });
        router.push('/super-admin/shops');
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not load shop details' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!token || !shopId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Suspended by super admin', notes: 'Manual suspension' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop suspended successfully' });
        loadShopDetails();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not suspend shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleReactivate = async () => {
    if (!token || !shopId) return;
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
        loadShopDetails();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not reactivate shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleFlag = async () => {
    if (!token || !shopId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/flag`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Flagged for review', notes: 'Manual flag' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop flagged successfully' });
        loadShopDetails();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not flag shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleUnflag = async () => {
    if (!token || !shopId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/super-admin/shops/${shopId}/unflag`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Unflagged by super admin' }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Shop unflagged successfully' });
        loadShopDetails();
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not unflag shop' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading shop details...</div>
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Shop not found</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/super-admin/shops')}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <p className="text-muted-foreground">{shop.email} • {shop.phone}</p>
          </div>
          <Badge variant={shop.status === 'active' ? 'default' : 'secondary'}>
            {shop.status}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Shop Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Shop Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{shop.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{shop.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{shop.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{shop.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Type</p>
                    <p className="font-medium">{shop.businessType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">KRA PIN</p>
                    <p className="font-medium">{shop.kraPin || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Score</p>
                    <p className="text-2xl font-bold">{shop.complianceScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chargeback Rate</p>
                    <p className="text-2xl font-bold">{shop.chargebackRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Rate</p>
                    <p className="text-2xl font-bold">{shop.refundRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Violations</p>
                    <p className="text-2xl font-bold">{shop.violationCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cashiers</p>
                    <p className="text-2xl font-bold">{shop.cashierCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{shop.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Info */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="text-2xl font-bold">KES {shop.totalSales.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{shop.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={shop.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                    {shop.status}
                  </Badge>
                </div>
                {shop.isFlagged && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">🚩 Flagged for Review</p>
                    <p className="text-xs text-orange-700 mt-1">{shop.flagReason || 'No reason provided'}</p>
                  </div>
                )}
                {shop.isMonitored && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">👁️ Under Monitoring</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{new Date(shop.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-sm font-medium">{new Date(shop.updatedAt).toLocaleString()}</p>
                </div>
                {shop.verificationDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Verified</p>
                    <p className="text-sm font-medium">{new Date(shop.verificationDate).toLocaleString()}</p>
                  </div>
                )}
                {shop.suspensionDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Suspended</p>
                    <p className="text-sm font-medium">{new Date(shop.suspensionDate).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shop.status === 'active' && (
                  <>
                    <button
                      onClick={handleSuspend}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm font-medium"
                    >
                      Suspend Shop
                    </button>
                    {!shop.isFlagged && (
                      <button
                        onClick={handleFlag}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Flag className="h-4 w-4" />
                        Flag for Review
                      </button>
                    )}
                  </>
                )}
                {shop.status === 'suspended' && (
                  <button
                    onClick={handleReactivate}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    Reactivate Shop
                  </button>
                )}
                {shop.isFlagged && (
                  <button
                    onClick={handleUnflag}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm font-medium"
                  >
                    Unflag Shop
                  </button>
                )}
                <button
                  onClick={() => router.push('/super-admin/shops')}
                  className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded hover:bg-slate-300 text-sm font-medium"
                >
                  Back to Shops
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
