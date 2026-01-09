"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Input, Label, Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@smartduka/ui";
import { Store, User, Lock, Settings as SettingsIcon, ShieldAlert, CreditCard, Crown, TrendingUp, Users, Package, Receipt, AlertCircle, Check, Clock, X, Phone, Loader2, Smartphone, ChevronRight, ChevronLeft, Menu, FileText, Calendar, CreditCard as CardIcon, CheckCircle2, XCircle, ArrowRight, Info, Shield, Zap, Eye, Download, RefreshCw, ExternalLink, Copy, Banknote } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useSubscription, useSubscriptionPlans, useBillingHistory, type BillingCycle, type SubscriptionPlan } from "@/hooks/use-subscription";
import { MpesaSettings } from "@/components/settings/mpesa-settings";
import { PaymentConfigs } from "@/components/settings/payment-configs";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading } = useAuth();
  
  // Get initial tab from URL query parameter
  const initialTab = searchParams.get('tab') || 'shop';
  const [activeTab, setActiveTab] = useState(initialTab);
  
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
  useEffect(() => {
    if (!loading && user && isCashier) {
      router.push('/pos');
    }
  }, [loading, user, isCashier, router]);

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
  const { subscription, loading: subLoading, changePlan, cancelSubscription, reactivateSubscription } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { invoices, pendingInvoices, loading: billingLoading, initiatePayment, getPaymentSummary, checkStkStatus } = useBillingHistory();
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'phone' | 'processing' | 'success'>('details');
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loading = subLoading || plansLoading || billingLoading;

  // Plan color themes - minimalistic with consistent slate/primary palette
  const planColors: Record<string, { bg: string; border: string; badge: string; iconBg: string; iconColor: string; headerGradient: string }> = {
    blue: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-primary', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300', headerGradient: 'from-slate-700 to-slate-800' },
    green: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-primary', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300', headerGradient: 'from-slate-700 to-slate-800' },
    purple: { bg: 'bg-white dark:bg-slate-900', border: 'border-primary', badge: 'bg-primary', iconBg: 'bg-primary/10', iconColor: 'text-primary', headerGradient: 'from-primary to-primary/80' },
    gold: { bg: 'bg-white dark:bg-slate-900', border: 'border-amber-400 dark:border-amber-500', badge: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400', headerGradient: 'from-amber-500 to-amber-600' },
    gray: { bg: 'bg-slate-50 dark:bg-slate-900/50', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-500', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', headerGradient: 'from-slate-500 to-slate-600' },
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

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!subscription) return;
    setProcessing(true);
    try {
      await changePlan(plan.code, billingCycle);
      setShowUpgradeModal(false);
      setSelectedPlan(null);
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

  // Handle M-Pesa payment
  const handlePayment = async () => {
    if (!selectedInvoice || !phoneNumber) return;
    setProcessing(true);
    setPaymentStep('processing');
    
    try {
      const result = await initiatePayment(selectedInvoice, phoneNumber);
      if (result.success) {
        setCheckoutRequestId(result.checkoutRequestId || null);
        // Poll for status
        if (result.checkoutRequestId) {
          pollPaymentStatus(result.checkoutRequestId);
        }
      } else {
        alert(result.message);
        setPaymentStep('phone');
      }
    } catch (error: any) {
      alert(error.message);
      setPaymentStep('phone');
    } finally {
      setProcessing(false);
    }
  };

  // Poll payment status
  const pollPaymentStatus = async (checkoutId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes with 3-second intervals
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStep('phone');
        alert('Payment timeout. Please check your M-Pesa messages or try again.');
        return;
      }
      
      try {
        const status = await checkStkStatus(checkoutId);
        if (status.success && status.resultCode === 0) {
          setPaymentStep('success');
          setTimeout(() => {
            resetPaymentModal();
            window.location.reload();
          }, 3000);
          return;
        } else if (status.resultCode && status.resultCode !== 0) {
          setPaymentStep('phone');
          alert(status.resultDesc || 'Payment failed. Please try again.');
          return;
        }
      } catch (error) {
        // Continue polling
      }
      
      attempts++;
      setTimeout(poll, 3000);
    };
    
    poll();
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

  return (
    <div className="space-y-6">
      {/* Current Subscription Card - Modern Design */}
      {subscription ? (
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${planColors[subscription.planCode === 'trial' ? 'gray' : subscription.planCode === 'starter' ? 'blue' : subscription.planCode === 'professional' ? 'green' : subscription.planCode === 'business' ? 'purple' : 'gold']?.headerGradient || 'from-primary to-primary/80'} px-6 py-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{subscription.planName} Plan</h2>
                  <p className="text-white/80 flex items-center gap-2 mt-1">
                    <span className="text-lg font-semibold">KES {subscription.currentPrice.toLocaleString()}</span>
                    <span className="text-white/60">/ {subscription.billingCycle === 'annual' ? 'year' : 'month'}</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium ml-2">
                      {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
                  subscription.status === 'active' ? 'bg-white text-emerald-700' :
                  subscription.status === 'trial' ? 'bg-white text-blue-700' :
                  subscription.status === 'past_due' ? 'bg-amber-100 text-amber-800' :
                  'bg-white/20 text-white'
                }`}>
                  {statusColors[subscription.status]?.icon}
                  {subscription.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Period Info - Modern Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Started</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{new Date(subscription.startDate).toLocaleDateString()}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Period Ends</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Days Left</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{subscription.daysRemaining} <span className="text-sm font-normal text-gray-500">days</span></p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-100">
                <div className="flex items-center gap-2 text-violet-600 mb-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Auto Renew</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{subscription.autoRenew ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            {/* Usage Stats - Modern Progress Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Resource Usage</h4>
                <span className="text-sm text-muted-foreground">Current billing period</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{subscription.usage.shops.current}<span className="text-lg font-normal text-white/70">/{subscription.usage.shops.limit}</span></span>
                  </div>
                  <p className="text-white/80 text-sm font-medium mb-2">Shops / Branches</p>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.shops.current / subscription.usage.shops.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg shadow-emerald-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{subscription.usage.employees.current}<span className="text-lg font-normal text-white/70">/{subscription.usage.employees.limit}</span></span>
                  </div>
                  <p className="text-white/80 text-sm font-medium mb-2">Employees</p>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.employees.current / subscription.usage.employees.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-lg shadow-violet-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{subscription.usage.products.current.toLocaleString()}<span className="text-lg font-normal text-white/70">/{subscription.usage.products.limit.toLocaleString()}</span></span>
                  </div>
                  <p className="text-white/80 text-sm font-medium mb-2">Products</p>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subscription.usage.products.current / subscription.usage.products.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - Modern Buttons */}
            <div className="flex flex-wrap gap-3 pt-6 border-t">
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                size="lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Upgrade Plan
              </Button>
              {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                <Button variant="outline" size="lg" onClick={() => reactivateSubscription()}>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Reactivate Subscription
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="text-muted-foreground hover:text-destructive hover:border-destructive"
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

      {/* Pending Invoices - Improved */}
      {pendingInvoices.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-amber-900">Payment Required</CardTitle>
                  <CardDescription className="text-amber-700">
                    {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''} awaiting payment
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-700">Total Due</p>
                <p className="text-2xl font-bold text-amber-900">KES {totalPendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="bg-white/80 backdrop-blur rounded-xl p-4 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group"
                  onClick={() => openInvoiceDetails(invoice)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                        <FileText className="h-5 w-5 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{invoice.description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-mono">{invoice.invoiceNumber}</span>
                          <span>•</span>
                          <span>Due: {formatDate(invoice.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">KES {invoice.totalAmount.toLocaleString()}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          {invoice.status === 'pending' ? 'PENDING' : invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoiceDetails(invoice);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View & Pay
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Quick Pay All Button */}
            {pendingInvoices.length > 1 && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all"
                  onClick={() => openInvoiceDetails(pendingInvoices[0])}
                >
                  <Banknote className="h-5 w-5 mr-2" />
                  Pay All Invoices - KES {totalPendingAmount.toLocaleString()}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing History - Improved */}
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your payment history and invoices</CardDescription>
              </div>
            </div>
            {invoices.length > 5 && (
              <Button variant="outline" size="sm" className="gap-1.5">
                View All
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Your invoices and payments will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.slice(0, 10).map((invoice) => {
                const isPaid = invoice.status === 'paid';
                const isPending = invoice.status === 'pending';
                
                return (
                  <div 
                    key={invoice.id} 
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => openInvoiceDetails(invoice)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${
                          isPaid ? 'bg-emerald-100' : isPending ? 'bg-amber-100' : 'bg-gray-100'
                        }`}>
                          {isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : isPending ? (
                            <Clock className="h-5 w-5 text-amber-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{invoice.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{invoice.invoiceNumber}</span>
                            <span>•</span>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(invoice.createdAt)}</span>
                            {invoice.paidAt && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600">Paid {formatDate(invoice.paidAt)}</span>
                              </>
                            )}
                          </div>
                          {invoice.mpesaReceiptNumber && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>M-Pesa: {invoice.mpesaReceiptNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">KES {invoice.totalAmount.toLocaleString()}</p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isPending 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isPaid && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={isPaid ? "outline" : "default"}
                          className={`min-w-[100px] ${
                            isPending 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                              : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openInvoiceDetails(invoice);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          {isPaid ? 'View' : 'Pay Now'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Modal - Full Plan Selection */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-background rounded-xl max-w-4xl w-full shadow-xl overflow-hidden my-4 border">
            {/* Header - Clean and minimal */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Choose Your Plan</h3>
                  <p className="text-sm text-muted-foreground">Select the plan that fits your business</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUpgradeModal(false); setSelectedPlan(null); }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
                <button
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'annual' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${billingCycle === 'annual' ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Save 17%</span>
                </div>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="p-6">
              {selectedPlan ? (
                /* Plan Confirmation View */
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-6">
                    <h4 className="text-lg font-semibold">Confirm Your Selection</h4>
                    <p className="text-muted-foreground">You're about to {subscription ? 'switch to' : 'subscribe to'} the {selectedPlan.name} plan</p>
                  </div>
                  
                  <div className={`border-2 rounded-xl p-6 ${planColors[selectedPlan.colorTheme || 'blue']?.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                      {selectedPlan.badge && (
                        <span className={`px-3 py-1 text-xs font-bold text-white rounded-full ${planColors[selectedPlan.colorTheme || 'blue']?.badge}`}>
                          {selectedPlan.badge}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">KES</span>
                      <span className="text-4xl font-extrabold">
                        {(billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${planColors[selectedPlan.colorTheme || 'blue']?.iconBg}`}>
                          <Store className={`h-4 w-4 ${planColors[selectedPlan.colorTheme || 'blue']?.iconColor}`} />
                        </div>
                        <span className="font-medium">{selectedPlan.maxShops} Shop{selectedPlan.maxShops > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${planColors[selectedPlan.colorTheme || 'blue']?.iconBg}`}>
                          <Users className={`h-4 w-4 ${planColors[selectedPlan.colorTheme || 'blue']?.iconColor}`} />
                        </div>
                        <span className="font-medium">Up to {selectedPlan.maxEmployees} Employees</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${planColors[selectedPlan.colorTheme || 'blue']?.iconBg}`}>
                          <Package className={`h-4 w-4 ${planColors[selectedPlan.colorTheme || 'blue']?.iconColor}`} />
                        </div>
                        <span className="font-medium">Up to {selectedPlan.maxProducts.toLocaleString()} Products</span>
                      </div>
                    </div>

                    {selectedPlan.features && selectedPlan.features.length > 0 && (
                      <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold mb-2">Features Included:</h5>
                        <ul className="space-y-1">
                          {selectedPlan.features.slice(0, 5).map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedPlan(null)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back to Plans
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-primary to-primary/80" 
                      onClick={() => handleUpgrade(selectedPlan)} 
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Smartphone className="h-4 w-4 mr-2" />
                      )}
                      {selectedPlan.monthlyPrice === 0 ? 'Activate Free Plan' : 'Continue to Payment'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Plans Grid View - Minimalistic Design */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {plans.map((plan) => {
                    const isCurrentPlan = subscription?.planCode === plan.code;
                    const isPopular = plan.badge === 'Popular';
                    const isBestValue = plan.badge === 'Best Value';
                    const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

                    return (
                      <div
                        key={plan.code}
                        className={`relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md ${
                          isPopular ? 'border-primary shadow-sm' : 
                          isBestValue ? 'border-amber-400 dark:border-amber-500' : 
                          'border-border'
                        } ${isCurrentPlan ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      >
                        {/* Badge */}
                        {plan.badge && (
                          <div className={`text-center py-1.5 text-xs font-semibold ${
                            isPopular ? 'bg-primary text-primary-foreground' :
                            isBestValue ? 'bg-amber-500 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {plan.badge}
                          </div>
                        )}

                        <div className="p-5">
                          {/* Plan Name */}
                          <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                          
                          {/* Price */}
                          <div className="mb-4">
                            {price === 0 ? (
                              <div className="flex items-baseline">
                                <span className="text-2xl font-bold text-foreground">FREE</span>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">KES</span>
                                <span className="text-2xl font-bold text-foreground">{price.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                              </div>
                            )}
                          </div>

                          {/* Limits - Compact */}
                          <div className="space-y-2 mb-5 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Store className="h-4 w-4 flex-shrink-0" />
                              <span><strong className="text-foreground">{plan.maxShops}</strong> Shop{plan.maxShops > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span><strong className="text-foreground">{plan.maxEmployees}</strong> Employees</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Package className="h-4 w-4 flex-shrink-0" />
                              <span><strong className="text-foreground">{plan.maxProducts.toLocaleString()}</strong> Products</span>
                            </div>
                          </div>

                          {/* CTA */}
                          <Button
                            className={`w-full ${isPopular ? '' : isBestValue ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                            variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
                            disabled={isCurrentPlan}
                            onClick={() => setSelectedPlan(plan)}
                          >
                            {isCurrentPlan ? (
                              <><Check className="h-4 w-4 mr-1.5" /> Current</>
                            ) : (
                              'Select'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceDetails && selectedInvoiceData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Invoice Details</h3>
                    <p className="text-white/80 text-sm font-mono">{selectedInvoiceData.invoiceNumber}</p>
                  </div>
                </div>
                <button 
                  onClick={resetPaymentModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Invoice Summary */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-semibold">{selectedInvoiceData.description}</span>
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
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    selectedInvoiceData.status === 'paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedInvoiceData.status === 'paid' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {selectedInvoiceData.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 border-b">
                  <h4 className="font-semibold text-sm">Amount Breakdown</h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KES {selectedInvoiceData.amount?.toLocaleString() || selectedInvoiceData.totalAmount?.toLocaleString()}</span>
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
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-primary">KES {selectedInvoiceData.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info (if paid) */}
              {selectedInvoiceData.status === 'paid' && selectedInvoiceData.mpesaReceiptNumber && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-800 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Payment Confirmed</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">M-Pesa Receipt</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{selectedInvoiceData.mpesaReceiptNumber}</span>
                        <button 
                          onClick={() => copyToClipboard(selectedInvoiceData.mpesaReceiptNumber)}
                          className="p-1 hover:bg-emerald-200 rounded transition-colors"
                        >
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
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

              {/* Trust Indicators */}
              {selectedInvoiceData.status !== 'paid' && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Instant Activation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    <span>Auto-Renewal</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t">
              {selectedInvoiceData.status === 'paid' ? (
                <Button className="w-full" variant="outline" onClick={resetPaymentModal}>
                  Close
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={resetPaymentModal}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg"
                    onClick={startPaymentFlow}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Pay with M-Pesa
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* M-Pesa Payment Modal */}
      {showPaymentModal && selectedInvoiceData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">M-Pesa Payment</h3>
                    <p className="text-white/80 text-sm">KES {selectedInvoiceData.totalAmount.toLocaleString()}</p>
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

            {/* Content */}
            <div className="p-6">
              {paymentStep === 'phone' && (
                <div className="space-y-5">
                  {/* Invoice Summary */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Paying for</span>
                      <span className="font-semibold">{selectedInvoiceData.description}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-xl font-bold text-emerald-600">KES {selectedInvoiceData.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <Label htmlFor="mpesaPhone" className="text-sm font-semibold">M-Pesa Phone Number</Label>
                    <div className="relative mt-2">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm font-medium">+254</span>
                      </div>
                      <Input
                        id="mpesaPhone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="712345678"
                        className="pl-20 h-12 text-lg font-mono"
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter the phone number registered with M-Pesa
                    </p>
                  </div>

                  {/* Quick Select */}
                  <div className="flex gap-2">
                    {['07', '01'].map((prefix) => (
                      <button
                        key={prefix}
                        onClick={() => setPhoneNumber(prefix)}
                        className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                      >
                        {prefix}XX XXX XXX
                      </button>
                    ))}
                  </div>

                  {/* Security Note */}
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl text-sm">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-blue-800">
                      <p className="font-medium">How it works:</p>
                      <ol className="mt-1 space-y-1 text-blue-700">
                        <li>1. You'll receive an M-Pesa prompt on your phone</li>
                        <li>2. Enter your M-Pesa PIN to confirm</li>
                        <li>3. Your subscription activates instantly</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-8 text-center space-y-4">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    <Smartphone className="absolute inset-0 m-auto h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">Check Your Phone</h4>
                    <p className="text-muted-foreground mt-1">
                      An M-Pesa prompt has been sent to<br />
                      <span className="font-mono font-semibold">+254 {phoneNumber}</span>
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    <p className="font-medium">Enter your M-Pesa PIN to complete payment</p>
                    <p className="text-amber-600 mt-1">Do not share your PIN with anyone</p>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-8 text-center space-y-4">
                  <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-emerald-800">Payment Successful!</h4>
                    <p className="text-muted-foreground mt-1">
                      Your subscription has been activated
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Redirecting...
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {paymentStep === 'phone' && (
              <div className="px-6 py-4 bg-muted/30 border-t">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={resetPaymentModal}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold"
                    onClick={handlePayment}
                    disabled={processing || phoneNumber.length < 9}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Send M-Pesa Prompt
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
