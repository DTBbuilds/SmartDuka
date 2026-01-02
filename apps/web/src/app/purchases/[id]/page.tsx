"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@smartduka/ui";
import { ArrowLeft, Package, Truck } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { POItemsListView } from "@/components/po-items-list-view";

interface PurchaseItem {
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
}

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
  status: "pending" | "received" | "cancelled";
  expectedDeliveryDate?: string;
  createdAt: string;
  notes?: string;
}

export default function PurchaseDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayItems, setDisplayItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    fetchPurchase();
  }, [purchaseId]);

  const fetchPurchase = async () => {
    try {
      const apiUrl = config.apiUrl;
      const res = await fetch(`${apiUrl}/purchases/${purchaseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setPurchase(data);

        // Convert to display format
        setDisplayItems(
          data.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            orderedQuantity: item.quantity,
            receivedQuantity: item.quantity, // Default to full quantity
            unitCost: item.unitCost,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch purchase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "received":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Purchase not found</h2>
          <Button onClick={() => router.push("/purchases")} className="mt-4">
            Back to Purchases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{purchase.purchaseNumber}</h1>
            <p className="text-muted-foreground mt-1">{purchase.supplierId.name}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(purchase.status)}`}>
            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Order Date */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Order Date</p>
            <p className="text-lg font-semibold">{formatDate(purchase.createdAt)}</p>
          </CardContent>
        </Card>

        {/* Expected Delivery */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Truck className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Expected Delivery</p>
                <p className="text-lg font-semibold">
                  {purchase.expectedDeliveryDate ? formatDate(purchase.expectedDeliveryDate) : "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Items</p>
            <p className="text-lg font-semibold">{displayItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Items</CardTitle>
          </CardHeader>
          <CardContent>
            <POItemsListView items={displayItems} isEditable={false} maxHeight="max-h-96" />
          </CardContent>
        </Card>

        {/* Notes */}
        {purchase.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{purchase.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          {purchase.status === "pending" && (
            <Button onClick={() => router.push(`/purchases/${purchase._id}/receive`)}>
              <Truck className="mr-2 h-4 w-4" />
              Receive Order
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
