"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@smartduka/ui";
import { User, Phone, TrendingUp, Calendar, X } from "lucide-react";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  segment: "vip" | "regular" | "inactive";
  lastPurchaseDate?: string;
  totalSpent: number;
  totalPurchases: number;
}

interface CustomerProfileCardProps {
  customer: Customer | null;
  onClear: () => void;
}

export function CustomerProfileCard({ customer, onClear }: CustomerProfileCardProps) {
  if (!customer) return null;

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case "vip":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const avgOrderValue =
    customer.totalPurchases > 0
      ? Math.round(customer.totalSpent / customer.totalPurchases)
      : 0;

  const lastPurchase = customer.lastPurchaseDate
    ? new Date(customer.lastPurchaseDate).toLocaleDateString()
    : "Never";

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{customer.name}</CardTitle>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Segment</span>
            <Badge className={getSegmentColor(customer.segment)}>
              {customer.segment.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground">Total Spent</div>
              <div className="text-sm font-semibold">
                Ksh {customer.totalSpent.toLocaleString()}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground">Purchases</div>
              <div className="text-sm font-semibold">{customer.totalPurchases}</div>
            </div>

            <div className="p-2 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Avg Order
              </div>
              <div className="text-sm font-semibold">Ksh {avgOrderValue.toLocaleString()}</div>
            </div>

            <div className="p-2 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last Visit
              </div>
              <div className="text-sm font-semibold">{lastPurchase}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
