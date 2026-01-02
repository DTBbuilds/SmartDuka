"use client";

import { useState } from "react";
import { config } from "@/lib/config";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { Package, Plus } from "lucide-react";

interface StockAdjustmentFormProps {
  productId: string;
  productName: string;
  currentStock: number;
  onSuccess: () => void;
}

export function StockAdjustmentForm({
  productId,
  productName,
  currentStock,
  onSuccess,
}: StockAdjustmentFormProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [quantityChange, setQuantityChange] = useState(0);
  const [reason, setReason] = useState("correction");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (quantityChange === 0) {
      toast({
        type: "error",
        title: "Invalid quantity",
        message: "Quantity change must not be zero",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/inventory/adjustments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          quantityChange,
          reason,
          notes,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create adjustment");
      }

      toast({
        type: "success",
        title: "Stock adjusted",
        message: `${productName} stock adjusted by ${quantityChange}`,
      });

      setOpen(false);
      setQuantityChange(0);
      setReason("correction");
      setNotes("");
      onSuccess();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to adjust stock",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const newStock = currentStock + quantityChange;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock - {productName}</DialogTitle>
          <DialogDescription>
            Update the stock level for this product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Stock:</span>
              <span className="font-semibold">{currentStock} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">New Stock:</span>
              <span className={`font-semibold ${newStock < 0 ? "text-red-600" : "text-green-600"}`}>
                {newStock} units
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Quantity Change</label>
            <Input
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity change (positive or negative)"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Positive = add stock, Negative = remove stock
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm mt-1"
            >
              <option value="correction">Correction</option>
              <option value="damage">Damage</option>
              <option value="loss">Loss</option>
              <option value="return">Return</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="mt-1 min-h-20"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || quantityChange === 0}>
              {loading ? "Adjusting..." : "Adjust Stock"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
