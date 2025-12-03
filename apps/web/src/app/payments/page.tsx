"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { config } from "@/lib/config";
import {
  Button,
  Card,
  CardContent,
  Input,
} from "@smartduka/ui";
import {
  CreditCard,
  Filter,
  Search,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Smartphone,
  Banknote,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Payment {
  _id: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  paymentMethod: "mpesa" | "cash" | "card" | "other";
  status: "pending" | "completed" | "failed";
  mpesaReceiptNumber?: string;
  mpesaTransactionId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  amountTendered?: number;
  change?: number;
  referenceNumber?: string;
  createdAt: string;
  completedAt?: string;
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

export default function PaymentsPage() {
  const { token, user } = useAuth();
  const { currentBranch } = useBranch();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("today");

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to access payment management
          </p>
        </div>
      </div>
    );
  }

  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let from: Date | undefined;
    let to: Date | undefined = new Date();
    
    switch (dateFilter) {
      case "today":
        from = today;
        break;
      case "week":
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        break;
      case "month":
        from = new Date(today);
        from.setMonth(from.getMonth() - 1);
        break;
      default:
        from = undefined;
        to = undefined;
    }
    
    return { from, to };
  }, [dateFilter]);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const base = config.apiUrl;
      
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (methodFilter !== "all") params.append("method", methodFilter);
      if (currentBranch) params.append("branchId", currentBranch._id);
      
      const { from, to } = getDateRange();
      if (from) params.append("from", from.toISOString());
      if (to) params.append("to", to.toISOString());
      
      params.append("limit", "200");
      
      const url = `${base}/payments/transactions?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, methodFilter, currentBranch, getDateRange]);

  const fetchStats = useCallback(async () => {
    try {
      const base = config.apiUrl;
      
      const params = new URLSearchParams();
      const { from, to } = getDateRange();
      if (from) params.append("from", from.toISOString());
      if (to) params.append("to", to.toISOString());
      if (currentBranch) params.append("branchId", currentBranch._id);
      
      const url = `${base}/payments/stats?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [token, currentBranch, getDateRange]);

  useEffect(() => {
    if (token) {
      fetchPayments();
      fetchStats();
    }
  }, [token, currentBranch, fetchPayments, fetchStats]);

  const handleExport = async () => {
    try {
      const base = config.apiUrl;
      const params = new URLSearchParams();
      const { from, to } = getDateRange();
      if (from) params.append("from", from.toISOString());
      if (to) params.append("to", to.toISOString());
      if (currentBranch) params.append("branchId", currentBranch._id);
      
      const res = await fetch(`${base}/payments/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "mpesa":
        return <Smartphone className="h-3 w-3" />;
      case "cash":
        return <Banknote className="h-3 w-3" />;
      case "card":
        return <CreditCard className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      mpesa: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      cash: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      card: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return colors[method] || colors.other;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    };
    return colors[status] || colors.pending;
  };

  // Filter payments by search
  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.orderNumber?.toLowerCase().includes(query) ||
      payment.customerName?.toLowerCase().includes(query) ||
      payment.cashierName?.toLowerCase().includes(query) ||
      payment.mpesaReceiptNumber?.toLowerCase().includes(query)
    );
  });

  const columns: Column<Payment>[] = [
    {
      key: "createdAt",
      header: "Date & Time",
      render: (payment) => (
        <div className="text-sm">
          <div>{new Date(payment.createdAt).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(payment.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "orderNumber",
      header: "Order #",
      render: (payment) => (
        <span className="font-mono text-primary">{payment.orderNumber || "—"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment) => (
        <div className="text-right font-semibold">{formatCurrency(payment.amount)}</div>
      ),
      sortable: true,
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (payment) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium uppercase ${getMethodColor(payment.paymentMethod)}`}>
          {getMethodIcon(payment.paymentMethod)}
          {payment.paymentMethod}
        </span>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(payment.status)}`}>
          {getStatusIcon(payment.status)}
          {payment.status}
        </span>
      ),
      sortable: true,
    },
    {
      key: "mpesaReceiptNumber",
      header: "Reference",
      render: (payment) => (
        <span className="font-mono text-xs">
          {payment.mpesaReceiptNumber || payment.referenceNumber || "—"}
        </span>
      ),
    },
    {
      key: "cashierName",
      header: "Cashier",
      render: (payment) => payment.cashierName || "—",
    },
    {
      key: "customerName",
      header: "Customer",
      render: (payment) => payment.customerName || "Walk-in",
    },
  ];

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage all payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchPayments(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">{stats.completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">M-Pesa</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.byMethod.mpesa.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.byMethod.cash.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Transaction</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.averageTransaction)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order, customer, receipt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Method Filter */}
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Methods</option>
                <option value="mpesa">M-Pesa</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description={searchQuery || statusFilter !== "all" || methodFilter !== "all"
            ? "Try adjusting your filters"
            : "Payment transactions will appear here once customers make purchases"
          }
          actionLabel={undefined}
          onAction={undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              data={filteredPayments}
              columns={columns}
              searchable={false}
              emptyMessage="No payments found"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
