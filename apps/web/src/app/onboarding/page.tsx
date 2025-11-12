"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { Clock, Store, AlertCircle, ShoppingCart } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    businessType: "",
    kraPin: "",
    tillNumber: "",
  });

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }

    // If shop is already verified/active, redirect to dashboard
    if (shop && shop.status === "active") {
      router.push("/");
      return;
    }

    // If shop is pending verification, redirect to verification lobby
    if (shop && shop.status === "pending") {
      router.push("/verification-pending");
      return;
    }

    // If shop is rejected, redirect to rejection page
    if (shop && shop.status === "rejected") {
      router.push("/verification-rejected");
      return;
    }
  }, [user, shop, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Normalize optional fields before sending
      const payload: any = { ...formData };
      if (typeof payload.kraPin === "string") {
        const v = payload.kraPin.trim();
        if (!v) {
          delete payload.kraPin;
        } else {
          payload.kraPin = v.toUpperCase();
        }
      }

      // Update shop details
      const res = await fetch(`${base}/shops/${shop?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update shop" }));
        throw new Error(errorData.message || "Failed to update shop");
      }

      // Complete onboarding
      await fetch(`${base}/shops/${shop?.id}/complete-onboarding`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Redirect to verification lobby
      router.push("/verification-pending");
    } catch (err: any) {
      setError(err.message || "Failed to save shop information");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !shop) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SmartDuka
            </span>
          </div>
          
          <CardTitle className="text-2xl">Complete Your Shop Setup</CardTitle>
          <CardDescription className="text-base">
            Welcome, {shop.name}! Let's finish setting up your shop.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Shop Details Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-red-600 text-sm flex-1">{error}</div>
                </div>
              )}

              <div className="flex items-center gap-2 text-primary mb-4">
                <Store className="h-5 w-5" />
                <h3 className="font-semibold">Shop Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="business-type">Business Type</Label>
                  <Input
                    id="business-type"
                    placeholder="e.g., General Store, Supermarket, Pharmacy"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Nairobi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="till-number">Till Number (Optional)</Label>
                  <Input
                    id="till-number"
                    placeholder="e.g., 001"
                    value={formData.tillNumber}
                    onChange={(e) => setFormData({ ...formData, tillNumber: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address">Physical Address</Label>
                  <Input
                    id="address"
                    placeholder="Shop location/address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="kra-pin">KRA PIN (Optional)</Label>
                  <Input
                    id="kra-pin"
                    placeholder="A000000000X"
                    value={formData.kraPin}
                    onChange={(e) => setFormData({ ...formData, kraPin: e.target.value })}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">For tax compliance and reporting</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Verification Required</p>
                    <p>After submitting, your shop will be reviewed by our team. This usually takes 24-48 hours.</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Saving..." : "Submit for Verification"}
              </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
