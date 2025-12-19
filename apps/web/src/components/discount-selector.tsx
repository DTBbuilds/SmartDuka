"use client";

import { useEffect, useState } from "react";
import { Input, Button, Card, CardContent, CardHeader, CardTitle, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@smartduka/ui";
import { Tag, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";

interface Discount {
  _id: string;
  name: string;
  type: "percentage" | "fixed" | "bogo" | "tiered" | "coupon";
  value: number;
  status: "active" | "inactive";
}

interface DiscountSelectorProps {
  subtotal: number;
  itemCount?: number;
  onApplyDiscount: (discountId: string, amount: number) => void;
  selectedDiscount?: { id: string; amount: number } | null;
  onClearDiscount: () => void;
}

export function DiscountSelector({
  subtotal,
  itemCount,
  onApplyDiscount,
  selectedDiscount,
  onClearDiscount,
}: DiscountSelectorProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchDiscounts = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const res = await fetch(`${base}/discounts?status=active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch discounts");
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setDiscounts(data);
      } catch (err: any) {
        toast({
          type: "error",
          title: "Failed to load discounts",
          message: err?.message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDiscounts();
    }
  }, [open, token, toast]);

  const getDiscountTypeColor = (type: string) => {
    switch (type) {
      case "percentage":
        return "bg-blue-100 text-blue-800";
      case "fixed":
        return "bg-green-100 text-green-800";
      case "bogo":
        return "bg-purple-100 text-purple-800";
      case "tiered":
        return "bg-orange-100 text-orange-800";
      case "coupon":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDiscountDisplay = (discount: Discount) => {
    switch (discount.type) {
      case "percentage":
        return `${discount.value}% off`;
      case "fixed":
        return `Ksh ${discount.value} off`;
      case "bogo":
        return "Buy One Get One";
      case "tiered":
        return `${discount.value}% tiered`;
      case "coupon":
        return `Ksh ${discount.value} coupon`;
      default:
        return "Unknown";
    }
  };

  const handleApplyDiscount = async (discount: Discount) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/discounts/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discountId: discount._id,
          orderId: "temp", // Will be replaced with actual order ID
          subtotal,
          itemCount,
          appliedBy: "cashier", // Will be replaced with actual user ID
        }),
      });

      const applyText = await res.text();
      const result = applyText ? JSON.parse(applyText) : {};
      
      if (!res.ok) {
        throw new Error(result.message || "Failed to apply discount");
      }
      onApplyDiscount(discount._id, result.discountAmount);
      setOpen(false);

      toast({
        type: "success",
        title: "Discount applied",
        message: `${discount.name}: Ksh ${result.discountAmount}`,
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to apply discount",
        message: err?.message,
      });
    }
  };

  return (
    <div className="space-y-2">
      {selectedDiscount && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Discount Applied</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-green-900">
                  -Ksh {selectedDiscount.amount.toLocaleString()}
                </span>
                <button
                  onClick={onClearDiscount}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full" disabled={!subtotal}>
            <Tag className="h-4 w-4 mr-2" />
            {selectedDiscount ? "Change Discount" : "Apply Discount"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Available Discounts</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading discounts...
            </div>
          )}

          {!loading && discounts.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No active discounts available
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {discounts.map((discount) => (
              <button
                key={discount._id}
                onClick={() => handleApplyDiscount(discount)}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{discount.name}</span>
                      <Badge className={getDiscountTypeColor(discount.type)}>
                        {discount.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {getDiscountDisplay(discount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      Apply
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {subtotal < 100 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                Some discounts may have minimum purchase requirements
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
