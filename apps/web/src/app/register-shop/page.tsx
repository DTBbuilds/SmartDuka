"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Eye, EyeOff, Store, User, ArrowRight, ArrowLeft, Building2, MapPin, FileText, Info, CheckCircle, Loader2, BarChart3, Users, Shield, Zap } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth, GoogleProfile } from "@/lib/auth-context";
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

function RegisterShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerShop, registerShopWithGoogle, loginWithGoogle } = useAuth();
  const [step, setStep] = useState(1); // 1: Shop info, 2: Admin info
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  
  const [shopData, setShopData] = useState({
    shopName: "",
    businessType: "",
    county: "",
    city: "",
    address: "",
    kraPin: "",
    description: "",
  });
  
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for Google OAuth redirect
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam) {
      try {
        const profile = JSON.parse(decodeURIComponent(googleParam)) as GoogleProfile;
        setGoogleProfile(profile);
        setIsGoogleFlow(true);
        // Pre-fill admin data from Google profile
        setAdminData(prev => ({
          ...prev,
          name: profile.name || '',
          email: profile.email || '',
        }));
      } catch (err) {
        console.error('Failed to parse Google profile:', err);
      }
    }
  }, [searchParams]);

  const validateShopData = () => {
    if (!shopData.shopName.trim()) {
      setError("Shop name is required");
      return false;
    }
    if (shopData.shopName.trim().length < 2) {
      setError("Shop name must be at least 2 characters");
      return false;
    }
    if (!shopData.businessType) {
      setError("Please select a business type");
      return false;
    }
    if (!shopData.county) {
      setError("Please select a county");
      return false;
    }
    if (!shopData.city.trim()) {
      setError("City/Town is required");
      return false;
    }
    // Validate KRA PIN format if provided
    if (shopData.kraPin.trim()) {
      const kraRegex = /^[A-Z][0-9]{9}[A-Z]$/;
      if (!kraRegex.test(shopData.kraPin.trim().toUpperCase())) {
        setError("Invalid KRA PIN format (e.g., A123456789B)");
        return false;
      }
    }
    return true;
  };

  const validateAdminData = () => {
    if (!adminData.name.trim()) {
      setError("Admin name is required");
      return false;
    }
    if (!adminData.email.trim() || !/\S+@\S+\.\S+/.test(adminData.email)) {
      setError("Valid admin email is required");
      return false;
    }
    // Phone is required for all users (needed for M-Pesa and business contact)
    if (!adminData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    // Validate Kenyan phone format
    const phoneRegex = /^(?:\+254|254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(adminData.phone.replace(/\s/g, ''))) {
      setError("Please enter a valid Kenyan phone number (e.g., 0712345678)");
      return false;
    }
    // Password validation only for non-Google flow
    if (!isGoogleFlow) {
      if (adminData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (adminData.password !== adminData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handleShopNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateShopData()) {
      setStep(2);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateAdminData()) return;

    setIsLoading(true);

    try {
      if (isGoogleFlow && googleProfile) {
        // Register with Google profile - include phone in shop data
        await registerShopWithGoogle(googleProfile, { ...shopData, phone: adminData.phone });
      } else {
        // Regular registration
        await registerShop(shopData, adminData);
      }
      
      // Redirect to onboarding
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = adminData.password;
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-600"];

    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength();

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
              Start Your<br />
              <span className="text-primary">Digital Journey</span>
            </h1>
            <p className="mt-4 text-slate-300">
              Join thousands of Kenyan retailers using SmartDuka to grow their business.
            </p>
          </div>
          
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Get started in minutes</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">24-day free trial period</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Full POS & inventory features</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for Kenyan businesses.
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-3/5 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-border bg-muted/50">
          {/* Mobile Logo + Theme Toggle */}
          <div className="flex items-center justify-between mb-4 lg:mb-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground lg:hidden">SmartDuka</span>
            </div>
            <ThemeToggleOutline />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Register Your Shop</h2>
              <p className="text-muted-foreground text-sm">Step {step} of 2: {step === 1 ? 'Shop Information' : 'Admin Account'}</p>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary text-white" : "bg-gray-200"}`}>
                {step > 1 ? "✓" : "1"}
              </div>
              <div className="w-12 h-1 bg-gray-200 rounded">
                <div className={`h-full rounded transition-all ${step >= 2 ? "bg-primary w-full" : "w-0"}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary text-white" : "bg-gray-200"}`}>
                2
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 text-sm flex-1">{error}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleShopNext} className="space-y-5">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Store className="h-5 w-5" />
                <h3 className="font-semibold">Shop Information</h3>
              </div>

              {/* Shop Name - Required */}
              <div>
                <Label htmlFor="shop-name">Shop Name *</Label>
                <Input
                  id="shop-name"
                  placeholder="e.g., Mama Mboga Store, Quick Mart"
                  value={shopData.shopName}
                  onChange={(e) => setShopData({ ...shopData, shopName: e.target.value })}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">This will be displayed on receipts and invoices</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Type - Required Dropdown */}
                <div>
                  <Label htmlFor="business-type">Business Type *</Label>
                  <select
                    id="business-type"
                    value={shopData.businessType}
                    onChange={(e) => setShopData({ ...shopData, businessType: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select business type...</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* County - Required Dropdown */}
                <div>
                  <Label htmlFor="county">County *</Label>
                  <select
                    id="county"
                    value={shopData.county}
                    onChange={(e) => setShopData({ ...shopData, county: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select county...</option>
                    {KENYA_COUNTIES.map((county) => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>

                {/* City/Town - Required */}
                <div>
                  <Label htmlFor="city">City/Town *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Westlands, Kisumu CBD"
                    value={shopData.city}
                    onChange={(e) => setShopData({ ...shopData, city: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Address - Optional */}
                <div>
                  <Label htmlFor="address">Street Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="e.g., Kenyatta Avenue, Shop 12"
                    value={shopData.address}
                    onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* KRA PIN - Optional with info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="kra-pin" className="text-blue-900 dark:text-blue-100">KRA PIN (Optional)</Label>
                    <Input
                      id="kra-pin"
                      placeholder="A123456789B"
                      value={shopData.kraPin}
                      onChange={(e) => setShopData({ ...shopData, kraPin: e.target.value.toUpperCase() })}
                      className="mt-1.5 bg-white dark:bg-background"
                      maxLength={11}
                    />
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      Leave blank if your business is not registered with KRA. You can add this later in settings.
                      Shops without KRA PIN can still operate but won't have tax compliance features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Shop Description - Optional */}
              <div>
                <Label htmlFor="description">Shop Description (Optional)</Label>
                <textarea
                  id="description"
                  placeholder="Brief description of your shop and what you sell..."
                  value={shopData.description}
                  onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                  className="mt-1.5 w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{shopData.description.length}/500 characters</p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Next: Admin Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Google Signup Option */}
              {!isGoogleFlow && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Or register with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => loginWithGoogle()}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="flex items-center gap-2 text-primary mb-4">
                <User className="h-5 w-5" />
                <h3 className="font-semibold">Admin Account</h3>
              </div>

              {/* Google Profile Banner */}
              {isGoogleFlow && googleProfile && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {googleProfile.avatarUrl ? (
                        <img 
                          src={googleProfile.avatarUrl} 
                          alt={googleProfile.name} 
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Signed in with Google
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">{googleProfile.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="admin-name">Full Name *</Label>
                  <Input
                    id="admin-name"
                    placeholder="Your full name"
                    value={adminData.name}
                    onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                    className="mt-1.5"
                    disabled={isGoogleFlow}
                  />
                </div>

                <div>
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    className="mt-1.5"
                    disabled={isGoogleFlow}
                  />
                </div>

                <div>
                  <Label htmlFor="admin-phone">Phone Number *</Label>
                  <Input
                    id="admin-phone"
                    placeholder="0712345678"
                    value={adminData.phone}
                    onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Required for M-Pesa payments & notifications</p>
                </div>

                {/* Password fields - only show for non-Google flow */}
                {!isGoogleFlow && (
                  <>
                    <div className="sm:col-span-2">
                      <Label htmlFor="admin-password">Password *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={adminData.password}
                          onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {adminData.password && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={adminData.confirmPassword}
                          onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading} size="lg">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function RegisterShopLoading() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense
export default function RegisterShopPage() {
  return (
    <Suspense fallback={<RegisterShopLoading />}>
      <RegisterShopContent />
    </Suspense>
  );
}
