"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Plus, Trash2, AlertCircle, CheckCircle, Users } from "lucide-react";

interface Cashier {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "disabled";
  createdAt: string;
}

function CashiersContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  // PIN display state
  const [generatedPin, setGeneratedPin] = useState('');
  const [generatedCashierName, setGeneratedCashierName] = useState('');

  useEffect(() => {
    fetchCashiers();
  }, [user, shop, token, router]);

  const fetchCashiers = async () => {
    try {
      setIsLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/shop/${shop?.id}/cashiers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch cashiers");

      const data = await res.json();
      setCashiers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load cashiers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Cashier name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/cashier`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to create cashier" }));
        throw new Error(errorData.message || "Failed to create cashier");
      }

      const { user: newCashier, pin } = await res.json();

      setGeneratedPin(pin);
      setGeneratedCashierName(newCashier.name);

      setFormData({ name: "", phone: "" });
      setShowAddForm(false);
      await fetchCashiers();
    } catch (err: any) {
      setError(err.message || "Failed to add cashier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPin = async (cashierId: string, cashierName: string) => {
    if (!confirm(`Reset PIN for ${cashierName}?`)) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/${cashierId}/reset-pin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to reset PIN");

      const { pin } = await res.json();

      setGeneratedPin(pin);
      setGeneratedCashierName(cashierName);
    } catch (err: any) {
      setError(err.message || "Failed to reset PIN");
    }
  };

  const handleDeleteCashier = async (cashierId: string) => {
    if (!confirm("Are you sure you want to delete this cashier?")) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/${cashierId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete cashier");

      await fetchCashiers();
    } catch (err: any) {
      setError(err.message || "Failed to delete cashier");
    }
  };

  const handleToggleStatus = async (cashierId: string, newStatus: "active" | "disabled") => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/${cashierId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update cashier status");

      await fetchCashiers();
    } catch (err: any) {
      setError(err.message || "Failed to update cashier");
    }
  };

  if (!user || !shop) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Cashier Management
            </h1>
            <p className="text-slate-600 mt-1">Manage cashiers for {shop.name}</p>
          </div>

          <Button onClick={() => setShowAddForm(!showAddForm)} disabled={cashiers.length >= 2}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cashier
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-red-600 text-sm flex-1">{error}</div>
          </div>
        )}

        {/* Cashier Limit Alert */}
        {cashiers.length >= 2 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-800 text-sm">
              <p className="font-medium">Maximum cashiers reached</p>
              <p>You can have up to 2 cashiers per shop. Delete a cashier to add another.</p>
            </div>
          </div>
        )}

        {/* Add Cashier Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Cashier</CardTitle>
              <CardDescription>Create a new cashier account with auto-generated PIN</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCashier} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Cashier name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      placeholder="+254712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-xs text-blue-700">
                    ℹ️ A PIN will be automatically generated for this cashier. You can share it with them after creation.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Cashier"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* PIN Display Modal */}
        {generatedPin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>PIN Created Successfully</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-3">Cashier: {generatedCashierName}</p>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg text-center shadow-lg">
                    <p className="text-xs text-blue-100 mb-3 font-medium">PIN Code</p>
                    <p className="text-5xl font-bold tracking-widest font-mono text-white drop-shadow-lg">{generatedPin}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-xs text-blue-700">
                    ⚠️ Save this PIN securely. It will only be shown once. Share it with the cashier via a secure channel.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPin);
                      alert('PIN copied to clipboard');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Copy PIN
                  </Button>
                  <Button
                    onClick={() => setGeneratedPin('')}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cashiers List */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500">Loading cashiers...</p>
            </CardContent>
          </Card>
        ) : cashiers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500">No cashiers yet. Click "Add Cashier" to create one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cashiers.map((cashier) => (
              <Card key={cashier._id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{cashier.name}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cashier.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cashier.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{cashier.email}</p>
                      {cashier.phone && (
                        <p className="text-sm text-slate-600">{cashier.phone}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Created {new Date(cashier.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPin(cashier._id, cashier.name)}
                      >
                        Reset PIN
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(
                            cashier._id,
                            cashier.status === "active" ? "disabled" : "active"
                          )
                        }
                      >
                        {cashier.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCashier(cashier._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CashiersPage() {
  return (
    <AuthGuard requiredRole="admin" fallbackRoute="/login">
      <CashiersContent />
    </AuthGuard>
  );
}
