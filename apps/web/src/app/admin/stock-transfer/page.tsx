"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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
  Textarea,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Plus, Check, X, Clock } from "lucide-react";

interface StockTransfer {
  _id: string;
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: number;
  status: "pending" | "approved" | "completed" | "rejected";
  reason: string;
  requestedBy: string;
  createdAt: string;
}

export default function StockTransferPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fromLocationId: "",
    toLocationId: "",
    productId: "",
    quantity: 0,
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadTransfers();
  }, [token, user]);

  const loadTransfers = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/inventory/stock-transfer/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load transfers");
      const data = await res.json();
      setTransfers(data);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load transfers",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (!formData.fromLocationId || !formData.toLocationId || !formData.productId || formData.quantity <= 0) {
      toast({
        type: "error",
        title: "Invalid input",
        message: "Please fill in all required fields",
      });
      return;
    }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/inventory/stock-transfer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to request transfer");

      toast({
        type: "success",
        title: "Transfer requested",
        message: "Stock transfer request has been created",
      });

      setOpen(false);
      setFormData({
        fromLocationId: "",
        toLocationId: "",
        productId: "",
        quantity: 0,
        reason: "",
        notes: "",
      });
      loadTransfers();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to request transfer",
        message: err?.message,
      });
    }
  };

  const handleApproveTransfer = async (id: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/inventory/stock-transfer/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to approve transfer");

      toast({
        type: "success",
        title: "Transfer approved",
        message: "Stock transfer has been approved",
      });

      loadTransfers();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to approve transfer",
        message: err?.message,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <Check className="h-4 w-4" />;
      case "completed":
        return <Check className="h-4 w-4" />;
      case "rejected":
        return <X className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage stock transfers
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stock Transfer</h1>
            <p className="text-muted-foreground">
              Manage stock transfers between locations
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Request Stock Transfer</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">From Location *</label>
                    <Input
                      value={formData.fromLocationId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fromLocationId: e.target.value,
                        })
                      }
                      placeholder="Location ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Location *</label>
                    <Input
                      value={formData.toLocationId}
                      onChange={(e) =>
                        setFormData({ ...formData, toLocationId: e.target.value })
                      }
                      placeholder="Location ID"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Product ID *</label>
                    <Input
                      value={formData.productId}
                      onChange={(e) =>
                        setFormData({ ...formData, productId: e.target.value })
                      }
                      placeholder="Product ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity *</label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reason *</label>
                  <Input
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="e.g., Stock balancing"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    className="mt-1 min-h-20"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRequestTransfer}>Request Transfer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Loading transfers...
              </p>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No stock transfers yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests ({transfers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer._id}>
                        <TableCell className="font-medium">
                          {transfer.productId.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-sm">
                          {transfer.fromLocationId.slice(0, 6)}... →{" "}
                          {transfer.toLocationId.slice(0, 6)}...
                        </TableCell>
                        <TableCell>{transfer.quantity} units</TableCell>
                        <TableCell>{transfer.reason}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transfer.status)}>
                            {getStatusIcon(transfer.status)}
                            <span className="ml-1">{transfer.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {transfer.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveTransfer(transfer._id)}
                            >
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
