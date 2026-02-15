"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@smartduka/ui";
import { Plus, Trash2, ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Supplier {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export default function NewPurchasePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: "",
    expectedDeliveryDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: "", productName: "", quantity: 1, unitCost: 0 },
  ]);
  
  // Quick add supplier
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/suppliers/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      if (res.ok) {
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    
    setAddingSupplier(true);
    try {
      const res = await fetch(`${config.apiUrl}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSupplierName.trim(), status: "active" }),
      });
      
      const supplierText = await res.text();
      const newSupplier = supplierText ? JSON.parse(supplierText) : {};
      
      if (res.ok) {
        setSuppliers([...suppliers, newSupplier]);
        setFormData({ ...formData, supplierId: newSupplier._id });
        setShowAddSupplier(false);
        setNewSupplierName("");
      } else {
        alert("Failed to create supplier");
      }
    } catch (error) {
      console.error("Failed to create supplier:", error);
      alert("Failed to create supplier");
    } finally {
      setAddingSupplier(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prodText = await res.text();
      const data = prodText ? JSON.parse(prodText) : [];
      
      if (res.ok) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: "", productName: "", quantity: 1, unitCost: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // If product changed, update product name
    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        updated[index].productName = product.name;
      }
    }

    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      alert("Please select a supplier");
      return;
    }

    if (lineItems.some((item) => !item.productId || item.quantity <= 0 || item.unitCost <= 0)) {
      alert("Please fill in all line items correctly");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${config.apiUrl}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          items: lineItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
          expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
          notes: formData.notes || undefined,
          status: "pending",
        }),
      });

      if (res.ok) {
        router.push("/purchases");
      } else {
        throw new Error("Failed to create purchase order");
      }
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      alert("Failed to create purchase order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-4 md:py-8 px-4 md:px-6">
      <div className="mb-6 md:mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 md:mb-4 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl md:text-3xl font-bold">New Purchase Order</h1>
        <p className="text-sm text-muted-foreground">Create a new purchase order for restocking</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <select
                    id="supplier"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    required
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddSupplier(true)}
                    title="Add new supplier"
                    className="flex-shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {suppliers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No suppliers found.{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setShowAddSupplier(true)}
                    >
                      Add one now
                    </button>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedDeliveryDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or instructions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 md:p-4 space-y-3 md:space-y-0">
                  {/* Mobile: Stacked layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Product</Label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateLineItem(index, "productId", e.target.value)}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cost</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateLineItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total</Label>
                        <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-2 text-sm font-medium">
                          {(item.quantity * item.unitCost).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Row layout */}
                  <div className="hidden md:flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Product</Label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateLineItem(index, "productId", e.target.value)}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="w-28 space-y-2">
                      <Label>Unit Cost</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateLineItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="w-28 space-y-2">
                      <Label>Total</Label>
                      <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                        {(item.quantity * item.unitCost).toLocaleString()}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">KES {calculateTotal().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 md:gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 md:flex-none">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1 md:flex-none">
            {isLoading ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </form>

      {/* Quick Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Quickly add a new supplier to use in this purchase order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g., ABC Distributors"
                onKeyDown={(e) => e.key === "Enter" && handleQuickAddSupplier()}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddSupplier} disabled={!newSupplierName.trim() || addingSupplier}>
              {addingSupplier ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Supplier"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
