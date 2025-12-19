'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { CashierStatusBadge } from '@/components/cashier-status-badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  Settings, 
  Shield, 
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  Key,
  RefreshCw
} from 'lucide-react';

interface Transaction {
  _id: string;
  action: string;
  details: {
    amount?: number;
    items?: number;
    paymentMethod?: string;
  };
  timestamp: string;
}

interface CashierPermissions {
  canVoid?: boolean;
  canRefund?: boolean;
  canDiscount?: boolean;
  maxDiscountAmount?: number;
  maxRefundAmount?: number;
  voidRequiresApproval?: boolean;
  refundRequiresApproval?: boolean;
  discountRequiresApproval?: boolean;
}

interface CashierDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  cashierId?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  branchId?: { _id: string; name: string; code: string } | string;
  permissions?: CashierPermissions;
  todaySales: number;
  transactionCount: number;
  averageTransaction: number;
  recentTransactions: Transaction[];
  onlineStatus: 'online' | 'idle' | 'offline';
  lastActivity: string;
}

function CashierDetailContent() {
  const router = useRouter();
  const params = useParams();
  const cashierId = params.id as string;
  const { token, shop } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [cashier, setCashier] = useState<CashierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'activity'>('overview');

  useEffect(() => {
    loadCashierDetail();
  }, [token, cashierId]);

  const loadCashierDetail = async () => {
    if (!token || !cashierId) return;

    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };

      // Get cashier details
      const detailsRes = await fetch(`${base}/users/${cashierId}/details`, { headers });
      
      // Get transactions
      const transRes = await fetch(`${base}/activity/cashier/${cashierId}/transactions?limit=50`, {
        headers,
      });

      let cashierData: any = {};
      if (detailsRes.ok) {
        cashierData = await detailsRes.json();
      }

      const transactions = transRes.ok ? await transRes.json() : [];

      // Calculate stats
      let totalSales = 0;
      transactions.forEach((t: Transaction) => {
        if (t.details?.amount) totalSales += t.details.amount;
      });

      const lastActivity = transactions.length > 0 ? transactions[0].timestamp : new Date().toISOString();
      const now = new Date();
      const lastActivityDate = new Date(lastActivity);
      const diffMinutes = Math.floor((now.getTime() - lastActivityDate.getTime()) / 60000);

      let onlineStatus: 'online' | 'idle' | 'offline' = 'offline';
      if (diffMinutes < 5) onlineStatus = 'online';
      else if (diffMinutes < 15) onlineStatus = 'idle';

      setCashier({
        _id: cashierData._id || cashierId,
        name: cashierData.name || 'Unknown Cashier',
        email: cashierData.email || '',
        phone: cashierData.phone,
        cashierId: cashierData.cashierId,
        status: cashierData.status || 'active',
        createdAt: cashierData.createdAt || new Date().toISOString(),
        branchId: cashierData.branchId,
        permissions: cashierData.permissions || {},
        todaySales: totalSales,
        transactionCount: transactions.length,
        averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0,
        recentTransactions: transactions,
        onlineStatus,
        lastActivity,
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (key: keyof CashierPermissions, value: boolean | number) => {
    if (!cashier) return;
    
    setSavingPermissions(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/users/${cashierId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (res.ok) {
        setCashier({
          ...cashier,
          permissions: { ...cashier.permissions, [key]: value },
        });
        toast({ type: 'success', title: 'Permission updated' });
      } else {
        throw new Error('Failed to update permission');
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Update failed', message: err?.message });
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPin = async () => {
    if (!confirm('Are you sure you want to reset this cashier\'s PIN?')) return;
    
    setResettingPin(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/users/${cashierId}/reset-pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const pinText = await res.text();
      const data = pinText ? JSON.parse(pinText) : {};
      
      if (res.ok) {
        setNewPin(data.pin);
        toast({ type: 'success', title: 'PIN Reset', message: 'New PIN generated successfully' });
      } else {
        throw new Error('Failed to reset PIN');
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Reset failed', message: err?.message });
    } finally {
      setResettingPin(false);
    }
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <main className="bg-background py-6 min-h-screen">
        <div className="container">
          <div className="text-center py-12 text-muted-foreground">Loading cashier details...</div>
        </div>
      </main>
    );
  }

  if (!cashier) {
    return (
      <main className="bg-background py-6 min-h-screen">
        <div className="container">
          <div className="text-center py-12 text-muted-foreground">Cashier not found</div>
        </div>
      </main>
    );
  }

  const getBranchName = () => {
    if (!cashier?.branchId) return 'Not assigned';
    if (typeof cashier.branchId === 'object') return cashier.branchId.name;
    return 'Branch';
  };

  return (
    <main className="bg-background py-6 min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cashiers
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{cashier.name}</h1>
                {cashier.cashierId && (
                  <Badge variant="outline" className="text-sm">{cashier.cashierId}</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">{cashier.email}</p>
              {cashier.phone && (
                <p className="text-muted-foreground text-sm">{cashier.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={cashier.status === 'active' ? 'default' : 'secondary'}>
                {cashier.status}
              </Badge>
              <CashierStatusBadge
                status={cashier.onlineStatus}
                lastActivity={new Date(cashier.lastActivity)}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {(['overview', 'permissions', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Today's Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(cashier.todaySales)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cashier.transactionCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Average Sale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(cashier.averageTransaction)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    Branch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{getBranchName()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Cashier Info & PIN Reset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cashier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cashier.email}</span>
                  </div>
                  {cashier.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{cashier.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Created: {new Date(cashier.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    PIN Management
                  </CardTitle>
                  <CardDescription>Reset cashier's login PIN</CardDescription>
                </CardHeader>
                <CardContent>
                  {newPin ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-400 mb-2">New PIN generated:</p>
                      <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-300 tracking-widest">
                        {newPin}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                        Please share this PIN with the cashier securely
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => setNewPin(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleResetPin}
                      disabled={resettingPin}
                      variant="outline"
                      className="gap-2"
                    >
                      {resettingPin ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                      Reset PIN
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Cashier Permissions
              </CardTitle>
              <CardDescription>
                Configure what actions this cashier can perform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transaction Permissions */}
              <div>
                <h3 className="font-semibold mb-4">Transaction Permissions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Can Void Transactions</Label>
                      <p className="text-sm text-muted-foreground">Allow voiding completed sales</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.canVoid || false}
                      onCheckedChange={(checked) => handlePermissionChange('canVoid', checked)}
                      disabled={savingPermissions}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Can Process Refunds</Label>
                      <p className="text-sm text-muted-foreground">Allow processing customer refunds</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.canRefund || false}
                      onCheckedChange={(checked) => handlePermissionChange('canRefund', checked)}
                      disabled={savingPermissions}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Can Apply Discounts</Label>
                      <p className="text-sm text-muted-foreground">Allow applying discounts to sales</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.canDiscount || false}
                      onCheckedChange={(checked) => handlePermissionChange('canDiscount', checked)}
                      disabled={savingPermissions}
                    />
                  </div>
                </div>
              </div>

              {/* Approval Requirements */}
              <div>
                <h3 className="font-semibold mb-4">Approval Requirements</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Void Requires Approval</Label>
                      <p className="text-sm text-muted-foreground">Require manager approval for voids</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.voidRequiresApproval || false}
                      onCheckedChange={(checked) => handlePermissionChange('voidRequiresApproval', checked)}
                      disabled={savingPermissions}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Refund Requires Approval</Label>
                      <p className="text-sm text-muted-foreground">Require manager approval for refunds</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.refundRequiresApproval || false}
                      onCheckedChange={(checked) => handlePermissionChange('refundRequiresApproval', checked)}
                      disabled={savingPermissions}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Discount Requires Approval</Label>
                      <p className="text-sm text-muted-foreground">Require manager approval for discounts</p>
                    </div>
                    <Switch
                      checked={cashier.permissions?.discountRequiresApproval || false}
                      onCheckedChange={(checked) => handlePermissionChange('discountRequiresApproval', checked)}
                      disabled={savingPermissions}
                    />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div>
                <h3 className="font-semibold mb-4">Transaction Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Discount Amount (KES)</Label>
                    <Input
                      type="number"
                      value={cashier.permissions?.maxDiscountAmount || ''}
                      onChange={(e) => handlePermissionChange('maxDiscountAmount', parseInt(e.target.value) || 0)}
                      placeholder="No limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Refund Amount (KES)</Label>
                    <Input
                      type="number"
                      value={cashier.permissions?.maxRefundAmount || ''}
                      onChange={(e) => handlePermissionChange('maxRefundAmount', parseInt(e.target.value) || 0)}
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Last 50 transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {cashier.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {cashier.recentTransactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {transaction.details?.items || 0} items
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {transaction.details?.paymentMethod || 'Unknown'} • {formatTime(transaction.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {formatCurrency(transaction.details?.amount || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function CashierDetailPage() {
  return (
    <AuthGuard requiredRole="admin">
      <CashierDetailContent />
    </AuthGuard>
  );
}
