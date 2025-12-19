"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@smartduka/ui";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Calendar } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface TrendsData {
  period: string;
  dailyTrends: Array<{
    date: string;
    revenue: number;
    orders: number;
    items: number;
  }>;
  topGrowingProducts: Array<{
    productName: string;
    growth: number;
    currentRevenue: number;
  }>;
  topDecliningProducts: Array<{
    productName: string;
    decline: number;
    currentRevenue: number;
  }>;
  summary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalOrders: number;
    ordersGrowth: number;
    avgOrderValue: number;
    avgOrderGrowth: number;
  };
}

export default function TrendsPage() {
  const { token, user } = useAuth();
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to view reports
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchTrends();
  }, [period]);

  const fetchTrends = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/reports/trends?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setTrendsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  const maxRevenue = trendsData?.dailyTrends
    ? Math.max(...trendsData.dailyTrends.map((d) => d.revenue))
    : 0;

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Trends</h1>
          <p className="text-muted-foreground">Analyze sales patterns and growth</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("7d")}
          >
            7 Days
          </Button>
          <Button
            variant={period === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("30d")}
          >
            30 Days
          </Button>
          <Button
            variant={period === "90d" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("90d")}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Summary Cards with Growth */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {trendsData?.summary?.totalRevenue?.toLocaleString() || 0}
            </div>
            <div
              className={`flex items-center text-xs ${
                (trendsData?.summary?.revenueGrowth || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(trendsData?.summary?.revenueGrowth || 0) >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trendsData?.summary?.revenueGrowth || 0).toFixed(1)}% vs previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendsData?.summary?.totalOrders || 0}</div>
            <div
              className={`flex items-center text-xs ${
                (trendsData?.summary?.ordersGrowth || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(trendsData?.summary?.ordersGrowth || 0) >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trendsData?.summary?.ordersGrowth || 0).toFixed(1)}% vs previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {trendsData?.summary?.avgOrderValue?.toLocaleString() || 0}
            </div>
            <div
              className={`flex items-center text-xs ${
                (trendsData?.summary?.avgOrderGrowth || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(trendsData?.summary?.avgOrderGrowth || 0) >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trendsData?.summary?.avgOrderGrowth || 0).toFixed(1)}% vs previous period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsData?.dailyTrends && trendsData.dailyTrends.length > 0 ? (
            <div className="space-y-2">
              {trendsData.dailyTrends.map((day, index) => {
                const barWidth = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 w-full rounded-md bg-muted">
                        <div
                          className="absolute left-0 top-0 h-full rounded-md bg-primary transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3 text-sm font-medium">
                          KES {day.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-muted-foreground">
                      {day.orders} orders
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No trend data available</p>
          )}
        </CardContent>
      </Card>

      {/* Product Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Growing Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Growing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsData?.topGrowingProducts && trendsData.topGrowingProducts.length > 0 ? (
              <div className="space-y-3">
                {trendsData.topGrowingProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-green-600">+{product.growth.toFixed(1)}% growth</p>
                    </div>
                    <p className="font-semibold">KES {product.currentRevenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Declining Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Declining Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsData?.topDecliningProducts && trendsData.topDecliningProducts.length > 0 ? (
              <div className="space-y-3">
                {trendsData.topDecliningProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-red-600">{product.decline.toFixed(1)}% decline</p>
                    </div>
                    <p className="font-semibold">KES {product.currentRevenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
