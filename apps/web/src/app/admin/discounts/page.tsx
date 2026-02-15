"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";

interface Discount {
  _id: string;
  name: string;
  type: "percentage" | "fixed" | "bogo" | "tiered" | "coupon";
  value: number;
  status: "active" | "inactive";
  usageCount: number;
  usageLimit?: number;
  createdAt: string;
}

export default function DiscountsPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadDiscounts();
  }, [token, user]);

  const loadDiscounts = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/discounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load discounts");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    try {
      const res = await fetch(`${config.apiUrl}/discounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete discount");

      setDiscounts(discounts.filter((d) => d._id !== id));
      toast({
        type: "success",
        title: "Discount deleted",
        message: "Discount has been removed",
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to delete discount",
        message: err?.message,
      });
    }
  };

  const getTypeColor = (type: string) => {
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

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const getDiscountDisplay = (discount: Discount) => {
    switch (discount.type) {
      case "percentage":
        return `${discount.value}%`;
      case "fixed":
        return `Ksh ${discount.value}`;
      case "bogo":
        return "BOGO";
      case "tiered":
        return `${discount.value}%`;
      case "coupon":
        return `Ksh ${discount.value}`;
      default:
        return "-";
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage discounts
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
            <h1 className="text-3xl font-bold">Discount Management</h1>
            <p className="text-muted-foreground">
              Create and manage discount rules for your shop
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Discount
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Discount</DialogTitle>
              </DialogHeader>
              <div className="text-center py-8 text-muted-foreground">
                Discount creation form coming soon
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading discounts...</p>
            </CardContent>
          </Card>
        ) : discounts.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No discounts created yet. Create your first discount to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Active Discounts</CardTitle>
              <CardDescription>
                {discounts.length} discount{discounts.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount) => (
                      <TableRow key={discount._id}>
                        <TableCell className="font-medium">{discount.name}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(discount.type)}>
                            {discount.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getDiscountDisplay(discount)}</TableCell>
                        <TableCell>
                          {discount.usageCount}
                          {discount.usageLimit && ` / ${discount.usageLimit}`}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(discount.status)}>
                            {discount.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(discount.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDiscount(discount)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(discount._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedDiscount && (
          <Dialog open={!!selectedDiscount} onOpenChange={() => setSelectedDiscount(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedDiscount.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge className={getTypeColor(selectedDiscount.type)}>
                      {selectedDiscount.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-semibold">{getDiscountDisplay(selectedDiscount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedDiscount.status)}>
                      {selectedDiscount.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usage</p>
                    <p className="font-semibold">
                      {selectedDiscount.usageCount}
                      {selectedDiscount.usageLimit && ` / ${selectedDiscount.usageLimit}`}
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </main>
  );
}
