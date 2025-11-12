"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@smartduka/ui";
import { CreditCard, Filter } from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Payment {
  _id: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  method: "mpesa" | "cash" | "card";
  status: "pending" | "completed" | "failed";
  mpesaRef?: string;
  phoneNumber?: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

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

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const fetchPayments = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // Note: This endpoint needs to be created in backend
      let url = `${apiUrl}/payments`;
      
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (methodFilter !== "all") params.append("method", methodFilter);
      
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      // For now, show empty state if endpoint doesn't exist
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<Payment>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (payment) => new Date(payment.createdAt).toLocaleString(),
      sortable: true,
    },
    {
      key: "orderNumber",
      header: "Order #",
      render: (payment) => payment.orderNumber || payment.orderId || "—",
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment) => `KES ${payment.amount.toLocaleString()}`,
      sortable: true,
    },
    {
      key: "method",
      header: "Method",
      render: (payment) => {
        const colors = {
          mpesa: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          cash: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
          card: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
        };
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium uppercase ${
              colors[payment.method]
            }`}
          >
            {payment.method}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => {
        const colors = {
          pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
          completed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          failed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        };
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
              colors[payment.status]
            }`}
          >
            {payment.status}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "mpesaRef",
      header: "M-Pesa Ref",
      render: (payment) => payment.mpesaRef || "—",
    },
    {
      key: "phoneNumber",
      header: "Phone",
      render: (payment) => payment.phoneNumber || "—",
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
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">
            Track and manage all payment transactions
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Status:</span>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "failed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("failed")}
          >
            Failed
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Method:</span>
          <Button
            variant={methodFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethodFilter("all")}
          >
            All
          </Button>
          <Button
            variant={methodFilter === "mpesa" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethodFilter("mpesa")}
          >
            M-Pesa
          </Button>
          <Button
            variant={methodFilter === "cash" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethodFilter("cash")}
          >
            Cash
          </Button>
          <Button
            variant={methodFilter === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethodFilter("card")}
          >
            Card
          </Button>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payment transactions will appear here once customers make purchases"
          actionLabel={undefined}
          onAction={undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                KES {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {payments.filter((p) => p.status === "completed").length}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {payments.filter((p) => p.status === "pending").length}
              </p>
            </div>
          </div>

          <DataTable
            data={payments}
            columns={columns}
            searchable
            searchPlaceholder="Search payments..."
            emptyMessage="No payments found"
          />
        </div>
      )}
    </div>
  );
}
