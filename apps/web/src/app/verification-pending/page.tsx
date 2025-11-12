"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Phone, Mail, HelpCircle, LogOut, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { user, shop, token, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shopStatus, setShopStatus] = useState(shop?.status);
  const [submittedTime, setSubmittedTime] = useState<Date | null>(null);
  const [expectedTime, setExpectedTime] = useState<Date | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SmartDuka
            </span>
          </div>

          <div>
            <CardTitle className="text-3xl">Verification in Progress</CardTitle>
            <CardDescription className="text-base mt-2">
              Your shop is being reviewed by our team
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Status Card */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Status: Under Review</p>
                <p className="text-sm text-slate-600">Your shop information is being verified</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-yellow-200">
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Submitted</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {submittedTime ? submittedTime.toLocaleDateString() : "Today"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase font-medium">Expected</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {expectedTime ? expectedTime.toLocaleDateString() : "Within 48 hours"}
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              What Happens Next?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Our team reviews your information</p>
                  <p className="text-sm text-slate-600">We verify your business details and documents</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">We validate your shop details</p>
                  <p className="text-sm text-slate-600">This includes business registration and compliance checks</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">You'll receive email notification</p>
                  <p className="text-sm text-slate-600">We'll notify you at <strong>{shop.email}</strong> once verified</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">4</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Full access to SmartDuka</p>
                  <p className="text-sm text-slate-600">Start managing your POS and inventory</p>
                </div>
              </li>
            </ul>
          </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
