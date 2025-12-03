"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Phone, Mail, HelpCircle, LogOut, RefreshCw, AlertCircle, CheckCircle, FlaskConical, Play, Sparkles, ShoppingCart, Zap, Shield } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggleOutline } from "@/components/theme-toggle";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { user, shop, token, logout, enterDemoMode, isDemoMode } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shopStatus, setShopStatus] = useState(shop?.status);
  const [submittedTime, setSubmittedTime] = useState<Date | null>(null);
  const [expectedTime, setExpectedTime] = useState<Date | null>(null);

  // Handle entering demo mode
  const handleEnterDemoMode = () => {
    enterDemoMode(shop || undefined);
    router.push("/");
  };

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }

    // If shop is active/verified, redirect to dashboard
    if (shop && shop.status === "active") {
      router.push("/");
      return;
    }

    // If shop is rejected, redirect to rejection page
    if (shop && shop.status === "rejected") {
      router.push("/verification-rejected");
      return;
    }

    // Calculate times
    if (shop && shop.status === "pending") {
      setShopStatus("pending");
      // Assuming shop was just submitted, set submitted time to now
      // In production, this would come from shop.createdAt
      const submitted = new Date();
      setSubmittedTime(submitted);
      
      // Expected time: 24-48 hours from now (use 48 hours for conservative estimate)
      const expected = new Date(submitted.getTime() + 48 * 60 * 60 * 1000);
      setExpectedTime(expected);
    }
  }, [user, shop, router]);

  const handleRefreshStatus = async () => {
    if (!token || !shop) return;
    
    setIsRefreshing(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/shops/${shop.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const updatedShop = await res.json();
        setShopStatus(updatedShop.status);

        // If verified, redirect to dashboard
        if (updatedShop.status === "active") {
          router.push("/");
          return;
        }

        // If rejected, redirect to rejection page
        if (updatedShop.status === "rejected") {
          router.push("/verification-rejected");
          return;
        }
      }
    } catch (err) {
      console.error("Failed to refresh status:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user || !shop) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Status & Demo (Dark themed) */}
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
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-8 w-8 text-primary animate-pulse" />
              <h1 className="text-3xl font-bold text-white">Verification in Progress</h1>
            </div>
            <p className="text-slate-300 text-lg">
              Your shop <strong className="text-primary">{shop?.name}</strong> is being reviewed
            </p>
          </div>
          
          {/* Demo Mode CTA */}
          <div className="bg-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <FlaskConical className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Try Demo Mode!
              </h3>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Explore all SmartDuka features with sample data while you wait.
            </p>
            <Button
              onClick={handleEnterDemoMode}
              size="lg"
              className="w-full font-bold shadow-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Enter Demo Mode
            </Button>
          </div>
          
          {/* Status Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-primary uppercase font-bold">Submitted</p>
              <p className="text-lg font-bold text-white mt-1">
                {submittedTime ? submittedTime.toLocaleDateString() : "Today"}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-primary uppercase font-bold">Expected</p>
              <p className="text-lg font-bold text-white mt-1">
                {expectedTime ? expectedTime.toLocaleDateString() : "Within 48 hours"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for Kenyan businesses.
        </div>
      </div>

      {/* Right Panel - Details */}
      <div className="w-full lg:w-3/5 flex flex-col overflow-hidden bg-background">
        {/* Header with Theme Toggle */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground lg:hidden">SmartDuka</span>
            </div>
            <ThemeToggleOutline />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verification in Progress</h2>
          <p className="text-muted-foreground text-sm">Your shop <strong className="text-primary">{shop?.name}</strong> is being reviewed</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Demo Mode CTA - High Visibility */}
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <FlaskConical className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Try Demo Mode While You Wait!
                </h3>
                <p className="text-white/90 mt-2 text-sm">
                  Explore all SmartDuka features with sample data. Perfect for learning the system before going live.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Full POS system access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Inventory management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Reports & analytics
                  </li>
                </ul>
                <Button
                  onClick={handleEnterDemoMode}
                  size="lg"
                  className="mt-4 bg-yellow-400 text-slate-900 hover:bg-yellow-300 font-bold shadow-lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Enter Demo Mode
                </Button>
              </div>
            </div>
          </div>

          {/* Status Card - High Contrast */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-slate-900">Status: Under Review</p>
                <p className="text-slate-700">Your shop information is being verified by our team</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-blue-200">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-blue-600 uppercase font-bold">Submitted</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {submittedTime ? submittedTime.toLocaleDateString() : "Today"}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-blue-600 uppercase font-bold">Expected</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {expectedTime ? expectedTime.toLocaleDateString() : "Within 48 hours"}
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next - Collapsible */}
          <details className="group border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <summary className="p-4 bg-slate-50 dark:bg-slate-800 cursor-pointer flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                What Happens Next?
              </span>
              <span className="group-open:rotate-180 transition-transform text-slate-400">▼</span>
            </summary>
            <ul className="space-y-3 p-4 bg-white dark:bg-slate-900">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-white">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Our team reviews your information</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">We verify your business details and documents</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-white">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">We validate your shop details</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">This includes business registration and compliance checks</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">You'll receive email notification</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">We'll notify you at <strong className="text-blue-600">{shop.email}</strong> once verified</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-white">4</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Full access to SmartDuka</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Start managing your POS and inventory</p>
                </div>
              </li>
            </ul>
          </details>

          {/* Support Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Need Help?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Call our support team</p>
                  <p className="text-sm text-slate-600">
                    <a href="tel:0729983567" className="text-blue-600 hover:underline font-semibold">
                      0729983567
                    </a>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Mon-Fri, 9 AM - 5 PM EAT</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Email us</p>
                  <p className="text-sm text-slate-600">
                    <a href="mailto:support@smartduka.co.ke" className="text-blue-600 hover:underline">
                      support@smartduka.co.ke
                    </a>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Response within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Frequently Asked Questions
            </h3>
            <div className="space-y-2 text-sm">
              <details className="group border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <summary className="font-medium text-slate-900 flex items-center justify-between">
                  Why does verification take 24-48 hours?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-2">
                  We manually review each shop to ensure compliance with our policies and local regulations. This protects both you and our platform.
                </p>
              </details>
              <details className="group border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <summary className="font-medium text-slate-900 flex items-center justify-between">
                  What if my shop is rejected?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-2">
                  If rejected, we'll provide a detailed reason. You can contact our support team to clarify requirements and resubmit your application.
                </p>
              </details>
              <details className="group border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <summary className="font-medium text-slate-900 flex items-center justify-between">
                  Can I use SmartDuka while verification is pending?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-2">
                  Full features are available after verification. However, you can contact support to request early access for testing purposes.
                </p>
              </details>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleRefreshStatus}
              variant="outline"
              className="flex-1"
              size="lg"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Checking..." : "Refresh Status"}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              You'll be automatically redirected to your dashboard once your shop is verified. You can also check back here anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
