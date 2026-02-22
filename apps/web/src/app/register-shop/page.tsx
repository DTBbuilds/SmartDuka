"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Eye, EyeOff, Store, User, ArrowRight, ArrowLeft, Building2, MapPin, FileText, Info, CheckCircle, Loader2, BarChart3, Users, Shield, Zap, Package, Crown, Sparkles, Check, Star, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth, GoogleProfile } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { CartLoader } from "@/components/ui/cart-loader";
import { ThemeToggleOutline } from "@/components/theme-toggle";
import { api } from "@/lib/api-client";

// Subscription Plan Interface
interface SubscriptionPlan {
  _id: string;
  code: string;
  name: string;
  description?: string;
  dailyPrice?: number; // For daily plan (KES 99/day)
  monthlyPrice: number;
  annualPrice: number;
  setupPrice: number;
  maxShops: number;
  maxEmployees: number;
  maxProducts: number;
  features: string[];
  badge?: string;
  colorTheme?: string;
}

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

// Business types from shared package
import { getBusinessTypeOptions, getCategoryLabel } from '@smartduka/business-types';

const BUSINESS_TYPE_OPTIONS = getBusinessTypeOptions();

// Group business types by category for the dropdown
const BUSINESS_TYPES_GROUPED = BUSINESS_TYPE_OPTIONS.reduce((acc, bt) => {
  if (!acc[bt.category]) acc[bt.category] = [];
  acc[bt.category].push(bt);
  return acc;
}, {} as Record<string, typeof BUSINESS_TYPE_OPTIONS>);

const CATEGORY_ORDER = ['retail', 'food_beverage', 'health', 'service', 'specialty'];

// Plan color configurations
const planColors: Record<string, { 
  gradient: string; 
  border: string; 
  bg: string;
  ring: string;
  icon: string;
}> = {
  gray: {
    gradient: 'from-gray-500 to-gray-600',
    border: 'border-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    ring: 'ring-gray-500',
    icon: 'text-gray-600',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    border: 'border-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    ring: 'ring-orange-500',
    icon: 'text-orange-600',
  },
  blue: { 
    gradient: 'from-blue-500 to-blue-600', 
    border: 'border-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    ring: 'ring-blue-500',
    icon: 'text-blue-600',
  },
  green: { 
    gradient: 'from-emerald-500 to-emerald-600', 
    border: 'border-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    ring: 'ring-emerald-500',
    icon: 'text-emerald-600',
  },
  purple: { 
    gradient: 'from-violet-500 to-violet-600', 
    border: 'border-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    ring: 'ring-violet-500',
    icon: 'text-violet-600',
  },
  gold: { 
    gradient: 'from-amber-500 to-orange-500', 
    border: 'border-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    ring: 'ring-amber-500',
    icon: 'text-amber-600',
  },
};

function RegisterShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerShop, registerShopWithGoogle, loginWithGoogle } = useAuth();
  // FREE_MODE: Skip plan selection — start at shop info (step 2)
  const FREE_MODE = true;
  const [step, setStep] = useState(FREE_MODE ? 2 : 1); // 1: Plan selection (disabled), 2: Shop info, 3: Admin info, 4: OTP verification
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  
  // Subscription plans
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch(`${config.apiUrl}/auth/google/status`)
      .then(res => res.json())
      .then(data => setGoogleConfigured(!!data?.configured))
      .catch(() => setGoogleConfigured(false));
  }, []);
  
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

  // OTP verification state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP resend cooldown timer
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => setOtpResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  // Fetch subscription plans on mount (skip in FREE_MODE)
  useEffect(() => {
    if (FREE_MODE) {
      // Auto-select starter plan as default for backend compatibility
      setSelectedPlan({ _id: 'free', code: 'starter', name: 'Free', monthlyPrice: 0, annualPrice: 0, setupPrice: 0, maxShops: 999, maxEmployees: 999, maxProducts: 999, features: [] } as SubscriptionPlan);
      setLoadingPlans(false);
      return;
    }
    const fetchPlans = async () => {
      try {
        const plans = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
        const activePlans = (plans || []).filter((p: SubscriptionPlan) => p.code !== 'free');
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setSelectedPlan(activePlans[0]);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

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

  const handlePlanNext = () => {
    setError("");
    if (!selectedPlan) {
      setError("Please select a subscription plan");
      return;
    }
    setStep(2);
  };

  const handleShopNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateShopData()) {
      setStep(3);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    setOtpError('');
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtpCode(pastedData.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  const sendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch(`${config.apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminData.email, shopName: shopData.shopName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || 'Failed to send verification code');
        return false;
      }
      setOtpResendCooldown(60);
      return true;
    } catch {
      setOtpError('Failed to send verification code. Check your connection.');
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateAdminData()) return;
    if (!selectedPlan) {
      setError("Please select a subscription plan");
      setStep(1);
      return;
    }

    // For Google flow, skip OTP (Google already verified email)
    if (isGoogleFlow && googleProfile) {
      setIsLoading(true);
      try {
        const shopDataWithPlan = {
          ...shopData,
          subscriptionPlanCode: selectedPlan.code,
          billingCycle: billingCycle,
        };
        await registerShopWithGoogle(googleProfile, { ...shopDataWithPlan, phone: adminData.phone });
        router.push("/onboarding");
      } catch (err: any) {
        setError(err.message || "Registration failed");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For email registration, send OTP and go to verification step
    setIsLoading(true);
    const sent = await sendOtp();
    setIsLoading(false);
    if (sent) {
      setStep(4); // Go to OTP verification step
      setOtpCode(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  };

  const handleVerifyAndRegister = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the full 6-digit code');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      // Verify OTP first
      const verifyRes = await fetch(`${config.apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminData.email, code, type: 'registration' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.message || 'Invalid verification code');
        setOtpCode(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        setOtpLoading(false);
        return;
      }

      // OTP verified - now register
      const shopDataWithPlan = {
        ...shopData,
        subscriptionPlanCode: selectedPlan!.code,
        billingCycle: billingCycle,
      };
      await registerShop(shopDataWithPlan, adminData);
      router.push("/onboarding");
    } catch (err: any) {
      setOtpError(err.message || 'Registration failed');
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpResendCooldown > 0) return;
    await sendOtp();
    setOtpCode(['', '', '', '', '', '']);
    otpInputRefs.current[0]?.focus();
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
              <span className="text-sm text-white">100% free &amp; open source</span>
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
              <p className="text-muted-foreground text-sm">
                {FREE_MODE
                  ? `Step ${step <= 4 ? step - 1 : 3} of 3: ${step === 2 ? 'Shop Information' : step === 3 ? 'Admin Account' : 'Email Verification'}`
                  : `Step ${step} of 4: ${step === 1 ? 'Choose Plan' : step === 2 ? 'Shop Information' : step === 3 ? 'Admin Account' : 'Email Verification'}`
                }
              </p>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-1.5">
              {!FREE_MODE && (
                <>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= 1 ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                    {step > 1 ? <Check className="h-4 w-4" /> : "1"}
                  </div>
                  <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded">
                    <div className={`h-full rounded transition-all bg-primary ${step >= 2 ? "w-full" : "w-0"}`} />
                  </div>
                </>
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= 2 ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                {step > 2 ? <Check className="h-4 w-4" /> : (FREE_MODE ? "1" : "2")}
              </div>
              <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded">
                <div className={`h-full rounded transition-all bg-primary ${step >= 3 ? "w-full" : "w-0"}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= 3 ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                {step > 3 ? <Check className="h-4 w-4" /> : (FREE_MODE ? "2" : "3")}
              </div>
              <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded">
                <div className={`h-full rounded transition-all bg-primary ${step >= 4 ? "w-full" : "w-0"}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= 4 ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                {FREE_MODE ? "3" : "4"}
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
            /* Plan Selection Step */
            <div className="space-y-4">
              {/* Header with Billing Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Crown className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Choose Your Plan</h3>
                </div>
                
                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center bg-muted rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      billingCycle === 'monthly' 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      billingCycle === 'annual' 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Annual
                    <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">-17%</span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              {loadingPlans ? (
                <CartLoader size="sm" className="py-8" />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {plans.map((plan) => {
                    const colors = planColors[plan.colorTheme || 'blue'] || planColors['blue'];
                    // Compare by code since _id might not always be available
                    const isSelected = selectedPlan?.code === plan.code;
                    const isDaily = plan.code === 'daily';
                    const isTrial = plan.code === 'trial';
                    
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
                      price = billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
                      priceLabel = '/mo';
                    }
                    
                    return (
                      <div
                        key={plan.code}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative cursor-pointer rounded-lg p-3 transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-xl scale-[1.03] border-2 border-emerald-600' 
                            : 'bg-muted/50 border-2 border-border hover:border-primary/50 hover:shadow-md hover:bg-card'
                        }`}
                      >
                        {/* Badge */}
                        {plan.badge && !isSelected && (
                          <div className={`absolute -top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${colors.gradient}`}>
                            {plan.badge}
                          </div>
                        )}

                        {/* Selected Checkmark */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 bg-white text-emerald-600 w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-emerald-600">
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </div>
                        )}

                        {/* Plan Name */}
                        <h4 className={`text-sm font-bold mt-2 ${isSelected ? 'text-white' : 'text-foreground'}`}>{plan.name}</h4>

                        {/* Price */}
                        <div className="mt-2">
                          {isTrial ? (
                            <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>FREE</span>
                          ) : (
                            <>
                              <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                KES {price.toLocaleString()}
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{priceLabel}</span>
                            </>
                          )}
                        </div>

                        {/* Limits - Compact */}
                        <div className={`flex items-center gap-3 mt-2 text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {plan.maxShops}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {plan.maxEmployees}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {plan.maxProducts >= 10000 ? '∞' : plan.maxProducts}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 14-day trial notice + Selected Plan */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg mt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">14-Day Free Trial</span>
                </div>
                {selectedPlan && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">
                      {selectedPlan.name} - {selectedPlan.code === 'trial' ? 'FREE' : selectedPlan.code === 'daily' 
                        ? `KES ${(selectedPlan.dailyPrice || 99).toLocaleString()}/day`
                        : `KES ${(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`
                      }
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
                <Button 
                  type="button" 
                  onClick={handlePlanNext} 
                  disabled={!selectedPlan}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : step === 2 ? (
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
                    {CATEGORY_ORDER.map((cat) => (
                      BUSINESS_TYPES_GROUPED[cat] ? (
                        <optgroup key={cat} label={getCategoryLabel(cat)}>
                          {BUSINESS_TYPES_GROUPED[cat].map((bt) => (
                            <option key={bt.value} value={bt.value}>{bt.label}</option>
                          ))}
                        </optgroup>
                      ) : null
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

              {/* Selected Plan Reminder */}
              {selectedPlan && (
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="text-muted-foreground"> - KES {(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

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
                <Button type="submit" className="flex-1" size="lg">
                  Next: Admin Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

            </form>
          ) : step === 3 ? (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              {/* Google signup promoted as primary option */}
              {!isGoogleFlow && googleConfigured && (
                <>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      className="w-full flex items-center justify-center gap-3 h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                      onClick={() => loginWithGoogle()}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="font-medium">Continue with Google</span>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                      Recommended &mdash; no password needed, faster setup
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or register with email</span>
                    </div>
                  </div>
                </>
              )}

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

              {/* Selected Plan Reminder */}
              {selectedPlan && (
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="text-muted-foreground"> - KES {(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isGoogleFlow ? 'Creating Account...' : 'Sending Verification...'}
                    </>
                  ) : isGoogleFlow ? (
                    "Create Account"
                  ) : (
                    <>
                      Next: Verify Email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : step === 4 ? (
            /* Step 4: OTP Email Verification */
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                  <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">Verify Your Email</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  We sent a 6-digit verification code to
                </p>
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5 mt-1">
                  <Mail className="h-4 w-4" />
                  {adminData.email}
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Check your inbox and spam folder. Enter the code below to verify your email and complete registration.
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                      otpError ? 'border-destructive' : 'border-border'
                    }`}
                    disabled={otpLoading}
                  />
                ))}
              </div>

              {/* OTP Error */}
              {otpError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{otpError}</p>
                </div>
              )}

              {/* Verify & Register Button */}
              <Button
                onClick={handleVerifyAndRegister}
                disabled={otpLoading || otpCode.join('').length !== 6}
                className="w-full h-12 text-base"
                size="lg"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Verify &amp; Create Account
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="text-center">
                {otpResendCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-foreground">{otpResendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpSending}
                    className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {otpSending ? 'Sending...' : "Didn't receive the code? Resend"}
                  </button>
                )}
              </div>

              {/* Back */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(3); setOtpCode(['', '', '', '', '', '']); setOtpError(''); }}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function RegisterShopLoading() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <CartLoader size="lg" title="Loading..." />
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
