"use client";

import { useEffect, useState } from "react";
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
  Textarea,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Check, X, Eye } from "lucide-react";

interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
}

interface Return {
  _id: string;
  orderId: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedBy: string;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
}

export default function ReturnsPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadReturns();
  }, [token, user]);

  const loadReturns = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/returns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load returns");
      const data = await res.json();
      setReturns(data);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load returns",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    setActionLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/returns/${returnId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvedBy: user?.sub || "unknown",
          approvalNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to approve return");

      const updated = await res.json();
      setReturns(returns.map((r) => (r._id === returnId ? updated : r)));
      setSelectedReturn(null);
      setApprovalNotes("");

      toast({
        type: "success",
        title: "Return approved",
        message: "Return request has been approved",
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to approve return",
        message: err?.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (returnId: string) => {
    setActionLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/returns/${returnId}/reject`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvedBy: user?.sub || "unknown",
          approvalNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject return");

      const updated = await res.json();
      setReturns(returns.map((r) => (r._id === returnId ? updated : r)));
      setSelectedReturn(null);
      setApprovalNotes("");

      toast({
        type: "success",
        title: "Return rejected",
        message: "Return request has been rejected",
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to reject return",
        message: err?.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingReturns = returns.filter((r) => r.status === "pending");

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage returns
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
          <h1 className="text-3xl font-bold">Return Management</h1>
          <p className="text-muted-foreground">
            Review and approve customer return requests
          </p>
        </div>

        {/* Pending Returns Alert */}
        {pendingReturns.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <p className="font-medium text-yellow-900">
                {pendingReturns.length} pending return{pendingReturns.length !== 1 ? "s" : ""} awaiting approval
              </p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading returns...</p>
            </CardContent>
          </Card>
        ) : returns.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No return requests yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Returns</CardTitle>
              <CardDescription>
                {returns.length} return{returns.length !== 1 ? "s" : ""} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Refund Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((returnRequest) => (
                      <TableRow key={returnRequest._id}>
                        <TableCell className="font-medium">
                          {returnRequest.orderId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {returnRequest.items.length} item{returnRequest.items.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="font-semibold">
                          Ksh {returnRequest.totalRefundAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(returnRequest.status)}>
                            {returnRequest.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(returnRequest.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReturn(returnRequest)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Return Details Dialog */}
        {selectedReturn && (
          <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Return Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-2">Items to Return</h3>
                  <div className="space-y-2">
                    {selectedReturn.items.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg border">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × Ksh {item.unitPrice.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Reason: {item.reason}
                            </p>
                          </div>
                          <div className="text-right font-semibold">
                            Ksh {(item.quantity * item.unitPrice).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Refund:</span>
                      <span className="font-bold text-lg">
                        Ksh {selectedReturn.totalRefundAmount.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Status */}
                {selectedReturn.status === "pending" && (
                  <>
                    <Textarea
                      placeholder="Add approval notes (optional)"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="min-h-24"
                    />

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleReject(selectedReturn._id)}
                        disabled={actionLoading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedReturn._id)}
                        disabled={actionLoading}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </>
                )}

                {selectedReturn.status !== "pending" && (
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <p className="text-sm text-muted-foreground">
                      Status: <Badge className={getStatusColor(selectedReturn.status)}>
                        {selectedReturn.status}
                      </Badge>
                    </p>
                    {selectedReturn.approvalNotes && (
                      <p className="text-sm mt-2">Notes: {selectedReturn.approvalNotes}</p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </main>
  );
}
