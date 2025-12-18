"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Badge,
} from "@smartduka/ui";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  Calendar,
  User,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { FormModal } from "@/components/shared/form-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Adjustment {
  _id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  description?: string;
  reference?: string;
  adjustedBy?: string;
  adjustedByName?: string;
  previousStock?: number;
  newStock?: number;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  stock: number;
  price: number;
  lowStockThreshold?: number;
}

interface AdjustmentSummary {
  totalAdjustments: number;
  byReason: Record<string, number>;
  netAdjustment: number;
}

const REASONS = [
  { value: "recount", label: "Physical Recount" },
  { value: "correction", label: "Correction/Error Fix" },
  { value: "damage", label: "Damaged Goods" },
  { value: "loss", label: "Lost/Missing" },
  { value: "theft", label: "Theft/Shrinkage" },
  { value: "expired", label: "Expired Products" },
  { value: "return", label: "Customer Return" },
  { value: "received", label: "Stock Received" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "other", label: "Other" },
];

export default function StockAdjustmentsPage() {
  const { token, user } = useAuth();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<AdjustmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewingAdjustment, setViewingAdjustment] = useState<Adjustment | null>(null);

  const [formData, setFormData] = useState({
    productId: "",
    adjustmentType: "increase" as "increase" | "decrease",
    quantity: 1,
    reason: "",
    description: "",
    reference: "",
  });

  // Admin check
  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">Admin privileges required.</p>
      </div>
    );
  }

  const fetchAdjustments = useCallback(async () => {
    if (!token) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/stock/adjustments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAdjustments(await res.json());
    } catch (e) {
      console.error("Failed to fetch adjustments:", e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/inventory/products?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error("Failed to fetch products:", e);
    }
  }, [token]);

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/stock/adjustments/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.error("Failed to fetch summary:", e);
    }
  }, [token]);

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
    fetchSummary();
  }, [fetchAdjustments, fetchProducts, fetchSummary]);

  const handleAdd = () => {
    setFormData({ productId: "", adjustmentType: "increase", quantity: 1, reason: "", description: "", reference: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.productId || formData.quantity <= 0 || !formData.reason) {
      alert("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const product = products.find(p => p._id === formData.productId);
      const delta = formData.adjustmentType === "decrease" ? -formData.quantity : formData.quantity;

      const res = await fetch(`${base}/stock/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: formData.productId,
          productName: product?.name || "Unknown",
          delta,
          reason: formData.reason,
          description: formData.description || undefined,
          reference: formData.reference || undefined,
        }),
      });

      if (res.ok) {
        await Promise.all([fetchAdjustments(), fetchProducts(), fetchSummary()]);
        setIsModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create adjustment");
      }
    } catch (e: any) {
      alert(e.message || "Failed to create adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Date", "Product", "Adjustment", "Reason", "Description", "Reference"].join(","),
      ...filteredAdjustments.map(a => [
        new Date(a.createdAt).toLocaleDateString(),
        `"${a.productName}"`,
        a.delta > 0 ? `+${a.delta}` : a.delta,
        a.reason,
        `"${a.description || ""}"`,
        a.reference || "",
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    if (searchQuery && !adj.productName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (reasonFilter !== "all" && adj.reason !== reasonFilter) return false;
    if (typeFilter === "increase" && adj.delta <= 0) return false;
    if (typeFilter === "decrease" && adj.delta >= 0) return false;
    return true;
  });

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      damage: "bg-red-100 text-red-700",
      loss: "bg-red-100 text-red-700",
      theft: "bg-red-100 text-red-700",
      expired: "bg-orange-100 text-orange-700",
      recount: "bg-blue-100 text-blue-700",
      correction: "bg-blue-100 text-blue-700",
      return: "bg-green-100 text-green-700",
      received: "bg-green-100 text-green-700",
    };
    const label = REASONS.find(r => r.value === reason)?.label || reason;
    return <Badge className={`${colors[reason] || "bg-gray-100 text-gray-700"} font-normal`}>{label}</Badge>;
  };

  const columns: Column<Adjustment>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (adj) => (
        <div className="text-sm">
          <div>{new Date(adj.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">{new Date(adj.createdAt).toLocaleTimeString()}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "productName",
      header: "Product",
      render: (adj) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{adj.productName}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "delta",
      header: "Adjustment",
      render: (adj) => (
        <div className={`flex items-center gap-1 font-semibold ${adj.delta > 0 ? "text-green-600" : "text-red-600"}`}>
          {adj.delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{adj.delta > 0 ? "+" : ""}{adj.delta}</span>
        </div>
      ),
      sortable: true,
    },
    { key: "reason", header: "Reason", render: (adj) => getReasonBadge(adj.reason) },
    { key: "description", header: "Notes", render: (adj) => <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{adj.description || "—"}</span> },
    { key: "reference", header: "Ref #", render: (adj) => <span className="text-sm font-mono">{adj.reference || "—"}</span> },
  ];

  if (isLoading) return <div className="p-4 md:p-6"><TableSkeleton /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground hidden md:block">Track and manage inventory adjustments</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button variant="outline" size="sm" onClick={() => { fetchAdjustments(); fetchSummary(); }} className="flex-shrink-0">
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-shrink-0">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
          <Button size="sm" onClick={handleAdd} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span>New</span>
          </Button>
        </div>
      </div>

      {/* Stats - Compact grid on mobile */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg"><FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-lg md:text-2xl font-bold">{summary?.totalAdjustments || adjustments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg"><TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Added</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">+{adjustments.filter(a => a.delta > 0).reduce((s, a) => s + a.delta, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-red-100 rounded-lg"><TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Removed</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">{adjustments.filter(a => a.delta < 0).reduce((s, a) => s + a.delta, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg"><ArrowUpDown className="h-4 w-4 md:h-5 md:w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Net</p>
                <p className={`text-lg md:text-2xl font-bold ${(summary?.netAdjustment || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(summary?.netAdjustment || 0) >= 0 ? "+" : ""}{summary?.netAdjustment || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Stacked on mobile */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-4">
            <div className="flex-1 min-w-0 md:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
              </div>
            </div>
            <div className="flex gap-2">
              <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="flex-1 h-10 rounded-md border px-3 text-sm bg-background">
                <option value="all">All Reasons</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 h-10 rounded-md border px-3 text-sm bg-background">
                <option value="all">All Types</option>
                <option value="increase">Increases</option>
                <option value="decrease">Decreases</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert - Scrollable on mobile */}
      {products.filter(p => p.stock <= (p.lowStockThreshold ?? 10)).length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              <span className="text-sm md:text-base font-semibold text-orange-800 dark:text-orange-400">Low Stock</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {products.filter(p => p.stock <= (p.lowStockThreshold ?? 10)).slice(0, 5).map(p => (
                <Badge 
                  key={p._id} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-orange-100 whitespace-nowrap flex-shrink-0 py-1.5 px-3" 
                  onClick={() => { setFormData({ ...formData, productId: p._id, adjustmentType: "increase", reason: "received" }); setIsModalOpen(true); }}
                >
                  {p.name}: {p.stock}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filteredAdjustments.length === 0 ? (
        <EmptyState icon={Package} title="No adjustments found" description={searchQuery ? "Try different filters" : "Create your first stock adjustment"} actionLabel={!searchQuery ? "New Adjustment" : undefined} onAction={!searchQuery ? handleAdd : undefined} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable data={filteredAdjustments} columns={columns} searchable={false} emptyMessage="No adjustments found" />
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <FormModal open={isModalOpen} onOpenChange={setIsModalOpen} title="New Stock Adjustment" description="Adjust inventory levels for a product" onSubmit={handleSubmit} loading={isSaving} submitLabel="Create Adjustment">
        <div className="space-y-4">
          <div>
            <Label>Product <span className="text-destructive">*</span></Label>
            <select value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
              <option value="">Select product</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name} {p.sku ? `(${p.sku})` : ""} - Stock: {p.stock}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type <span className="text-destructive">*</span></Label>
              <select value={formData.adjustmentType} onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as any })} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
                <option value="increase">Increase (+)</option>
                <option value="decrease">Decrease (-)</option>
              </select>
            </div>
            <div>
              <Label>Quantity <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Reason <span className="text-destructive">*</span></Label>
            <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
              <option value="">Select reason</option>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Reference # (optional)</Label>
            <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="PO#, Invoice#, etc." className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional details..." rows={2} className="mt-1" />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
