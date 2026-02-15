"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Phone, Mail, LogOut, ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";

export default function VerificationRejectedPage() {
  const router = useRouter();
  const { user, shop, token, logout } = useAuth();
  const [rejectionReason, setRejectionReason] = useState<string>("");

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }

    // If shop is not rejected, redirect appropriately
    if (shop && shop.status === "active") {
      router.push("/");
      return;
    }

    if (shop && shop.status === "pending") {
      router.push("/verification-pending");
      return;
    }

    // Set rejection reason from shop data
    if (shop && shop.status === "rejected") {
      // In production, this would come from shop.rejectionReason
      setRejectionReason(shop.rejectionReason || "Your shop verification was rejected. Please contact support for more details.");
    }
  }, [user, shop, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleContactSupport = () => {
    // Open phone dialer
    window.location.href = "tel:0729983567";
  };

  if (!user || !shop) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-red-200">
        <CardHeader className="text-center space-y-4 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SmartDuka
            </span>
          </div>

          <div>
            <CardTitle className="text-3xl text-red-600">Verification Not Approved</CardTitle>
            <CardDescription className="text-base mt-2">
              Your shop verification was not approved at this time
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-8">
          {/* Rejection Reason */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Reason for Rejection
            </h3>
            <p className="text-slate-700 leading-relaxed">
              {rejectionReason || "Your shop information did not meet our verification requirements. Please review the requirements below and contact support for specific details about your application."}
            </p>
          </div>

          {/* What You Can Do */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">What You Can Do</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Contact our support team</p>
                  <p className="text-sm text-slate-600">Get specific feedback on why your application was rejected</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Review requirements</p>
                  <p className="text-sm text-slate-600">Ensure your business meets all SmartDuka requirements</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Update your information</p>
                  <p className="text-sm text-slate-600">Make necessary changes to your shop details</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">4</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Resubmit your application</p>
                  <p className="text-sm text-slate-600">Contact support to resubmit after making changes</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Verification Requirements */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">SmartDuka Verification Requirements</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Valid business registration or license</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Accurate shop name and location</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Valid contact information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Compliance with local regulations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>No history of fraud or violations</span>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Contact Our Support Team
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Call us</p>
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
                    <a href="mailto:smartdukainfo@gmail.com" className="text-blue-600 hover:underline">
                      smartdukainfo@gmail.com
                    </a>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Response within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleContactSupport}
              className="flex-1"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Support
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
        </CardContent>
      </Card>
    </div>
  );
}
