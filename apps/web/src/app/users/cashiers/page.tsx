"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  RefreshCw, 
  Copy, 
  Eye, 
  EyeOff,
  UserPlus,
  Shield,
  Clock,
  Phone,
  Mail,
  MoreVertical,
  Power,
  Key
} from "lucide-react";

interface Cashier {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  cashierId?: string;
  status: "active" | "disabled";
  createdAt: string;
  totalSales?: number;
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
    if (shop?.id && token) {
      fetchCashiers();
    }
  }, [shop?.id, token]);

  const fetchCashiers = async () => {
    if (!shop?.id || !token) {
      return;
    }
    
    try {
      setIsLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${base}/users/shop/${shop.id}/cashiers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch cashiers");

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
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

      const createText = await res.text();
      const createData = createText ? JSON.parse(createText) : {};
      
      if (!res.ok) {
        throw new Error(createData.message || "Failed to create cashier");
      }

      const { user: newCashier, pin } = createData;

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

      const resetText = await res.text();
      const resetData = resetText ? JSON.parse(resetText) : {};
      const { pin } = resetData;

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

  const [pinCopied, setPinCopied] = useState(false);

  const copyPin = () => {
    navigator.clipboard.writeText(generatedPin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  if (!user || !shop) {
    return null;
  }

  const activeCashiers = cashiers.filter(c => c.status === 'active').length;
  const maxCashiers = 5; // Increased limit

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Cashier Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeCashiers} active · {cashiers.length}/{maxCashiers} total
            </p>
          </div>

          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            disabled={cashiers.length >= maxCashiers}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Cashier
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-destructive text-sm flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-destructive hover:text-destructive/80">×</button>
          </div>
        )}

        {/* Add Cashier Form */}
        {showAddForm && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add New Cashier
              </CardTitle>
              <CardDescription>A secure PIN will be auto-generated</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCashier} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. John Kamau"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      placeholder="0712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Cashier
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* PIN Display Modal */}
        {generatedPin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm shadow-2xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Cashier Created!</CardTitle>
                <CardDescription>{generatedCashierName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 p-6 rounded-xl text-center">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Login PIN</p>
                  <p className="text-4xl font-bold tracking-[0.3em] font-mono text-white">{generatedPin}</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Save this PIN securely. It won't be shown again. Share it privately with the cashier.</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={copyPin}
                    variant="outline"
                    className="gap-2"
                  >
                    {pinCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {pinCopied ? 'Copied!' : 'Copy PIN'}
                  </Button>
                  <Button onClick={() => { setGeneratedPin(''); setPinCopied(false); }}>
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cashiers List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cashiers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No cashiers yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first cashier to get started</p>
              <Button onClick={() => setShowAddForm(true)} variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add First Cashier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cashiers.map((cashier) => (
              <Card key={cashier._id} className={cashier.status === 'disabled' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      cashier.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'
                    }`}>
                      {cashier.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">{cashier.name}</h3>
                        {cashier.cashierId && (
                          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-mono rounded">
                            {cashier.cashierId}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cashier.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {cashier.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {cashier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {cashier.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(cashier.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPin(cashier._id, cashier.name)}
                        title="Reset PIN"
                        className="h-8 w-8 p-0"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(cashier._id, cashier.status === "active" ? "disabled" : "active")}
                        title={cashier.status === "active" ? "Disable" : "Enable"}
                        className="h-8 w-8 p-0"
                      >
                        <Power className={`h-4 w-4 ${cashier.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCashier(cashier._id)}
                        title="Delete"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Cashier Security</p>
                <p className="text-muted-foreground text-xs">
                  Each cashier gets a unique 4-digit PIN for quick POS login. PINs are encrypted and can be reset anytime. 
                  Disabled cashiers cannot log in but their sales history is preserved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
