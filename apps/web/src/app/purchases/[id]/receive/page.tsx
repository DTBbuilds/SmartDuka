"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@smartduka/ui";
import { ArrowLeft, Package } from "lucide-react";
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
    name: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
  expectedDeliveryDate?: string;
  notes?: string;
}

export default function ReceivePurchasePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [receiveItems, setReceiveItems] = useState<PurchaseItem[]>([]);
  const [receiveNotes, setReceiveNotes] = useState("");

  useEffect(() => {
    fetchPurchase();
  }, [purchaseId]);

  const fetchPurchase = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/purchases/${purchaseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setPurchase(data);
        
        // Initialize receive items with ordered quantities
        setReceiveItems(
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

  const updateReceivedQuantity = (index: number, quantity: number) => {
    const updated = [...receiveItems];
    updated[index].receivedQuantity = quantity;
    setReceiveItems(updated);
  };

  const handleReceive = async () => {
    if (receiveItems.some((item) => item.receivedQuantity < 0)) {
      alert("Received quantities cannot be negative");
      return;
    }

    setIsSaving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/purchases/${purchaseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "received",
          receivedItems: receiveItems.map((item) => ({
            productId: item.productId,
            receivedQuantity: item.receivedQuantity,
          })),
          receiveNotes,
        }),
      });

      if (res.ok) {
        router.push("/purchases");
      } else {
        throw new Error("Failed to receive purchase");
      }
    } catch (error) {
      console.error("Failed to receive purchase:", error);
      alert("Failed to receive purchase. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
        <h1 className="text-3xl font-bold">Receive Purchase Order</h1>
        <p className="text-muted-foreground">
          {purchase.purchaseNumber} - {purchase.supplierId.name}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Items to Receive</CardTitle>
          </CardHeader>
          <CardContent>
            <POItemsListView
              items={receiveItems}
              onUpdateReceivedQuantity={updateReceivedQuantity}
              isEditable={true}
              maxHeight="max-h-96"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receiving Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              placeholder="Add notes about damages, shortages, or other issues..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleReceive} disabled={isSaving}>
            {isSaving ? "Receiving..." : "Confirm Receipt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
