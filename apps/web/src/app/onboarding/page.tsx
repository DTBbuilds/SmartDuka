"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Clock, Store, AlertCircle, ShoppingCart, CheckCircle, Info, Shield, Zap, BarChart3 } from "lucide-react";
import { ThemeToggleOutline } from "@/components/theme-toggle";

// Kenya counties for dropdown
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu",
  "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana",
  "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

// Business types for dropdown
const BUSINESS_TYPES = [
  "General Store / Duka",
  "Supermarket",
  "Mini Supermarket",
  "Wholesale Shop",
  "Pharmacy / Chemist",
  "Hardware Store",
  "Electronics Shop",
  "Clothing & Apparel",
  "Grocery Store",
  "Butchery",
  "Bakery",
  "Restaurant / Cafe",
  "Stationery Shop",
  "Mobile Phone Shop",
  "Beauty & Cosmetics",
  "Auto Parts Shop",
  "Agro-Vet Shop",
  "Other"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state - for additional info not collected during registration
  const [formData, setFormData] = useState({
    tillNumber: "",
    description: "",
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
      const base = config.apiUrl;

      // Only send optional fields that have values
      const payload: any = {};
      if (formData.tillNumber.trim()) {
        payload.tillNumber = formData.tillNumber.trim();
      }
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      // Only update if there are changes
      if (Object.keys(payload).length > 0) {
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
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Branding (Dark themed) */}
      <div className="hidden lg:flex lg:w-2/5 bg-slate-900 p-8 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-bold text-white">SmartDuka</span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Almost There!<br />
              <span className="text-primary">Final Step</span>
            </h1>
            <p className="mt-4 text-slate-300">
              Review your details and submit for verification to start using SmartDuka.
            </p>
          </div>
          
          {/* What's Next */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">24-48 hour verification</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Demo access while pending</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Full features on approval</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for Kenyan businesses.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-3/5 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-border bg-muted/50">
          {/* Mobile Logo + Theme Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground lg:hidden">SmartDuka</span>
            </div>
            <ThemeToggleOutline />
          </div>

          <h2 className="text-xl font-bold text-foreground">Review Your Shop Details</h2>
          <p className="text-muted-foreground text-sm">Please review your information before submitting for verification</p>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-red-600 text-sm flex-1">{error}</div>
              </div>
            )}

            {/* Shop Summary - Read Only */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Shop Information (Collected)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Shop Name</p>
                  <p className="font-medium">{shop.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Business Type</p>
                  <p className="font-medium">{(shop as any).businessType || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">County</p>
                  <p className="font-medium">{(shop as any).county || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City/Town</p>
                  <p className="font-medium">{(shop as any).city || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact Email</p>
                  <p className="font-medium">{shop.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">KRA PIN</p>
                  <p className="font-medium">{(shop as any).kraPin || 'Not registered'}</p>
                </div>
              </div>
            </div>

            {/* Additional Optional Info */}
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-5 w-5" />
              <h3 className="font-semibold">Additional Information (Optional)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="till-number">M-Pesa Till Number</Label>
                <Input
                  id="till-number"
                  placeholder="e.g., 123456"
                  value={formData.tillNumber}
                  onChange={(e) => setFormData({ ...formData, tillNumber: e.target.value })}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">For M-Pesa payments integration</p>
              </div>

              <div>
                <Label htmlFor="description">Shop Description</Label>
                <textarea
                  id="description"
                  placeholder="Brief description of your shop..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5 w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Verification Required</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    After submitting, your shop will be reviewed by our team. This usually takes 24-48 hours.
                    You'll receive an email once your shop is verified.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit for Verification"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
