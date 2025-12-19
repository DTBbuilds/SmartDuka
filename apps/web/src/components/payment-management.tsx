'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { CreditCard, DollarSign, TrendingUp, Filter, Download, Eye, MoreVertical, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentTransaction {
  _id: string;
  orderNumber: string;
  cashierName: string;
  cashierId: string;
  paymentMethod: 'cash' | 'card' | 'mpesa' | 'other';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  customerName?: string;
  notes?: string;
}

interface PaymentStats {
  totalTransactions: number;
  totalAmount: number;
  averageTransaction: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  byMethod: {
    cash: { count: number; amount: number };
    card: { count: number; amount: number };
    mpesa: { count: number; amount: number };
    other: { count: number; amount: number };
  };
}

export function PaymentManagement() {
  const { token, shop } = useAuth();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterMethod !== 'all') params.append('method', filterMethod);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await fetch(`${apiUrl}/payments/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch transactions');

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
      toast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, token, filterMethod, filterStatus, dateFrom, dateTo, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/payments/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch stats');

      const statsText = await res.text();
      const data = statsText ? JSON.parse(statsText) : {};
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    if (token) {
      fetchTransactions();
      fetchStats();
    }
  }, [token, fetchTransactions, fetchStats]);

  const handleExport = async () => {
    try {
      const res = await fetch(`${apiUrl}/payments/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ type: 'success', title: 'Success', message: 'Payments exported successfully' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'mpesa':
        return '📱';
      default:
        return '💰';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'mpesa':
        return 'M-Pesa';
      default:
        return 'Other';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">✓ Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">✗ Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Track and manage all payment transactions made by cashiers</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          {/* Total Amount */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ksh {stats.totalAmount.toLocaleString('en-KE')}</div>
              <p className="text-xs text-muted-foreground mt-1">Revenue</p>
            </CardContent>
          </Card>

          {/* Average Transaction */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ksh {stats.averageTransaction.toLocaleString('en-KE')}</div>
              <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
            </CardContent>
          </Card>

          {/* Completed Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Success rate: {stats.totalTransactions > 0 ? ((stats.completedCount / stats.totalTransactions) * 100).toFixed(1) : 0}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Order, cashier, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={filterMethod} onValueChange={setFilterMethod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                      <SelectItem value="card">💳 Card</SelectItem>
                      <SelectItem value="mpesa">📱 M-Pesa</SelectItem>
                      <SelectItem value="other">💰 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">✓ Completed</SelectItem>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="failed">✗ Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export */}
                <div className="flex items-end">
                  <Button onClick={handleExport} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transactions ({filteredTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Payment Method Icon */}
                        <div className="text-2xl">
                          {getPaymentMethodIcon(transaction.paymentMethod)}
                        </div>

                        {/* Transaction Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{transaction.orderNumber}</p>
                            {getStatusBadge(transaction.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.cashierName} • {getPaymentMethodLabel(transaction.paymentMethod)}
                          </p>
                          {transaction.customerName && (
                            <p className="text-xs text-muted-foreground">Customer: {transaction.customerName}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString('en-KE')}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          Ksh {transaction.amount.toLocaleString('en-KE')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">💵</span>
                    Cash
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="font-semibold">{stats.byMethod.cash.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold">Ksh {stats.byMethod.cash.amount.toLocaleString('en-KE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-semibold">
                      {stats.totalAmount > 0 ? ((stats.byMethod.cash.amount / stats.totalAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">💳</span>
                    Card
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="font-semibold">{stats.byMethod.card.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold">Ksh {stats.byMethod.card.amount.toLocaleString('en-KE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-semibold">
                      {stats.totalAmount > 0 ? ((stats.byMethod.card.amount / stats.totalAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* M-Pesa */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">📱</span>
                    M-Pesa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="font-semibold">{stats.byMethod.mpesa.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold">Ksh {stats.byMethod.mpesa.amount.toLocaleString('en-KE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-semibold">
                      {stats.totalAmount > 0 ? ((stats.byMethod.mpesa.amount / stats.totalAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Other */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    Other
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="font-semibold">{stats.byMethod.other.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold">Ksh {stats.byMethod.other.amount.toLocaleString('en-KE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-semibold">
                      {stats.totalAmount > 0 ? ((stats.byMethod.other.amount / stats.totalAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
