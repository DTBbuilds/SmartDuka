"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@smartduka/ui";
import { Calendar, TrendingUp, DollarSign, ShoppingCart, Package } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface MonthlySales {
  month: string;
  totalRevenue: number;
  totalOrders: number;
  totalItems: number;
  avgOrderValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export default function MonthlySalesPage() {
  const { token, user } = useAuth();
  const [salesData, setSalesData] = useState<MonthlySales | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to view reports
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchMonthlySales();
  }, [selectedMonth]);

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const fetchMonthlySales = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/reports/monthly-sales?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly sales:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(getCurrentMonth());
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Monthly Sales Report</h1>
        <p className="text-muted-foreground">View sales performance by month</p>
      </div>

      {/* Month Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousMonth}>
              Previous Month
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Month</p>
              <p className="text-lg font-semibold">
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goToCurrentMonth}>
                Current Month
              </Button>
              <Button
                variant="outline"
                onClick={goToNextMonth}
                disabled={selectedMonth >= getCurrentMonth()}
              >
                Next Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {salesData?.totalRevenue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData?.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData?.totalItems || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {salesData?.avgOrderValue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData?.topProducts && salesData.topProducts.length > 0 ? (
            <div className="space-y-4">
              {salesData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">KES {product.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      KES {(product.revenue / product.quantity).toFixed(2)} per unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No sales data for this month
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
