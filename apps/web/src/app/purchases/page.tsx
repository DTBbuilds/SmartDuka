"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@smartduka/ui";
import { Plus, Package, Eye, List, Grid3x3 } from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { PurchaseOrderListView } from "@/components/purchase-order-list-view";

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplierId: {
    _id: string;
    name: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
  totalCost: number;
  status: "pending" | "received" | "cancelled";
  expectedDeliveryDate?: string;
  createdAt: string;
}

export default function PurchasesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  const fetchPurchases = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let url = `${apiUrl}/purchases`;
      
      if (statusFilter !== "all") {
        url += `/${statusFilter}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<Purchase>[] = [
    {
      key: "purchaseNumber",
      header: "Purchase #",
      sortable: true,
    },
    {
      key: "supplierId",
      header: "Supplier",
      render: (purchase) => purchase.supplierId?.name || "Unknown",
      sortable: true,
    },
    {
      key: "items",
      header: "Items",
      render: (purchase) => purchase.items?.length || 0,
    },
    {
      key: "totalCost",
      header: "Total Cost",
      render: (purchase) => `KES ${purchase.totalCost?.toLocaleString() || 0}`,
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (purchase) => {
        const colors = {
          pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
          received: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        };
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              colors[purchase.status]
            }`}
          >
            {purchase.status}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (purchase) => new Date(purchase.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (purchase) => (
        <div className="flex gap-2">
          {purchase.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/purchases/${purchase._id}/receive`);
              }}
            >
              Receive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // View details (can be implemented later)
            }}
            aria-label="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
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
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders and stock receiving</p>
        </div>
        <Button onClick={() => router.push("/purchases/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "received" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("received")}
          >
            Received
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("table")}
            title="Table view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {purchases.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No purchase orders yet"
          description="Create your first purchase order to start restocking inventory"
          actionLabel="New Purchase Order"
          onAction={() => router.push("/purchases/new")}
        />
      ) : viewMode === "list" ? (
        <PurchaseOrderListView purchases={purchases} />
      ) : (
        <DataTable
          data={purchases}
          columns={columns}
          searchable
          searchPlaceholder="Search purchase orders..."
          emptyMessage="No purchase orders found"
        />
      )}
    </div>
  );
}
