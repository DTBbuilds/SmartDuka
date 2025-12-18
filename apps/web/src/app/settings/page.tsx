"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Input, Label, Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@smartduka/ui";
import { Store, User, Lock, Settings as SettingsIcon, ShieldAlert, CreditCard, Crown, TrendingUp, Users, Package, Receipt, AlertCircle, Check, Clock, X, Phone, Loader2, Smartphone, ChevronRight, Menu } from "lucide-react";
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
        const data = await res.json().catch(() => ({}));
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
  const { invoices, pendingInvoices, loading: billingLoading, initiatePayment } = useBillingHistory();
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const loading = subLoading || plansLoading || billingLoading;

  // Plan color themes - high contrast
  const planColors: Record<string, { bg: string; border: string; badge: string; iconBg: string; iconColor: string; headerGradient: string }> = {
    blue: { bg: 'bg-white', border: 'border-blue-300', badge: 'bg-blue-600', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', headerGradient: 'from-blue-600 to-blue-700' },
    green: { bg: 'bg-white', border: 'border-emerald-300', badge: 'bg-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', headerGradient: 'from-emerald-600 to-emerald-700' },
    purple: { bg: 'bg-white', border: 'border-violet-300', badge: 'bg-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-700', headerGradient: 'from-violet-600 to-violet-700' },
    gold: { bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-600', iconBg: 'bg-amber-200', iconColor: 'text-amber-800', headerGradient: 'from-amber-500 to-orange-600' },
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

  const handlePayment = async () => {
    if (!selectedInvoice || !phoneNumber) return;
    setProcessing(true);
    try {
      const result = await initiatePayment(selectedInvoice, phoneNumber);
      if (result.success) {
        alert(result.message);
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPhoneNumber('');
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

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
      {/* Current Subscription Card */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  {subscription.planName} Plan
                </CardTitle>
                <CardDescription>
                  {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing • 
                  KES {subscription.currentPrice.toLocaleString()}/{subscription.billingCycle === 'annual' ? 'year' : 'month'}
                </CardDescription>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${statusColors[subscription.status]?.bg} ${statusColors[subscription.status]?.text} ${statusColors[subscription.status]?.border}`}>
                {statusColors[subscription.status]?.icon}
                {subscription.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{new Date(subscription.startDate).toLocaleDateString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="font-medium">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Days Remaining</p>
                <p className="font-medium text-primary">{subscription.daysRemaining} days</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Auto Renew</p>
                <p className="font-medium">{subscription.autoRenew ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Usage Stats */}
            <div>
              <h4 className="font-medium mb-3">Usage</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Store className="h-4 w-4" />
                    <span className="text-sm">Shops/Branches</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{subscription.usage.shops.current}</span>
                    <span className="text-muted-foreground text-sm">/ {subscription.usage.shops.limit}</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min((subscription.usage.shops.current / subscription.usage.shops.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Employees</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{subscription.usage.employees.current}</span>
                    <span className="text-muted-foreground text-sm">/ {subscription.usage.employees.limit}</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min((subscription.usage.employees.current / subscription.usage.employees.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Products</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{subscription.usage.products.current}</span>
                    <span className="text-muted-foreground text-sm">/ {subscription.usage.products.limit}</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min((subscription.usage.products.current / subscription.usage.products.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => setShowUpgradeModal(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
              {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                <Button variant="outline" onClick={() => reactivateSubscription()}>
                  Reactivate Subscription
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription?')) {
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
        <Card>
          <CardContent className="py-12 text-center">
            <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground mb-4">Choose a plan below to get started with SmartDuka</p>
          </CardContent>
        </Card>
      )}

      {/* Pending Invoices Alert */}
      {pendingInvoices.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800">Payment Required</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  You have {pendingInvoices.length} pending invoice(s) totaling KES{' '}
                  {pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => {
                    setSelectedInvoice(pendingInvoices[0]?.id);
                    setShowPaymentModal(true);
                  }}
                >
                  Pay Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Plans</CardTitle>
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'annual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                }`}
              >
                Annual (Save 17%)
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const colors = planColors[plan.colorTheme || 'blue'];
              const isCurrentPlan = subscription?.planCode === plan.code;
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.code}
                  className={`relative rounded-xl border-2 overflow-hidden shadow-md hover:shadow-lg transition-all ${colors.border} ${colors.bg} ${
                    isCurrentPlan ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {/* Header with gradient */}
                  <div className={`bg-gradient-to-br ${colors.headerGradient} px-5 py-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      {plan.badge && (
                        <span className="px-2.5 py-1 text-xs font-bold text-white bg-white/20 rounded-full backdrop-blur-sm">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    {isCurrentPlan && (
                      <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-bold text-white bg-white/30 rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-gray-600">KES</span>
                      <span className="text-3xl font-extrabold text-gray-900">{price.toLocaleString()}</span>
                      <span className="text-gray-600 font-medium">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                        <Store className={`h-4 w-4 ${colors.iconColor}`} />
                      </div>
                      <span className="font-semibold text-gray-900">{plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                        <Users className={`h-4 w-4 ${colors.iconColor}`} />
                      </div>
                      <span className="font-semibold text-gray-900">{plan.maxEmployees} Employees</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                        <Package className={`h-4 w-4 ${colors.iconColor}`} />
                      </div>
                      <span className="font-semibold text-gray-900">{plan.maxProducts.toLocaleString()} Products</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5">
                    <Button
                      className="w-full font-bold shadow-sm"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowUpgradeModal(true);
                      }}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No billing history yet</p>
          ) : (
            <div className="divide-y">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${invoice.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <Receipt className={`h-4 w-4 ${invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{invoice.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.invoiceNumber} • {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">KES {invoice.totalAmount.toLocaleString()}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold">
              {subscription ? 'Change to' : 'Subscribe to'} {selectedPlan.name}
            </h3>
            <p className="text-muted-foreground mt-2">
              KES {(billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString()}
              /{billingCycle === 'annual' ? 'year' : 'month'}
            </p>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Includes:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {selectedPlan.maxShops} Shop(s)</li>
                <li>• Up to {selectedPlan.maxEmployees} Employees</li>
                <li>• Up to {selectedPlan.maxProducts.toLocaleString()} Products</li>
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setShowUpgradeModal(false); setSelectedPlan(null); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => handleUpgrade(selectedPlan)} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold">Pay with M-Pesa</h3>
            <p className="text-muted-foreground mt-2">
              Enter your M-Pesa phone number to receive the payment prompt.
            </p>

            <div className="mt-4">
              <Label htmlFor="mpesaPhone">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mpesaPhone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format: 07XX XXX XXX or 01XX XXX XXX
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); setPhoneNumber(''); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handlePayment} disabled={processing || !phoneNumber}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send M-Pesa Prompt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
