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
  Input,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Gift, Users, TrendingUp, Star } from "lucide-react";

interface LoyaltyStats {
  totalMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
  topTier: string;
}

interface TopCustomer {
  _id: string;
  customerId: string;
  totalPoints: number;
  tier: string;
  referralCount: number;
}

export default function LoyaltyPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsAmount, setPointsAmount] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadLoyaltyData();
  }, [token, user]);

  const loadLoyaltyData = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Load stats
      const statsRes = await fetch(`${config.apiUrl}/loyalty/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load top customers
      const topRes = await fetch(`${config.apiUrl}/loyalty/top-customers?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (topRes.ok) {
        const topData = await topRes.json();
        setTopCustomers(topData);
      }
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load loyalty data",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage loyalty program
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Loyalty & Rewards Program</h1>
          <p className="text-muted-foreground">
            Manage customer loyalty points and rewards
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading loyalty data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">Points Issued</p>
                    <p className="text-2xl font-bold">
                      {(stats?.totalPointsIssued || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-sm text-muted-foreground">Avg Points/Member</p>
                    <p className="text-2xl font-bold">
                      {Math.round(stats?.averagePointsPerMember || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-muted-foreground">Top Tier</p>
                    <p className="text-2xl font-bold">{stats?.topTier || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Loyalty Members</CardTitle>
                <CardDescription>
                  Customers with highest loyalty points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Total Points</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Referrals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((customer, idx) => (
                        <TableRow key={customer._id}>
                          <TableCell className="font-medium">#{idx + 1}</TableCell>
                          <TableCell>{customer.customerId.slice(0, 8)}...</TableCell>
                          <TableCell className="font-semibold">
                            {customer.totalPoints.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTierColor(customer.tier)}>
                              {customer.tier}
                            </Badge>
                          </TableCell>
                          <TableCell>{customer.referralCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Program Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-900">Points Redeemed</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {(stats?.totalPointsRedeemed || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-green-800 mt-2">
                      {stats?.totalPointsIssued
                        ? Math.round(
                            ((stats.totalPointsRedeemed || 0) / stats.totalPointsIssued) * 100
                          )
                        : 0}
                      % redemption rate
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">Active Points</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {(
                        (stats?.totalPointsIssued || 0) - (stats?.totalPointsRedeemed || 0)
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-800 mt-2">
                      Available for redemption
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function getTierColor(tier: string): string {
  switch (tier) {
    case "Gold":
      return "bg-yellow-100 text-yellow-800";
    case "Silver":
      return "bg-gray-100 text-gray-800";
    case "Bronze":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
