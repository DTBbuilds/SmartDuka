"use client";

import { useState } from "react";
import { config } from "@/lib/config";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { RotateCcw, AlertCircle } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

interface ReturnRequestFormProps {
  order: Order;
  onSuccess: () => void;
}

export function ReturnRequestForm({ order, onSuccess }: ReturnRequestFormProps) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleItemToggle = (productId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.min(quantity, order.items.find((i) => i.productId === productId)?.quantity || 1),
    }));
  };

  const handleReasonChange = (productId: string, reason: string) => {
    setReasons((prev) => ({
      ...prev,
      [productId]: reason,
    }));
  };

  const calculateRefundAmount = () => {
    return Object.entries(selectedItems)
      .filter(([_, selected]) => selected)
      .reduce((sum, [productId]) => {
        const item = order.items.find((i) => i.productId === productId);
        const qty = quantities[productId] || 1;
        return sum + (item?.unitPrice || 0) * qty;
      }, 0);
  };

  const handleSubmit = async () => {
    const selectedProductIds = Object.entries(selectedItems)
      .filter(([_, selected]) => selected)
      .map(([productId]) => productId);

    if (selectedProductIds.length === 0) {
      toast({
        type: "error",
        title: "No items selected",
        message: "Please select at least one item to return",
      });
      return;
    }

    const returnItems = selectedProductIds.map((productId) => {
      const item = order.items.find((i) => i.productId === productId);
      return {
        productId,
        productName: item?.name || "Unknown",
        quantity: quantities[productId] || 1,
        unitPrice: item?.unitPrice || 0,
        reason: reasons[productId] || "Other",
      };
    });

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/returns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order._id,
          orderDate: order.createdAt,
          items: returnItems,
          requestedBy: user?.sub || "unknown",
          returnWindow: 7,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create return request");
      }

      toast({
        type: "success",
        title: "Return request created",
        message: "Your return request has been submitted for approval",
      });

      setOpen(false);
      setSelectedItems({});
      setQuantities({});
      setReasons({});
      onSuccess();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to create return request",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const refundAmount = calculateRefundAmount();
  const orderDate = new Date(order.createdAt);
  const returnDeadline = new Date(orderDate);
  returnDeadline.setDate(returnDeadline.getDate() + 7);
  const isWithinWindow = new Date() <= returnDeadline;

  if (!isWithinWindow) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Return window expired</p>
              <p className="text-sm text-red-800">
                This order can no longer be returned (7-day window expired)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Request Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Return - {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" disabled />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-24">Price</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems[item.productId] || false}
                        onChange={() => handleItemToggle(item.productId)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {selectedItems[item.productId] ? (
                        <Input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={quantities[item.productId] || 1}
                          onChange={(e) =>
                            handleQuantityChange(item.productId, parseInt(e.target.value))
                          }
                          className="w-16"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell>Ksh {item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {selectedItems[item.productId] && (
                        <select
                          value={reasons[item.productId] || "Other"}
                          onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="Defective">Defective</option>
                          <option value="Wrong Item">Wrong Item</option>
                          <option value="Changed Mind">Changed Mind</option>
                          <option value="Better Price">Better Price</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Refund Amount:</span>
                  <span className="font-bold text-lg">
                    Ksh {refundAmount.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Return window expires: {returnDeadline.toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                Object.values(selectedItems).every((v) => !v) ||
                refundAmount === 0
              }
            >
              {loading ? "Submitting..." : "Submit Return Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
