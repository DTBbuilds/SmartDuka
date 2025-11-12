"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button, Input, Label, Textarea } from "@smartduka/ui";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { FormModal } from "@/components/shared/form-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Adjustment {
  _id: string;
  productId: {
    _id: string;
    name: string;
  };
  quantity: number;
  reason: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
}

export default function StockAdjustmentsPage() {
  const { token, user } = useAuth();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    productId: "",
    adjustmentType: "increase" as "increase" | "decrease",
    quantity: 0,
    reason: "",
    notes: "",
  });

  const reasons = [
    "damage",
    "theft",
    "correction",
    "found",
    "expired",
    "returned",
    "other",
  ];

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
  }, []);

  const fetchAdjustments = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/stock/adjustments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAdjustments(data);
      }
    } catch (error) {
      console.error("Failed to fetch adjustments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const handleAdd = () => {
    setFormData({
      productId: "",
      adjustmentType: "increase",
      quantity: 0,
      reason: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.productId || formData.quantity <= 0 || !formData.reason) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const adjustmentQuantity =
        formData.adjustmentType === "decrease" ? -formData.quantity : formData.quantity;

      const res = await fetch(`${apiUrl}/stock/adjustments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: formData.productId,
          quantity: adjustmentQuantity,
          reason: formData.reason,
          notes: formData.notes || undefined,
        }),
      });

      if (res.ok) {
        await fetchAdjustments();
        await fetchProducts(); // Refresh to show updated stock
        setIsModalOpen(false);
      } else {
        throw new Error("Failed to create adjustment");
      }
    } catch (error) {
      console.error("Failed to create adjustment:", error);
      alert("Failed to create adjustment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Adjustment>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (adj) => new Date(adj.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: "productId",
      header: "Product",
      render: (adj) => adj.productId?.name || "Unknown",
      sortable: true,
    },
    {
      key: "quantity",
      header: "Adjustment",
      render: (adj) => (
        <span
          className={`flex items-center gap-1 ${
            adj.quantity > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {adj.quantity > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {adj.quantity > 0 ? "+" : ""}
          {adj.quantity}
        </span>
      ),
      sortable: true,
    },
    {
      key: "reason",
      header: "Reason",
      render: (adj) => (
        <span className="capitalize">{adj.reason.replace("_", " ")}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (adj) => adj.notes || "—",
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (adj) => adj.createdBy || user?.email || "—",
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
          <h1 className="text-3xl font-bold">Stock Adjustments</h1>
          <p className="text-muted-foreground">
            Track and manage inventory adjustments
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      {adjustments.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No adjustments yet"
          description="Create your first stock adjustment to track inventory changes"
          actionLabel="New Adjustment"
          onAction={handleAdd}
        />
      ) : (
        <DataTable
          data={adjustments}
          columns={columns}
          searchable
          searchPlaceholder="Search adjustments..."
          emptyMessage="No adjustments found"
        />
      )}

      <FormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="New Stock Adjustment"
        description="Adjust inventory levels for a product"
        onSubmit={handleSubmit}
        loading={isSaving}
        submitLabel="Create Adjustment"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">
              Product <span className="text-destructive">*</span>
            </Label>
            <select
              id="product"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} ({product.sku}) - Current: {product.quantityOnHand}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">
                Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="adjustmentType"
                value={formData.adjustmentType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adjustmentType: e.target.value as "increase" | "decrease",
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="increase">Increase (+)</option>
                <option value="decrease">Decrease (-)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select reason</option>
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.charAt(0).toUpperCase() + reason.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details about this adjustment"
              rows={3}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
