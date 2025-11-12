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
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";

interface Reconciliation {
  _id: string;
  reconciliationDate: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
  variancePercentage: number;
  status: "pending" | "reconciled" | "variance_pending";
  reconciledBy: string;
  reconciliationTime: string;
}

export default function ReconciliationPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [formData, setFormData] = useState({
    actualCash: 0,
    reconciliationNotes: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadReconciliations();
    loadStats();
  }, [token, user]);

  const loadReconciliations = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/financial/reconciliation/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load reconciliations");
      const data = await res.json();
      setReconciliations(data);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load reconciliations",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/financial/reconciliation/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load stats", err);
    }
  };

  const handleCreateReconciliation = async () => {
    if (formData.actualCash < 0) {
      toast({
        type: "error",
        title: "Invalid amount",
        message: "Actual cash must be greater than or equal to 0",
      });
      return;
    }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/financial/reconciliation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create reconciliation");

      toast({
        type: "success",
        title: "Reconciliation created",
        message: "Daily reconciliation has been recorded",
      });

      setOpen(false);
      setFormData({
        actualCash: 0,
        reconciliationNotes: "",
      });
      loadReconciliations();
      loadStats();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to create reconciliation",
        message: err?.message,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reconciled":
        return "bg-green-100 text-green-800";
      case "variance_pending":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reconciled":
        return <CheckCircle className="h-4 w-4" />;
      case "variance_pending":
        return <AlertTriangle className="h-4 w-4" />;
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
            You need admin privileges to manage reconciliation
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
            <h1 className="text-3xl font-bold">Financial Reconciliation</h1>
            <p className="text-muted-foreground">
              Daily cash reconciliation and variance tracking
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Reconciliation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daily Reconciliation</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Actual Cash Count *</label>
                  <Input
                    type="number"
                    value={formData.actualCash}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actualCash: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="mt-1"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the actual cash counted
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.reconciliationNotes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reconciliationNotes: e.target.value,
                      })
                    }
                    placeholder="Any notes about the reconciliation..."
                    className="mt-1 min-h-20"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReconciliation}>
                    Record Reconciliation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Reconciliations</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalReconciliations}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Reconciled</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.reconciled}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pending Variances</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.pendingVariances}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Avg Variance</p>
                  <p className="text-2xl font-bold mt-1">
                    Ksh {Math.round(stats.averageVariance).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Loading reconciliations...
              </p>
            </CardContent>
          </Card>
        ) : reconciliations.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No reconciliations yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation History ({reconciliations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Expected Cash</TableHead>
                      <TableHead>Actual Cash</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reconciled By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliations.map((recon) => (
                      <TableRow key={recon._id}>
                        <TableCell>
                          {new Date(recon.reconciliationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          Ksh {recon.expectedCash.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          Ksh {recon.actualCash.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={
                            recon.variance >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          Ksh {recon.variance.toLocaleString()}
                          <span className="text-xs ml-1">
                            ({recon.variancePercentage.toFixed(2)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(recon.status)}>
                            {getStatusIcon(recon.status)}
                            <span className="ml-1">{recon.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {recon.reconciledBy.slice(0, 8)}...
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
