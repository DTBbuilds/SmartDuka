"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Input, Label, Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@smartduka/ui";
import { Switch } from "@/components/ui/switch";
import { Store, User, Lock, Settings as SettingsIcon, ShieldAlert, CreditCard, Crown, TrendingUp, Users, Package, Receipt, AlertCircle, Check, Clock, X, Phone, Loader2, Smartphone, ChevronRight, ChevronLeft, Menu, FileText, Calendar, CreditCard as CardIcon, CheckCircle2, XCircle, ArrowRight, Info, Shield, Zap, Eye, Download, RefreshCw, ExternalLink, Copy, Banknote } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useSubscription, useSubscriptionPlans, useBillingHistory, type BillingCycle, type SubscriptionPlan } from "@/hooks/use-subscription";
import { MpesaSettings } from "@/components/settings/mpesa-settings";
import { PaymentConfigs } from "@/components/settings/payment-configs";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { Portal } from "@/components/portal";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading } = useAuth();
  
  // Get initial tab from URL query parameter
  const initialTab = searchParams.get('tab') || 'shop';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update active tab when URL params change (e.g., from redirect)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  // Settings navigation items
  const settingsNavItems = [
    { id: 'shop', label: 'Shop Settings', icon: Store, description: 'Business information' },
    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, description: 'Payment configuration' },
    { id: 'subscription', label: 'Subscription', icon: Crown, description: 'Plan & billing' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
    { id: 'security', label: 'Security', icon: Lock, description: 'Password & access' },
  ];
  
  // Role-based access control - only admin can access settings
  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';
  const isSuperAdmin = user?.role === 'super_admin';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Shop settings
  const [shopData, setShopData] = useState({
    name: "",
    tillNumber: "",
    address: "",
    phone: "",
    email: "",
    taxRate: 16,
    currency: "KES",
  });

  // User profile
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Redirect cashiers away from settings page
  // Super-admins should go to their admin dashboard, not shop settings
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'cashier') {
        router.push('/pos');
      } else if (user.role === 'super_admin') {
        router.push('/super-admin');
      }
    }
  }, [loading, user, router]);

  useEffect(() => {
    fetchShopData();
    if (user) {
      setProfileData({
        name: user.email.split("@")[0], // Fallback
        email: user.email,
        phone: "",
      });
    }
  }, [user]);

  const fetchShopData = async () => {
    try {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const base = config.apiUrl;
      const res = await fetch(`${base}/shops/my-shop`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const text = await res.text();
        if (!text) {
          console.warn("Empty response from /shops/my-shop");
          setIsLoading(false);
          return;
        }

        try {
          const data = JSON.parse(text);
          setShopData({
            name: data.name || "",
            tillNumber: data.tillNumber || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            taxRate: data.taxRate || 16,
            currency: data.currency || "KES",
          });
        } catch (parseError) {
          console.error("Failed to parse shop data:", parseError);
        }
      } else if (res.status === 404) {
        console.warn("Shop endpoint not found");
      } else if (res.status === 401) {
        console.warn("Unauthorized to fetch shop data");
      }
    } catch (error) {
      console.error("Failed to fetch shop data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveShopSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/shops/my-shop`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(shopData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Shop settings saved successfully!" });
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save shop settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const errText = await res.text();
        const data = errText ? JSON.parse(errText) : {};
        throw new Error(data.message || "Failed to change password");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to change password" });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton rows={8} columns={1} />
      </div>
    );
  }

  // Block access for cashiers (fallback while redirect happens)
  if (isCashier) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Settings are only accessible to administrators.
            </p>
            <Button onClick={() => router.push('/pos')}>
              Go to POS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your shop and account settings</p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-md p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile Navigation - Dropdown + Cards */}
        <div className="md:hidden space-y-4">
          {/* Mobile Dropdown Selector */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-14 text-base">
              <SelectValue>
                {(() => {
                  const item = settingsNavItems.find(i => i.id === activeTab);
                  if (!item) return 'Select setting';
                  const Icon = item.icon;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SelectItem key={item.id} value={item.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Mobile Quick Navigation Cards */}
          <div className="grid grid-cols-5 gap-2">
            {settingsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? '' : 'text-muted-foreground'}`} />
                  <span className={`text-[10px] mt-1 font-medium truncate w-full text-center ${isActive ? '' : 'text-muted-foreground'}`}>
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Navigation - Horizontal Tabs */}
        <TabsList className="hidden md:flex flex-wrap h-auto p-1 bg-muted/50">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger 
                key={item.id} 
                value={item.id} 
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>
                Update your shop details and business information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input
                    id="shopName"
                    value={shopData.name}
                    onChange={(e) => setShopData({ ...shopData, name: e.target.value })}
                    placeholder="My Duka"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tillNumber">Till Number</Label>
                  <Input
                    id="tillNumber"
                    value={shopData.tillNumber}
                    onChange={(e) => setShopData({ ...shopData, tillNumber: e.target.value })}
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={shopData.address}
                  onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                  placeholder="123 Main Street, Nairobi"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopPhone">Phone Number</Label>
                  <Input
                    id="shopPhone"
                    type="tel"
                    value={shopData.phone}
                    onChange={(e) => setShopData({ ...shopData, phone: e.target.value })}
                    placeholder="+254 712 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopEmail">Email</Label>
                  <Input
                    id="shopEmail"
                    type="email"
                    value={shopData.email}
                    onChange={(e) => setShopData({ ...shopData, email: e.target.value })}
                    placeholder="shop@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={shopData.taxRate}
                    onChange={(e) =>
                      setShopData({ ...shopData, taxRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={shopData.currency}
                    onChange={(e) => setShopData({ ...shopData, currency: e.target.value })}
                    placeholder="KES"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={saveShopSettings} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mpesa">
          <div className="space-y-8">
            {/* Multiple Payment Configurations */}
            <PaymentConfigs 
              token={token || ''} 
              onMessage={setMessage}
            />
            
            {/* Legacy Single Config (for backward compatibility) */}
            <div className="border-t pt-8">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Legacy Configuration (Deprecated)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This section is kept for backward compatibility. Please use the new configuration system above.
              </p>
              <MpesaSettings 
                token={token || ''} 
                onMessage={setMessage}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionSettingsTab />
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+254 712 345 678"
                />
              </div>

              <div className="pt-4">
                <Button disabled>
                  Save Profile (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4">
                <Button onClick={changePassword} disabled={isSaving}>
                  {isSaving ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Subscription Settings Tab Component
function SubscriptionSettingsTab() {
  const router = useRouter();
  const { subscription, loading: subLoading, changePlan, cancelSubscription, reactivateSubscription, toggleAutoRenew } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { invoices, pendingInvoices, loading: billingLoading, initiatePayment, getPaymentSummary, checkStkStatus } = useBillingHistory();
  const { token } = useAuth();
  
  // Stripe payment hook
  const { 
    isConfigured: stripeConfigured, 
    createSubscriptionPayment, 
    clientSecret: stripeClientSecret,
    reset: resetStripe,
    isLoading: stripeLoading 
  } = useStripePayment();
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'phone' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa-stk' | 'mpesa-send' | 'card'>('mpesa-stk');
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'plans' | 'confirm' | 'payment'>('plans');
  const [sendMoneyStep, setSendMoneyStep] = useState<'instructions' | 'verify'>('instructions');
  const [referenceCode, setReferenceCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  
  // M-Pesa payment phase tracking
  const [mpesaPhase, setMpesaPhase] = useState<'sending' | 'waiting_prompt' | 'waiting_pin' | 'processing' | 'verifying'>('sending');
  const [mpesaTimeRemaining, setMpesaTimeRemaining] = useState(120); // 2 minutes
  const [mpesaError, setMpesaError] = useState<{ 
    title: string; 
    message: string; 
    suggestion: string;
    icon: 'wallet' | 'phone' | 'cancel' | 'pin' | 'clock' | 'error';
    code?: number; 
    canRetry: boolean 
  } | null>(null);
  const [stkSentTime, setStkSentTime] = useState<number | null>(null);
  
  // Stripe payment state
  const [stripePaymentClientSecret, setStripePaymentClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [creatingStripePayment, setCreatingStripePayment] = useState(false);

  const loading = subLoading || plansLoading || billingLoading;

  // Plan color themes - minimalistic with consistent slate/primary palette
  const planColors: Record<string, { bg: string; border: string; badge: string; iconBg: string; iconColor: string; headerGradient: string }> = {
    blue: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-primary', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300', headerGradient: 'from-slate-700 to-slate-800' },
    green: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-primary', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300', headerGradient: 'from-slate-700 to-slate-800' },
    purple: { bg: 'bg-white dark:bg-slate-900', border: 'border-primary', badge: 'bg-primary', iconBg: 'bg-primary/10', iconColor: 'text-primary', headerGradient: 'from-primary to-primary/80' },
    gold: { bg: 'bg-white dark:bg-slate-900', border: 'border-amber-400 dark:border-amber-500', badge: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400', headerGradient: 'from-amber-500 to-amber-600' },
    gray: { bg: 'bg-slate-50 dark:bg-slate-900/50', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-500', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', headerGradient: 'from-slate-500 to-slate-600' },
    orange: { bg: 'bg-white dark:bg-slate-900', border: 'border-orange-400 dark:border-orange-500', badge: 'bg-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400', headerGradient: 'from-orange-500 to-orange-600' },
  };

  // Status colors - high contrast
  const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    trial: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', icon: <Clock className="h-4 w-4" /> },
    active: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', icon: <Check className="h-4 w-4" /> },
    past_due: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', icon: <AlertCircle className="h-4 w-4" /> },
    suspended: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', icon: <AlertCircle className="h-4 w-4" /> },
    cancelled: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <X className="h-4 w-4" /> },
    expired: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', icon: <Clock className="h-4 w-4" /> },
  };

  const handleAutoRenewToggle = async (enabled: boolean) => {
    setAutoRenewLoading(true);
    try {
      const result = await toggleAutoRenew(enabled);
      // Show success feedback (could use toast here)
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAutoRenewLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!subscription) return;
    setProcessing(true);
    try {
      // For daily plans, use 'daily' billing cycle; otherwise use selected cycle
      const effectiveBillingCycle = plan.code === 'daily' ? 'daily' : billingCycle;
      const result = await changePlan(plan.code, effectiveBillingCycle);
      
      // Check if payment is required (upgrade to paid plan)
      if (result.requiresPayment && result.pendingUpgrade) {
        // Close upgrade modal and show payment modal
        setShowUpgradeModal(false);
        setSelectedPlan(null);
        
        // Set up payment for the upgrade invoice
        setSelectedInvoiceData({
          id: result.invoiceId,
          invoiceNumber: result.pendingUpgrade.invoiceNumber,
          totalAmount: result.pendingUpgrade.price,
          description: `Upgrade to ${result.pendingUpgrade.planName} Plan`,
          status: 'pending',
        });
        setSelectedInvoice(result.invoiceId || null);
        setShowPaymentModal(true);
        setPaymentStep('phone');
        
        // Fetch payment summary for the upgrade invoice
        if (result.invoiceId) {
          try {
            const summary = await getPaymentSummary(result.invoiceId);
            setPaymentSummary(summary);
          } catch (error) {
            console.error('Failed to get payment summary:', error);
          }
        }
      } else {
        // Downgrade completed immediately
        setShowUpgradeModal(false);
        setSelectedPlan(null);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Open invoice details modal
  const openInvoiceDetails = async (invoice: any) => {
    setSelectedInvoiceData(invoice);
    setSelectedInvoice(invoice.id);
    setShowInvoiceDetails(true);
    setPaymentStep('details');
    
    // Fetch payment summary
    try {
      const summary = await getPaymentSummary(invoice.id);
      setPaymentSummary(summary);
    } catch (error) {
      console.error('Failed to get payment summary:', error);
    }
  };

  // Start payment flow
  const startPaymentFlow = () => {
    setShowInvoiceDetails(false);
    setShowPaymentModal(true);
    setPaymentStep('phone');
  };

  // Handle M-Pesa payment with enhanced phase tracking
  const handlePayment = async () => {
    if (!selectedInvoice || !phoneNumber) return;
    setProcessing(true);
    setPaymentStep('processing');
    setMpesaPhase('sending');
    setMpesaError(null);
    setMpesaTimeRemaining(120);
    
    try {
      const result = await initiatePayment(selectedInvoice, phoneNumber);
      if (result.success) {
        setCheckoutRequestId(result.checkoutRequestId || null);
        setStkSentTime(Date.now());
        setMpesaPhase('waiting_prompt');
        
        // Start countdown timer
        startMpesaCountdown();
        
        // Poll for status
        if (result.checkoutRequestId) {
          pollPaymentStatus(result.checkoutRequestId);
        }
      } else {
        setMpesaError({ 
          title: 'Could Not Send Request',
          message: result.message || 'We couldn\'t send the payment request to your phone.',
          suggestion: 'Check your phone number and try again',
          icon: 'phone',
          canRetry: true 
        });
        setPaymentStep('phone');
      }
    } catch (error: any) {
      setMpesaError({ 
        title: 'Connection Problem',
        message: 'We couldn\'t connect to M-Pesa right now.',
        suggestion: 'Check your internet connection and try again',
        icon: 'error',
        canRetry: true 
      });
      setPaymentStep('phone');
    } finally {
      setProcessing(false);
    }
  };

  // Start M-Pesa countdown timer
  const startMpesaCountdown = () => {
    const startTime = Date.now();
    const duration = 120; // 2 minutes
    
    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setMpesaTimeRemaining(remaining);
      
      // Update phase based on elapsed time
      if (elapsed < 10) {
        setMpesaPhase('waiting_prompt');
      } else if (elapsed < 70) {
        setMpesaPhase('waiting_pin');
      } else {
        setMpesaPhase('processing');
      }
      
      if (remaining > 0 && paymentStep === 'processing') {
        setTimeout(updateCountdown, 1000);
      }
    };
    
    updateCountdown();
  };

  // Get user-friendly M-Pesa error message from result code
  const getMpesaErrorInfo = (resultCode: number, resultDesc?: string): { 
    title: string; 
    message: string; 
    suggestion: string;
    icon: 'wallet' | 'phone' | 'cancel' | 'pin' | 'clock' | 'error';
    code: number; 
    canRetry: boolean 
  } => {
    const errorMap: Record<number, { title: string; message: string; suggestion: string; icon: 'wallet' | 'phone' | 'cancel' | 'pin' | 'clock' | 'error'; canRetry: boolean }> = {
      1: { 
        title: 'Not Enough Balance',
        message: 'Your M-Pesa account doesn\'t have enough money for this payment.',
        suggestion: 'Top up your M-Pesa and try again',
        icon: 'wallet',
        canRetry: true 
      },
      1001: { 
        title: 'Please Wait a Moment',
        message: 'You have another M-Pesa transaction in progress.',
        suggestion: 'Wait 2-3 minutes, then try again',
        icon: 'clock',
        canRetry: true 
      },
      1019: {
        title: 'Request Expired',
        message: 'The payment request took too long.',
        suggestion: 'Try again and respond to the prompt quickly',
        icon: 'clock',
        canRetry: true
      },
      1025: {
        title: 'Connection Problem',
        message: 'We couldn\'t send the payment request to your phone.',
        suggestion: 'Check your network and try again',
        icon: 'phone',
        canRetry: true
      },
      1032: { 
        title: 'Payment Cancelled',
        message: 'You cancelled the payment or didn\'t respond in time.',
        suggestion: 'Try again when you\'re ready',
        icon: 'cancel',
        canRetry: true 
      },
      1037: { 
        title: 'Phone Not Reachable',
        message: 'We couldn\'t reach your phone. It may be off or have no signal.',
        suggestion: 'Make sure your phone is on with network, then try again',
        icon: 'phone',
        canRetry: true 
      },
      2001: { 
        title: 'Wrong PIN Entered',
        message: 'The M-Pesa PIN you entered was incorrect.',
        suggestion: 'Try again and enter the correct 4-digit PIN',
        icon: 'pin',
        canRetry: true 
      },
    };
    
    const info = errorMap[resultCode] || { 
      title: 'Payment Unsuccessful',
      message: 'Something went wrong with your payment.',
      suggestion: 'Please try again or use a different payment method',
      icon: 'error' as const,
      canRetry: true 
    };
    
    return { ...info, code: resultCode };
  };

  // Poll payment status with enhanced error handling
  // Uses 5-second intervals to avoid rate limiting (429 errors)
  const pollPaymentStatus = async (checkoutId: string) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes with 5-second intervals
    const pollInterval = 5000; // 5 seconds between polls
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setMpesaError({ 
          title: 'Request Timed Out',
          message: 'We didn\'t receive a response in time.',
          suggestion: 'Check your M-Pesa messages. If you paid, contact support. Otherwise, try again.',
          icon: 'clock',
          canRetry: true 
        });
        setPaymentStep('phone');
        return;
      }
      
      try {
        // Only show verifying phase after initial waiting period
        if (attempts > 2) {
          setMpesaPhase('verifying');
        }
        const status = await checkStkStatus(checkoutId);
        
        if (status.success && status.resultCode === 0) {
          setPaymentStep('success');
          return;
        } else if (status.resultCode && status.resultCode !== 0) {
          const errorInfo = getMpesaErrorInfo(status.resultCode, status.resultDesc);
          setMpesaError(errorInfo);
          setPaymentStep('phone');
          return;
        }
      } catch (error) {
        // Continue polling on network errors
      }
      
      attempts++;
      setTimeout(poll, pollInterval);
    };
    
    // Start polling after initial delay (give M-Pesa time to process)
    setTimeout(poll, 3000);
  };

  // Reset payment modal
  const resetPaymentModal = () => {
    setShowPaymentModal(false);
    setShowInvoiceDetails(false);
    setSelectedInvoice(null);
    setSelectedInvoiceData(null);
    setPhoneNumber('');
    setPaymentStep('details');
    setPaymentSummary(null);
    setCheckoutRequestId(null);
    setSendMoneyStep('instructions');
    setMpesaPhase('sending');
    setMpesaTimeRemaining(120);
    setMpesaError(null);
    setStkSentTime(null);
    setReferenceCode('');
    setVerifyingCode(false);
    // Reset Stripe state
    setStripePaymentClientSecret(null);
    setStripeError(null);
    setCreatingStripePayment(false);
    resetStripe();
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get total pending amount
  const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Check if subscription is valid (not null and has required fields)
  const hasValidSubscription = subscription && subscription.status && subscription.planCode;

  return (
    <div className="space-y-6">
      {/* Current Subscription Card - Modern Design */}
      {hasValidSubscription ? (
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${planColors[subscription.planCode === 'trial' ? 'gray' : subscription.planCode === 'daily' ? 'orange' : subscription.planCode === 'starter' ? 'blue' : subscription.planCode === 'professional' ? 'green' : subscription.planCode === 'business' ? 'purple' : 'gold']?.headerGradient || 'from-primary to-primary/80'} px-6 py-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{subscription.planName} Plan</h2>
                  <p className="text-white/80 flex items-center gap-2 mt-1">
                    {subscription.planCode === 'trial' ? (
                      <span className="text-lg font-semibold">FREE</span>
                    ) : subscription.planCode === 'daily' ? (
                      <>
                        <span className="text-lg font-semibold">KES 99</span>
                        <span className="text-white/60">/ day</span>
                        {subscription.numberOfDays && (
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium ml-2">
                            {subscription.numberOfDays} days
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-semibold">KES {(subscription.currentPrice || 0).toLocaleString()}</span>
                        <span className="text-white/60">/ {subscription.billingCycle === 'annual' ? 'year' : 'month'}</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium ml-2">
                          {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold shadow-lg whitespace-nowrap ${
                  subscription.status === 'active' ? 'bg-white text-emerald-700' :
                  subscription.status === 'trial' ? 'bg-white text-blue-700' :
                  subscription.status === 'past_due' ? 'bg-amber-100 text-amber-800' :
                  'bg-white/20 text-white'
                }`}>
                  {statusColors[subscription.status]?.icon}
                  <span className="hidden xs:inline">{(subscription.status || 'unknown').replace('_', ' ').toUpperCase()}</span>
                  <span className="xs:hidden">{(subscription.status || '?').charAt(0).toUpperCase()}</span>
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Period Info - Mobile optimized */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 mb-1 sm:mb-2">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Started</span>
                </div>
                <p className="text-sm sm:text-lg font-bold">{new Date(subscription.startDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: '2-digit' })}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 mb-1 sm:mb-2">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Ends</span>
                </div>
                <p className="text-sm sm:text-lg font-bold">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: '2-digit' })}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-100 dark:border-amber-800">
                <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 mb-1 sm:mb-2">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
                    {subscription.billingCycle === 'daily' ? 'Time Left' : 'Days Left'}
                  </span>
                </div>
                {subscription.billingCycle === 'daily' ? (
                  <p className="text-sm sm:text-lg font-bold">
                    {(() => {
                      const hoursLeft = Math.max(0, Math.floor((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60)));
                      const minutesLeft = Math.max(0, Math.floor(((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) % (1000 * 60 * 60)) / (1000 * 60)));
                      if (hoursLeft > 0) {
                        return <>{hoursLeft}<span className="text-xs sm:text-sm font-normal text-muted-foreground">h {minutesLeft}m</span></>;
                      }
                      return <>{minutesLeft}<span className="text-xs sm:text-sm font-normal text-muted-foreground"> min</span></>;
                    })()}
                  </p>
                ) : (
                  <p className="text-sm sm:text-lg font-bold">{subscription.daysRemaining} <span className="text-xs sm:text-sm font-normal text-muted-foreground">days</span></p>
                )}
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-violet-100 dark:border-violet-800">
                <div className="flex items-center gap-1.5 sm:gap-2 text-violet-600 mb-1 sm:mb-2">
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${autoRenewLoading ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">Auto-Renew</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-medium ${subscription.autoRenew ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {subscription.autoRenew ? 'On' : 'Off'}
                  </span>
                  <Switch
                    checked={subscription.autoRenew}
                    onCheckedChange={handleAutoRenewToggle}
                    disabled={autoRenewLoading || subscription.status === 'cancelled'}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>
              </div>
            </div>

            {/* Usage Stats - Mobile optimized */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-sm sm:text-lg font-semibold">Resource Usage</h4>
                <span className="text-[10px] sm:text-sm text-muted-foreground">Current period</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl p-3 sm:p-5 text-white shadow-lg shadow-blue-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-fit mb-1 sm:mb-0">
                      <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span className="text-xl sm:text-3xl font-bold">{subscription.usage.shops.current}<span className="text-sm sm:text-lg font-normal text-white/70">/{subscription.usage.shops.limit}</span></span>
                  </div>
                  <p className="text-white/80 text-[10px] sm:text-sm font-medium mb-1.5 sm:mb-2">Shops</p>
                  <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.shops.current / subscription.usage.shops.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl p-3 sm:p-5 text-white shadow-lg shadow-emerald-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-fit mb-1 sm:mb-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span className="text-xl sm:text-3xl font-bold">{subscription.usage.employees.current}<span className="text-sm sm:text-lg font-normal text-white/70">/{subscription.usage.employees.limit}</span></span>
                  </div>
                  <p className="text-white/80 text-[10px] sm:text-sm font-medium mb-1.5 sm:mb-2">Staff</p>
                  <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.employees.current / subscription.usage.employees.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg sm:rounded-xl p-3 sm:p-5 text-white shadow-lg shadow-violet-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg w-fit mb-1 sm:mb-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span className="text-xl sm:text-3xl font-bold">{subscription.usage.products.current.toLocaleString()}<span className="text-sm sm:text-lg font-normal text-white/70">/{subscription.usage.products.limit.toLocaleString()}</span></span>
                  </div>
                  <p className="text-white/80 text-[10px] sm:text-sm font-medium mb-1.5 sm:mb-2">Items</p>
                  <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.products.current / subscription.usage.products.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 h-11 sm:h-10 text-sm sm:text-base touch-manipulation"
              >
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Upgrade Plan
              </Button>
              {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                <Button variant="outline" className="h-11 sm:h-10 text-sm sm:text-base touch-manipulation" onClick={() => reactivateSubscription()}>
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Reactivate
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="text-muted-foreground hover:text-destructive hover:border-destructive h-11 sm:h-10 text-sm sm:text-base touch-manipulation"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
                      cancelSubscription('User requested cancellation');
                    }
                  }}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-12 text-center">
            <div className="p-4 bg-white rounded-2xl shadow-lg inline-block mb-4">
              <Crown className="h-12 w-12 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground mb-4">Choose a plan to get started with SmartDuka</p>
            <Button onClick={() => setShowUpgradeModal(true)} size="lg" className="bg-gradient-to-r from-primary to-primary/80">
              <Crown className="h-5 w-5 mr-2" />
              View Plans
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Invoices - Simplified Summary */}
      {pendingInvoices.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                  <AlertCircle className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Payment Required</h3>
                  <p className="text-amber-700 dark:text-amber-300">
                    {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-700 dark:text-amber-300">Total Due</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">KES {totalPendingAmount.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Show first 3 invoices as preview */}
            {pendingInvoices.length > 0 && (
              <div className="mt-4 space-y-2">
                {pendingInvoices.slice(0, 3).map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-white/60 dark:bg-white/10 rounded-lg cursor-pointer hover:bg-white/80 dark:hover:bg-white/20 transition-colors"
                    onClick={() => openInvoiceDetails(invoice)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{invoice.description}</span>
                    </div>
                    <span className="font-bold">KES {invoice.totalAmount.toLocaleString()}</span>
                  </div>
                ))}
                {pendingInvoices.length > 3 && (
                  <p className="text-center text-sm text-amber-700 dark:text-amber-300">
                    +{pendingInvoices.length - 3} more invoices
                  </p>
                )}
              </div>
            )}
            
            <div className="mt-4 flex gap-3">
              <Button 
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => openInvoiceDetails(pendingInvoices[0])}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
              <Button 
                variant="outline"
                className="border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={() => router.push('/settings/invoices')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View All Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Billing & Invoices - Mobile optimized */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Invoices Card */}
        <Card className="shadow-md hover:shadow-lg active:shadow-md transition-shadow cursor-pointer group touch-manipulation" onClick={() => router.push('/settings/invoices')}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-lg">Invoices</h3>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{invoices.length} total</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-2 sm:mt-4 flex gap-2 sm:gap-4 text-[10px] sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" />
                <span>{pendingInvoices.length} pending</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                <span>{invoices.filter(i => i.status === 'paid').length} paid</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History Card */}
        <Card className="shadow-md hover:shadow-lg active:shadow-md transition-shadow cursor-pointer group touch-manipulation" onClick={() => router.push('/settings/billing')}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg sm:rounded-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
                  <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-lg">Billing</h3>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Receipts</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-2 sm:mt-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                Paid: <span className="font-bold text-emerald-600">KES {invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Modal - Redesigned Compact & Appealing */}
      {showUpgradeModal && (
        <Portal>
        <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md flex items-start sm:items-center justify-center z-[100] overflow-y-auto overscroll-contain">
          <div className="bg-background w-full sm:w-[95%] sm:max-w-3xl sm:rounded-xl shadow-2xl overflow-hidden min-h-screen sm:min-h-0 sm:my-4 sm:mx-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {upgradeStep === 'plans' ? 'Choose Your Plan' : upgradeStep === 'confirm' ? 'Confirm Selection' : 'Payment'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {upgradeStep === 'plans' ? 'Select the plan that fits your business' : upgradeStep === 'confirm' ? 'Review your selection before payment' : 'Complete your subscription'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUpgradeModal(false); setSelectedPlan(null); setUpgradeStep('plans'); }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-center gap-2">
                {['plans', 'confirm', 'payment'].map((step, idx) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      upgradeStep === step ? 'bg-primary text-white' :
                      ['plans', 'confirm', 'payment'].indexOf(upgradeStep) > idx ? 'bg-emerald-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {['plans', 'confirm', 'payment'].indexOf(upgradeStep) > idx ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>
                    <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${upgradeStep === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step === 'plans' ? 'Plan' : step === 'confirm' ? 'Confirm' : 'Pay'}
                    </span>
                    {idx < 2 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5">
              {/* Step 1: Plan Selection */}
              {upgradeStep === 'plans' && (
                <div className="space-y-4">
                  {/* Billing Toggle - Compact */}
                  <div className="flex items-center justify-center gap-3 pb-3">
                    <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
                    <button
                      onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${billingCycle === 'annual' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">-17%</span>
                  </div>

                  {/* Plans Grid - Compact Cards */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                    {plans.map((plan) => {
                      const isCurrentPlan = subscription?.planCode === plan.code;
                      const isPopular = plan.badge === 'Popular';
                      const isBestValue = plan.badge === 'Best Value';
                      const isFlexible = plan.badge === 'Flexible';
                      const isTrial = plan.code === 'trial';
                      const isDaily = plan.code === 'daily';
                      
                      // Calculate price based on plan type
                      let price: number;
                      let priceLabel: string;
                      if (isTrial) {
                        price = 0;
                        priceLabel = '';
                      } else if (isDaily) {
                        price = plan.dailyPrice || 99;
                        priceLabel = '/day';
                      } else {
                        price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                        priceLabel = billingCycle === 'annual' ? '/yr' : '/mo';
                      }

                      return (
                        <div
                          key={plan.code}
                          onClick={() => !isCurrentPlan && setSelectedPlan(plan)}
                          className={`relative rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                            selectedPlan?.code === plan.code ? 'ring-2 ring-primary border-primary bg-primary/5' :
                            isCurrentPlan ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' :
                            isPopular ? 'border-primary/50' : 
                            isBestValue ? 'border-amber-300' : 
                            isFlexible ? 'border-orange-300' :
                            'border-border hover:border-primary/30'
                          } ${isCurrentPlan ? 'cursor-default' : ''}`}
                        >
                          {/* Badge */}
                          {(plan.badge || isCurrentPlan) && (
                            <div className={`absolute -top-2 left-3 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded ${
                              isCurrentPlan ? 'bg-emerald-500 text-white' :
                              isPopular ? 'bg-primary text-white' :
                              isBestValue ? 'bg-amber-500 text-white' :
                              isFlexible ? 'bg-orange-500 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {isCurrentPlan ? 'Current' : plan.badge}
                            </div>
                          )}

                          {/* Info Icon - Click for details */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailPlan(plan); setShowPlanDetails(true); }}
                            className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full"
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>

                          <h4 className="font-bold text-sm sm:text-base mt-1">{plan.name}</h4>
                          
                          <div className="mt-1 mb-2">
                            {isTrial ? (
                              <span className="text-lg sm:text-xl font-bold text-emerald-600">FREE</span>
                            ) : (
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">KES</span>
                                <span className={`text-lg sm:text-xl font-bold ${isDaily ? 'text-orange-600' : ''}`}>{price.toLocaleString()}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">{priceLabel}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Store className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span>{plan.maxShops} shop{plan.maxShops > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span>{plan.maxEmployees} staff</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span>{plan.maxProducts.toLocaleString()} items</span>
                            </div>
                          </div>

                          {/* Selection indicator */}
                          {selectedPlan?.code === plan.code && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Continue Button */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowUpgradeModal(false); setSelectedPlan(null); }}>
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1" 
                      disabled={!selectedPlan || subscription?.planCode === selectedPlan?.code}
                      onClick={() => setUpgradeStep('confirm')}
                    >
                      Continue
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Confirmation */}
              {upgradeStep === 'confirm' && selectedPlan && (
                <div className="space-y-4 sm:space-y-5">
                  {/* Selected Plan Summary */}
                  <div className="bg-muted/50 rounded-xl p-4 sm:p-5 border">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-lg sm:text-xl">{selectedPlan.name} Plan</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription ? `Switching from ${subscription.planName}` : 'New subscription'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <div className={`text-2xl sm:text-3xl font-bold ${selectedPlan.code === 'daily' ? 'text-orange-600' : 'text-primary'}`}>
                          {selectedPlan.monthlyPrice === 0 ? 'FREE' : 
                           selectedPlan.code === 'daily' ? `KES ${(selectedPlan.dailyPrice || 99).toLocaleString()}` :
                           `KES ${(billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString()}`}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {selectedPlan.code === 'daily' ? 'per day' : 
                           selectedPlan.monthlyPrice > 0 && (billingCycle === 'annual' ? 'per year' : 'per month')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t">
                      <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                        <Store className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary" />
                        <p className="text-base sm:text-lg font-bold mt-1">{selectedPlan.maxShops}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Shops</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary" />
                        <p className="text-base sm:text-lg font-bold mt-1">{selectedPlan.maxEmployees}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Staff</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary" />
                        <p className="text-base sm:text-lg font-bold mt-1">{selectedPlan.maxProducts.toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Products</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection (for paid plans) */}
                  {selectedPlan.monthlyPrice > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm sm:text-base font-semibold">Select Payment Method</h5>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('mpesa-stk')}
                          className={`p-3 sm:p-4 rounded-xl border text-center transition-all active:scale-95 touch-manipulation ${
                            paymentMethod === 'mpesa-stk' ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm' : 'border-border hover:border-primary/30 active:bg-muted'
                          }`}
                        >
                          <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 mx-auto text-emerald-600" />
                          <p className="text-xs sm:text-sm font-medium mt-1.5">M-Pesa</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">STK Push</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('mpesa-send')}
                          className={`p-3 sm:p-4 rounded-xl border text-center transition-all active:scale-95 touch-manipulation ${
                            paymentMethod === 'mpesa-send' ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm' : 'border-border hover:border-primary/30 active:bg-muted'
                          }`}
                        >
                          <Banknote className="h-6 w-6 sm:h-7 sm:w-7 mx-auto text-emerald-600" />
                          <p className="text-xs sm:text-sm font-medium mt-1.5">Send Money</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Manual</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`p-3 sm:p-4 rounded-xl border text-center transition-all active:scale-95 touch-manipulation ${
                            paymentMethod === 'card' ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm' : 'border-border hover:border-primary/30 active:bg-muted'
                          }`}
                        >
                          <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 mx-auto text-blue-600" />
                          <p className="text-xs sm:text-sm font-medium mt-1.5">Card</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Visa/MC</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Features Preview */}
                  {selectedPlan.features && selectedPlan.features.length > 0 && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-2">FEATURES INCLUDED</h5>
                      <div className="grid grid-cols-2 gap-1">
                        {selectedPlan.features.slice(0, 6).map((feature: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                            <span className="truncate">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Fixed at bottom on mobile for better UX */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-3 border-t sm:border-t-0 mt-auto">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1 h-12 sm:h-11 text-base sm:text-sm touch-manipulation" 
                      onClick={() => setUpgradeStep('plans')}
                    >
                      <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4 mr-1" />
                      Back
                    </Button>
                    <Button 
                      type="button"
                      className="flex-1 h-14 sm:h-11 text-base sm:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800 text-white shadow-lg shadow-emerald-500/25 touch-manipulation" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!processing && selectedPlan) {
                          handleUpgrade(selectedPlan);
                        }
                      }}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin mr-2" />
                      ) : selectedPlan.monthlyPrice === 0 ? (
                        <Check className="h-5 w-5 sm:h-4 sm:w-4 mr-1" />
                      ) : (
                        <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4 mr-1" />
                      )}
                      {selectedPlan.monthlyPrice === 0 ? 'Activate Free Plan' : 'Continue to Payment'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Plan Details Modal */}
      {showPlanDetails && detailPlan && (
        <Portal>
        <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4 overflow-y-auto overscroll-contain">
          <div className="bg-background rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`bg-gradient-to-r ${planColors[detailPlan.colorTheme || 'blue']?.headerGradient || 'from-primary to-primary/80'} px-5 py-4 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{detailPlan.name} Plan</h3>
                  <p className="text-white/80 text-sm">{detailPlan.description || 'Full plan details'}</p>
                </div>
                <button 
                  onClick={() => { setShowPlanDetails(false); setDetailPlan(null); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Pricing */}
              <div className="text-center pb-4 border-b">
                {detailPlan.monthlyPrice === 0 ? (
                  <div className="text-3xl font-bold text-emerald-600">FREE</div>
                ) : (
                  <div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">KES</span>
                      <span className="text-3xl font-bold">{detailPlan.monthlyPrice.toLocaleString()}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      or KES {detailPlan.annualPrice.toLocaleString()}/year (save 17%)
                    </p>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Store className="h-5 w-5 mx-auto text-primary" />
                  <p className="text-lg font-bold mt-1">{detailPlan.maxShops}</p>
                  <p className="text-xs text-muted-foreground">Shops</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-primary" />
                  <p className="text-lg font-bold mt-1">{detailPlan.maxEmployees}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Package className="h-5 w-5 mx-auto text-primary" />
                  <p className="text-lg font-bold mt-1">{detailPlan.maxProducts.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>

              {/* All Features */}
              {detailPlan.features && detailPlan.features.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold mb-2">All Features</h5>
                  <ul className="space-y-2">
                    {detailPlan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Setup Includes */}
              {detailPlan.setupIncludes && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Setup Includes</h5>
                  <ul className="space-y-1">
                    {detailPlan.setupIncludes.siteSurvey && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        Site Survey
                      </li>
                    )}
                    {detailPlan.setupIncludes.stocktake && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        Stocktake
                      </li>
                    )}
                    {detailPlan.setupIncludes.setup && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        System Setup
                      </li>
                    )}
                    {detailPlan.setupIncludes.training && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        Training
                      </li>
                    )}
                    {detailPlan.setupIncludes.support && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        Support
                      </li>
                    )}
                    {detailPlan.setupIncludes.freeMonths && detailPlan.setupIncludes.freeMonths > 0 && (
                      <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Check className="h-3.5 w-3.5" />
                        {detailPlan.setupIncludes.freeMonths} Free Month{detailPlan.setupIncludes.freeMonths > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Select Button */}
              <Button 
                className="w-full"
                onClick={() => {
                  setSelectedPlan(detailPlan);
                  setShowPlanDetails(false);
                  setDetailPlan(null);
                }}
                disabled={subscription?.planCode === detailPlan.code}
              >
                {subscription?.planCode === detailPlan.code ? 'Current Plan' : 'Select This Plan'}
              </Button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Invoice Details Modal - Compact & Desktop Friendly */}
      {showInvoiceDetails && selectedInvoiceData && (
        <Portal>
        <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto overscroll-contain">
          <div className="bg-background rounded-xl w-full max-w-lg lg:max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Invoice Details</h3>
                    <p className="text-white/80 text-sm font-mono">{selectedInvoiceData.invoiceNumber}</p>
                  </div>
                </div>
                <button 
                  onClick={resetPaymentModal}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content - Compact layout */}
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column - Invoice Details */}
                <div className="space-y-4">
                  {/* Invoice Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-semibold text-right">{selectedInvoiceData.description}</span>
                    </div>
                    {selectedInvoiceData.periodStart && selectedInvoiceData.periodEnd && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Period</span>
                        <span className="text-sm">{formatDate(selectedInvoiceData.periodStart)} - {formatDate(selectedInvoiceData.periodEnd)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-medium">{formatDate(selectedInvoiceData.dueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        selectedInvoiceData.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedInvoiceData.status === 'paid' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                        {selectedInvoiceData.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Info (if paid) */}
                  {selectedInvoiceData.status === 'paid' && selectedInvoiceData.mpesaReceiptNumber && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-emerald-800 mb-3">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Payment Confirmed</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-700">M-Pesa Receipt</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base">{selectedInvoiceData.mpesaReceiptNumber}</span>
                            <button 
                              onClick={() => copyToClipboard(selectedInvoiceData.mpesaReceiptNumber)}
                              className="p-1.5 hover:bg-emerald-200 rounded-lg transition-colors"
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {selectedInvoiceData.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-emerald-700">Paid On</span>
                            <span>{formatDate(selectedInvoiceData.paidAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Amount & Actions */}
                <div className="space-y-4">
                  {/* Amount Breakdown */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b">
                      <h4 className="font-semibold text-sm">Amount Breakdown</h4>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">KES {selectedInvoiceData.amount?.toLocaleString() || selectedInvoiceData.totalAmount?.toLocaleString()}</span>
                      </div>
                      {selectedInvoiceData.discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>Discount</span>
                          <span>- KES {selectedInvoiceData.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoiceData.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span>KES {selectedInvoiceData.tax.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total</span>
                          <span className="text-2xl font-bold text-primary">KES {selectedInvoiceData.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trust Indicators - Inline */}
                  {selectedInvoiceData.status !== 'paid' && (
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2">
                      <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-600" /> Secure</span>
                      <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> Instant</span>
                      <span className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5 text-blue-500" /> Auto-Renew</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {selectedInvoiceData.status === 'paid' ? (
                      <Button className="w-full h-10" variant="outline" onClick={resetPaymentModal}>
                        Close
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-10" onClick={resetPaymentModal}>
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold"
                          onClick={startPaymentFlow}
                        >
                          <Smartphone className="h-4 w-4 mr-1.5" />
                          Pay Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Payment Modal - Multi-Method Support with Desktop Optimization */}
      {showPaymentModal && selectedInvoiceData && (
        <Portal>
        <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto overscroll-contain">
          <div className="bg-background rounded-xl w-full max-w-lg lg:max-w-3xl shadow-2xl overflow-hidden">
            {/* Header - Larger text for readability */}
            <div className={`px-5 py-4 text-white ${
              paymentMethod === 'card' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    {paymentMethod === 'card' ? <CreditCard className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Complete Payment</h3>
                    <p className="text-white/90 text-sm">
                      Pay <span className="font-bold text-base">KES {selectedInvoiceData.totalAmount.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={resetPaymentModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={paymentStep === 'processing'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content - Horizontal layout on desktop */}
            <div className="p-4 lg:p-5">
              {paymentStep === 'phone' && (
                <div className="lg:grid lg:grid-cols-5 lg:gap-5">
                  {/* Left Column - Payment Method & Summary (Desktop) */}
                  <div className="lg:col-span-2 space-y-3 mb-4 lg:mb-0">
                    {/* Payment Method Tabs - Larger text */}
                    <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 p-1.5 bg-muted/50 rounded-lg">
                      <button
                        onClick={() => setPaymentMethod('mpesa-stk')}
                        className={`p-2.5 lg:p-3.5 rounded-md text-center lg:text-left lg:flex lg:items-center lg:gap-3 transition-all ${
                          paymentMethod === 'mpesa-stk' ? 'bg-background shadow-sm ring-2 ring-emerald-500' : 'hover:bg-muted'
                        }`}
                      >
                        <Smartphone className={`h-5 w-5 mx-auto lg:mx-0 ${paymentMethod === 'mpesa-stk' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <div className="lg:flex-1">
                          <p className={`text-sm font-semibold mt-1 lg:mt-0 ${paymentMethod === 'mpesa-stk' ? 'text-foreground' : 'text-muted-foreground'}`}>M-Pesa STK</p>
                          <p className="hidden lg:block text-xs text-muted-foreground">Instant prompt</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('mpesa-send')}
                        className={`p-2.5 lg:p-3.5 rounded-md text-center lg:text-left lg:flex lg:items-center lg:gap-3 transition-all ${
                          paymentMethod === 'mpesa-send' ? 'bg-background shadow-sm ring-2 ring-emerald-500' : 'hover:bg-muted'
                        }`}
                      >
                        <Banknote className={`h-5 w-5 mx-auto lg:mx-0 ${paymentMethod === 'mpesa-send' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <div className="lg:flex-1">
                          <p className={`text-sm font-semibold mt-1 lg:mt-0 ${paymentMethod === 'mpesa-send' ? 'text-foreground' : 'text-muted-foreground'}`}>Send Money</p>
                          <p className="hidden lg:block text-xs text-muted-foreground">Manual transfer</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`p-2.5 lg:p-3.5 rounded-md text-center lg:text-left lg:flex lg:items-center lg:gap-3 transition-all ${
                          paymentMethod === 'card' ? 'bg-background shadow-sm ring-2 ring-blue-500' : 'hover:bg-muted'
                        }`}
                      >
                        <CreditCard className={`h-5 w-5 mx-auto lg:mx-0 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                        <div className="lg:flex-1">
                          <p className={`text-sm font-semibold mt-1 lg:mt-0 ${paymentMethod === 'card' ? 'text-foreground' : 'text-muted-foreground'}`}>Card</p>
                          <p className="hidden lg:block text-xs text-muted-foreground">Visa, Mastercard</p>
                        </div>
                      </button>
                    </div>

                    {/* Order Summary - Desktop Only */}
                    <div className="hidden lg:block bg-muted/50 rounded-lg p-4 border">
                      <p className="text-sm text-muted-foreground mb-1">Paying for</p>
                      <p className="text-base font-semibold">{selectedInvoiceData.description}</p>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-3xl font-bold text-primary">KES {selectedInvoiceData.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Trust badges - Desktop */}
                    <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground pt-2">
                      <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-emerald-600" /> Secure</span>
                      <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> Fast</span>
                    </div>
                  </div>

                  {/* Right Column - Payment Form */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Order Summary - Mobile Only */}
                    <div className="lg:hidden bg-muted/50 rounded-lg p-4 border">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-muted-foreground">{selectedInvoiceData.description}</span>
                        <span className="text-xl font-bold text-primary">KES {selectedInvoiceData.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                  {/* M-Pesa STK Push Form - Larger text */}
                  {paymentMethod === 'mpesa-stk' && (
                    <div className="space-y-4">
                      {/* User-Friendly Error Alert */}
                      {mpesaError && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
                          <div className="flex items-start gap-4">
                            {/* Error Icon based on type */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              mpesaError.icon === 'wallet' ? 'bg-amber-100 dark:bg-amber-900/50' :
                              mpesaError.icon === 'phone' ? 'bg-blue-100 dark:bg-blue-900/50' :
                              mpesaError.icon === 'cancel' ? 'bg-gray-100 dark:bg-gray-800' :
                              mpesaError.icon === 'pin' ? 'bg-red-100 dark:bg-red-900/50' :
                              mpesaError.icon === 'clock' ? 'bg-orange-100 dark:bg-orange-900/50' :
                              'bg-red-100 dark:bg-red-900/50'
                            }`}>
                              {mpesaError.icon === 'wallet' && <Banknote className="h-6 w-6 text-amber-600" />}
                              {mpesaError.icon === 'phone' && <Smartphone className="h-6 w-6 text-blue-600" />}
                              {mpesaError.icon === 'cancel' && <X className="h-6 w-6 text-gray-600" />}
                              {mpesaError.icon === 'pin' && <Shield className="h-6 w-6 text-red-600" />}
                              {mpesaError.icon === 'clock' && <Clock className="h-6 w-6 text-orange-600" />}
                              {mpesaError.icon === 'error' && <AlertCircle className="h-6 w-6 text-red-600" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                                {mpesaError.title}
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {mpesaError.message}
                              </p>
                              <div className="mt-3 flex items-center gap-2 text-sm">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">💡</span>
                                <span className="text-emerald-700 dark:text-emerald-300">{mpesaError.suggestion}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => setMpesaError(null)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                              aria-label="Dismiss"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <Label htmlFor="mpesaPhone" className="text-base font-semibold flex items-center gap-2">
                          <Phone className="h-5 w-5 text-emerald-600" />
                          M-Pesa Phone Number
                        </Label>
                        <div className="relative mt-3">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">+254</div>
                          <Input
                            id="mpesaPhone"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                              if (mpesaError) setMpesaError(null);
                            }}
                            placeholder="712345678"
                            className="pl-16 h-12 text-xl font-mono"
                            maxLength={10}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 mt-3">
                          {['07', '01'].map((prefix) => (
                            <button
                              key={prefix}
                              onClick={() => setPhoneNumber(prefix)}
                              className="px-3 py-1.5 text-sm font-medium bg-background hover:bg-muted border rounded transition-colors"
                            >
                              {prefix}XX
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <p className="font-semibold text-base text-blue-800 dark:text-blue-200">How it works:</p>
                        <p className="text-blue-700 dark:text-blue-300 mt-1 text-sm">You'll receive a prompt on your phone. Enter your M-Pesa PIN to complete.</p>
                      </div>

                      <Button 
                        className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold"
                        onClick={handlePayment}
                        disabled={processing || phoneNumber.length < 9}
                      >
                        {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                        {mpesaError ? 'Try Again' : 'Send M-Pesa Prompt'}
                      </Button>
                    </div>
                  )}

                  {/* Send Money Form - Manual M-Pesa Transfer - Larger text */}
                  {paymentMethod === 'mpesa-send' && (
                    <div className="space-y-4">
                      {sendMoneyStep === 'instructions' ? (
                        <>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                            <h5 className="font-semibold text-lg text-emerald-800 dark:text-emerald-200 mb-4">Send Money Instructions</h5>
                            <ol className="space-y-3 text-base text-emerald-700 dark:text-emerald-300">
                              <li className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                <span>Go to M-Pesa → Send Money</span>
                              </li>
                              <li className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                <div>
                                  <span>Send to: </span>
                                  <button onClick={() => copyToClipboard('0729925567')} className="font-mono font-bold text-lg bg-white dark:bg-emerald-900 px-3 py-1 rounded inline-flex items-center gap-2">
                                    0729925567 {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                </div>
                              </li>
                              <li className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                <span>Amount: <strong className="text-lg">KES {selectedInvoiceData.totalAmount.toLocaleString()}</strong></span>
                              </li>
                              <li className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                <span>Enter your M-Pesa PIN to confirm</span>
                              </li>
                            </ol>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                            <p className="font-semibold text-base flex items-center gap-2">
                              <Info className="h-5 w-5" />
                              Important
                            </p>
                            <p className="mt-1 text-sm">After sending, you'll receive an M-Pesa confirmation SMS with a transaction code. You'll need this code to verify your payment.</p>
                          </div>

                          <Button 
                            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" 
                            onClick={() => setSendMoneyStep('verify')}
                          >
                            I've Sent the Money
                            <ArrowRight className="h-5 w-5 ml-2" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-center mb-4">
                            <h5 className="font-semibold text-lg">Verify Your Payment</h5>
                            <p className="text-base text-muted-foreground mt-1">Enter the M-Pesa confirmation code from your SMS</p>
                          </div>

                          <div className="bg-muted/30 rounded-lg p-4 border">
                            <Label htmlFor="refCode" className="text-base font-semibold flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-emerald-600" />
                              M-Pesa Transaction Code
                            </Label>
                            <Input
                              id="refCode"
                              type="text"
                              value={referenceCode}
                              onChange={(e) => setReferenceCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                              placeholder="e.g. SLK4H7G2YP"
                              className="mt-3 h-14 text-xl font-mono text-center tracking-wider uppercase"
                              maxLength={10}
                              autoFocus
                            />
                            <p className="text-sm text-muted-foreground mt-2 text-center">
                              The code looks like: <span className="font-mono font-bold text-base">SLK4H7G2YP</span>
                            </p>
                          </div>

                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                            <p className="text-sm">We'll verify your payment and activate your subscription within minutes.</p>
                          </div>

                          <div className="space-y-2">
                            <Button 
                              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={async () => {
                                if (referenceCode.length < 8) {
                                  alert('Please enter a valid M-Pesa transaction code');
                                  return;
                                }
                                setVerifyingCode(true);
                                // TODO: Call API to verify the code
                                // For now, show success message
                                setTimeout(() => {
                                  setVerifyingCode(false);
                                  alert('Payment verification submitted! We will verify your payment and activate your subscription within 24 hours. You will receive a confirmation SMS.');
                                  resetPaymentModal();
                                  setSendMoneyStep('instructions');
                                  setReferenceCode('');
                                }, 1500);
                              }}
                              disabled={verifyingCode || referenceCode.length < 8}
                            >
                              {verifyingCode ? (
                                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying...</>
                              ) : (
                                <><Check className="h-5 w-5 mr-2" /> Verify Payment</>
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="w-full h-10 text-sm text-muted-foreground" 
                              onClick={() => setSendMoneyStep('instructions')}
                              disabled={verifyingCode}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Back to Instructions
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Card Payment Form - Stripe Integration */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      {!stripeConfigured ? (
                        <>
                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800 text-center">
                            <CreditCard className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                            <h5 className="font-semibold text-amber-800 dark:text-amber-200">Card Payment Unavailable</h5>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              Card payments are not configured yet. Please use M-Pesa.
                            </p>
                          </div>
                          <Button variant="outline" className="w-full h-10" onClick={() => setPaymentMethod('mpesa-stk')}>
                            Switch to M-Pesa
                          </Button>
                        </>
                      ) : !stripePaymentClientSecret ? (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <div>
                                <h5 className="font-semibold text-blue-800 dark:text-blue-200">Card Payment</h5>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Visa, Mastercard, and more</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                              <Shield className="h-3.5 w-3.5" />
                              <span>Secured by Stripe - 256-bit encryption</span>
                            </div>
                          </div>

                          {stripeError && (
                            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                              {stripeError}
                            </div>
                          )}

                          <Button 
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            onClick={async () => {
                              if (!selectedInvoiceData) return;
                              setCreatingStripePayment(true);
                              setStripeError(null);
                              try {
                                // Get Stripe config
                                const configRes = await fetch(`${config.apiUrl}/stripe/config`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (!configRes.ok) throw new Error('Failed to get Stripe config');
                                const stripeConfig = await configRes.json();
                                setStripePublishableKey(stripeConfig.publishableKey);

                                // Create payment intent for subscription
                                const res = await fetch(`${config.apiUrl}/stripe/subscription/create-payment`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    invoiceId: selectedInvoiceData.id,
                                    invoiceNumber: selectedInvoiceData.invoiceNumber || 'SUB',
                                    amount: Math.round(selectedInvoiceData.totalAmount * 100),
                                    currency: 'kes',
                                    description: selectedInvoiceData.description,
                                  }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message || 'Failed to create payment');
                                setStripePaymentClientSecret(data.clientSecret);
                              } catch (err: any) {
                                setStripeError(err.message);
                              } finally {
                                setCreatingStripePayment(false);
                              }
                            }}
                            disabled={creatingStripePayment}
                          >
                            {creatingStripePayment ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparing...</>
                            ) : (
                              <><CreditCard className="h-4 w-4 mr-2" /> Pay with Card</>
                            )}
                          </Button>
                        </>
                      ) : (
                        <div className="min-h-[300px]">
                          <StripePaymentForm
                            clientSecret={stripePaymentClientSecret}
                            amount={Math.round((selectedInvoiceData?.totalAmount || 0) * 100)}
                            currency="kes"
                            publishableKey={stripePublishableKey}
                            onSuccess={(paymentIntentId) => {
                              setPaymentStep('success');
                              setStripePaymentClientSecret(null);
                            }}
                            onCancel={() => {
                              setStripePaymentClientSecret(null);
                              resetStripe();
                            }}
                            onError={(error) => {
                              setStripeError(error);
                              setStripePaymentClientSecret(null);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Back Button */}
                  <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={resetPaymentModal}>
                    Cancel
                  </Button>
                  </div>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-6 max-w-md mx-auto space-y-5">
                  {/* Phase-based Icon */}
                  <div className="flex justify-center">
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 flex items-center justify-center">
                      {mpesaPhase === 'sending' && (
                        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                      )}
                      {mpesaPhase === 'waiting_prompt' && (
                        <>
                          <Smartphone className="h-10 w-10 text-emerald-600" />
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full animate-ping" />
                        </>
                      )}
                      {mpesaPhase === 'waiting_pin' && (
                        <>
                          <Shield className="h-10 w-10 text-blue-600" />
                          <Smartphone className="h-5 w-5 text-emerald-600 absolute -bottom-1 -right-1" />
                        </>
                      )}
                      {(mpesaPhase === 'processing' || mpesaPhase === 'verifying') && (
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Phase Title & Message */}
                  <div className="text-center space-y-1">
                    <h4 className="text-xl font-bold">
                      {mpesaPhase === 'sending' && 'Sending Request...'}
                      {mpesaPhase === 'waiting_prompt' && 'Check Your Phone'}
                      {mpesaPhase === 'waiting_pin' && 'Enter Your PIN'}
                      {mpesaPhase === 'processing' && 'Processing Payment'}
                      {mpesaPhase === 'verifying' && 'Verifying Payment'}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {mpesaPhase === 'sending' && 'Connecting to M-Pesa...'}
                      {mpesaPhase === 'waiting_prompt' && 'An M-Pesa prompt should appear on your phone'}
                      {mpesaPhase === 'waiting_pin' && 'Enter your M-Pesa PIN on your phone to complete'}
                      {mpesaPhase === 'processing' && 'M-Pesa is processing your payment...'}
                      {mpesaPhase === 'verifying' && 'Confirming your payment...'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      +254 {phoneNumber}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max(10, Math.min(90, ((120 - mpesaTimeRemaining) / 120) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-muted/50 border">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className={`text-2xl font-mono font-bold ${mpesaTimeRemaining < 30 ? 'text-red-500' : ''}`}>
                      {Math.floor(mpesaTimeRemaining / 60)}:{(mpesaTimeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm text-muted-foreground">remaining</span>
                  </div>

                  {/* Phase-specific Instructions */}
                  {mpesaPhase === 'waiting_prompt' && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Didn't receive the prompt?</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                        <li>Check if your phone has network signal</li>
                        <li>Ensure M-Pesa is activated on your line</li>
                        <li>Try updating your SIM: dial *234*1*6#</li>
                      </ul>
                    </div>
                  )}

                  {mpesaPhase === 'waiting_pin' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">Enter your 4-digit M-Pesa PIN</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Never share your PIN with anyone. SmartDuka will never ask for your PIN.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPaymentStep('phone');
                        setMpesaPhase('sending');
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Different Number
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={resetPaymentModal}
                    >
                      Cancel Payment
                    </Button>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-6 max-w-sm mx-auto text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">Payment Successful!</h4>
                    <p className="text-muted-foreground mt-1 text-sm">Your subscription has been activated</p>
                  </div>
                  
                  {/* Receipt Download */}
                  <div className="bg-muted/50 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground mb-2">Transaction Details</p>
                    {selectedInvoiceData.invoiceNumber && (
                      <p className="text-sm font-mono">{selectedInvoiceData.invoiceNumber}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          // Download receipt - open invoice in new tab or generate PDF
                          window.open(`/api/v1/subscriptions/invoices/${selectedInvoice}/pdf`, '_blank');
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Receipt
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          // Download invoice
                          window.open(`/api/v1/subscriptions/invoices/${selectedInvoice}/pdf?type=invoice`, '_blank');
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Invoice
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => {
                      resetPaymentModal();
                      window.location.reload();
                    }}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
