"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@smartduka/ui";
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Star, Award, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  createdAt: string;
  segment?: 'vip' | 'regular' | 'inactive';
}

interface CustomerStats {
  customer: Customer;
  loyalty: {
    totalPoints: number;
    availablePoints: number;
    redeemedPoints: number;
    tier: string;
    memberSince: string | null;
  } | null;
  purchaseStats: {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    createdAt: string;
    paymentMethod: string;
  }>;
}

export default function CustomerDetailsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStats();
  }, [customerId]);

  const fetchCustomerStats = async () => {
    try {
      const apiUrl = config.apiUrl;
      const res = await fetch(`${apiUrl}/customers/${customerId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok && data) {
        setStats(data);
        setCustomer(data.customer);
      }
    } catch (error) {
      console.error("Failed to fetch customer stats:", error);
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

  if (!customer) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Customer not found</h2>
          <Button onClick={() => router.push("/customers")} className="mt-4">
            Back to Customers
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
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <p className="text-muted-foreground">Customer details and purchase history</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>

              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                </div>
              )}

              {customer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Customer Since</p>
                <p className="font-medium">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Loyalty Points Card */}
          {stats?.loyalty && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Star className="h-5 w-5" />
                  Loyalty Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Available Points</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {stats.loyalty.availablePoints.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Total Earned</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {stats.loyalty.totalPoints.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Redeemed</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {stats.loyalty.redeemedPoints.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Tier</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Award className="h-5 w-5" />
                      {stats.loyalty.tier}
                    </p>
                  </div>
                </div>
                {stats.loyalty.memberSince && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                    Member since {new Date(stats.loyalty.memberSince).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Purchase Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <p className="text-sm">Total Orders</p>
                </div>
                <p className="text-3xl font-bold">{stats?.purchaseStats?.totalOrders || customer.totalPurchases || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CreditCard className="h-4 w-4" />
                  <p className="text-sm">Total Spent</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  KES {(stats?.purchaseStats?.totalSpent || customer.totalSpent || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm">Avg. Order</p>
                </div>
                <p className="text-2xl font-bold">
                  KES {(stats?.purchaseStats?.avgOrderValue || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <p className="text-sm">Last Order</p>
                </div>
                <p className="text-lg font-bold">
                  {stats?.purchaseStats?.lastOrderDate
                    ? new Date(stats.purchaseStats.lastOrderDate).toLocaleDateString()
                    : customer.lastPurchaseDate
                    ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                    : "Never"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.itemCount} items • {order.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">
                          KES {order.total.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders yet</p>
                  <p className="text-sm mt-2">
                    Orders made by this customer will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
