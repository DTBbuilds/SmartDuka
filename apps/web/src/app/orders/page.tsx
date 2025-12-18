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
  Receipt,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentRecord {
  method: string;
  amount: number;
  reference?: string;
  status?: string;
  mpesaReceiptNumber?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "completed" | "void";
  paymentStatus: "unpaid" | "partial" | "paid";
  payments: PaymentRecord[];
  customerName?: string;
  cashierName?: string;
  notes?: string;
  transactionType?: "sale" | "void" | "return" | "refund";
  discountAmount?: number;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  voidOrders: number;
  averageOrderValue: number;
}

export default function OrdersPage() {
  const { token, user } = useAuth();
  const { currentBranch } = useBranch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to access order management
          </p>
        </div>
      </div>
    );
  }

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const base = config.apiUrl;
      const branchParam = currentBranch ? `&branchId=${currentBranch._id}` : '';
      
      let url = `${base}/sales/orders?limit=200${branchParam}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const ordersData = Array.isArray(data) ? data : [];
        setOrders(ordersData);
        
        // Calculate stats
        const completed = ordersData.filter((o: Order) => o.status === "completed");
        const pending = ordersData.filter((o: Order) => o.status === "pending");
        const voided = ordersData.filter((o: Order) => o.status === "void");
        const totalRevenue = completed.reduce((sum: number, o: Order) => sum + o.total, 0);
        
        setStats({
          totalOrders: ordersData.length,
          totalRevenue,
          completedOrders: completed.length,
          pendingOrders: pending.length,
          voidOrders: voided.length,
          averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentBranch]);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token, currentBranch, fetchOrders]);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter((order) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.cashierName?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Payment filter
    if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "all") {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (orderDate < today || orderDate >= tomorrow) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (orderDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (orderDate < monthAgo) return false;
      }
    }

    return true;
  });

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      void: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    };
    const icons = {
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
      void: <XCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      partial: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      unpaid: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.unpaid}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (order) => (
        <div className="font-mono font-medium text-primary">{order.orderNumber}</div>
      ),
      sortable: true,
    },
    {
      key: "createdAt",
      header: "Date & Time",
      render: (order) => (
        <div className="text-sm">
          <div>{new Date(order.createdAt).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(order.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "customerName",
      header: "Customer",
      render: (order) => order.customerName || "Walk-in",
    },
    {
      key: "total",
      header: "Total",
      render: (order) => (
        <div className="font-semibold text-right">{formatCurrency(order.total)}</div>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (order) => getStatusBadge(order.status),
      sortable: true,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (order) => getPaymentStatusBadge(order.paymentStatus),
      sortable: true,
    },
    {
      key: "cashierName",
      header: "Cashier",
      render: (order) => order.cashierName || "—",
    },
    {
      key: "items",
      header: "Items",
      render: (order) => (
        <div className="text-sm">
          <div>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
          <div className="text-xs text-muted-foreground">
            {order.items.slice(0, 2).map(i => i.name).join(", ")}
            {order.items.length > 2 && "..."}
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <TableSkeleton />
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, paymentFilter, dateFilter]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            View and manage all sales orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} className="flex-shrink-0">
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compact on mobile */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5 md:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
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
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
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
                  <p className="text-sm text-muted-foreground">Avg. Order</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters - Stacked on mobile */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-4">
            {/* Search */}
            <div className="flex-1 min-w-0 md:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            {/* Filters row */}
            <div className="flex gap-2 overflow-x-auto">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-shrink-0"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-shrink-0"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="void">Void</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-shrink-0"
              >
                <option value="all">Payment</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders found"
          description={searchQuery || statusFilter !== "all" || paymentFilter !== "all"
            ? "Try adjusting your filters"
            : "Orders will appear here once customers make purchases"
          }
          actionLabel={undefined}
          onAction={undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              data={paginatedOrders}
              columns={columns}
              searchable={false}
              emptyMessage="No orders found"
            />
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of{' '}
                  {filteredOrders.length} orders
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Prev</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
