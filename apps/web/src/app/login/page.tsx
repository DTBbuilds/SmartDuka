'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, AlertCircle, Lock, Store, BarChart3, Users, Shield, Sparkles, ArrowRight, Clock, Smartphone, CreditCard, Zap, CheckCircle, TrendingUp, Package, Receipt, Wifi } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { AdminLoginForm } from '@/components/login-forms/admin-login';
import { CashierLoginForm } from '@/components/login-forms/cashier-login';
import { ThemeToggleOutline } from '@/components/theme-toggle';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; shopId?: string; name: string; status?: 'pending' | 'verified' | 'active' | 'suspended'; demoMode?: boolean; demoExpiresAt?: string }>>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminError, setSuperAdminError] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const { login, loginWithPin, loginWithGoogle, enterDemoMode } = useAuth();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const googleError = searchParams.get('error');
  const expired = searchParams.get('expired');

  useEffect(() => {
    fetchShops();
    if (googleError) {
      setError(decodeURIComponent(googleError));
    }
    if (expired === 'true') {
      setSessionExpired(true);
    }
  }, [googleError, expired]);

  // Auto-rotate features in hero section
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const base = config.apiUrl;
      const res = await fetch(`${base}/shops`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      if (res.ok) {
        setShops(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch shops:', err);
    } finally {
      setLoadingShops(false);
    }
  };

  const handleAdminLogin = async (email: string, password: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, 'admin', shopId);
      const selectedShop = shops.find(s => s.id === shopId);
      if (selectedShop?.status === 'pending' || selectedShop?.demoMode) {
        // Pass the shop directly since state might not be updated yet
        enterDemoMode(selectedShop as any);
      }
      // Redirect directly to admin dashboard
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashierLogin = async (name: string, pin: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithPin(pin, shopId);
      const selectedShop = shops.find(s => s.id === shopId);
      if (selectedShop?.status === 'pending' || selectedShop?.demoMode) {
        // Pass the shop directly since state might not be updated yet
        enterDemoMode(selectedShop as any);
      }
      // Redirect directly to cashier dashboard
      router.push('/cashier/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminError('');
    if (!superAdminEmail.trim()) {
      setSuperAdminError('Email is required');
      return;
    }
    if (!superAdminPassword.trim()) {
      setSuperAdminError('Password is required');
      return;
    }
    setSuperAdminLoading(true);
    try {
      await login(superAdminEmail, superAdminPassword, 'super_admin' as any);
      router.push('/super-admin');
    } catch (err: any) {
      setSuperAdminError(err.message || 'Login failed');
    } finally {
      setSuperAdminLoading(false);
    }
  };

  if (loadingShops) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Connecting to SmartDuka...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Enhanced Interactive Hero */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-slate-900 p-8 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary to-orange-500 rounded-xl shadow-lg shadow-primary/30">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold text-white">SmartDuka</span>
              <p className="text-xs text-slate-400">Point of Sale & Inventory</p>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 space-y-4">
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold text-white leading-tight">
              Manage Your Business
              <span className="bg-gradient-to-r from-primary via-green-400 to-orange-400 bg-clip-text text-transparent"> Smarter & Faster</span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-md leading-relaxed">
              Complete POS for Kenyan retailers. M-Pesa payments, sales tracking, inventory management.
            </p>
          </div>

          {/* Interactive Feature Showcase */}
          <div className="space-y-2.5">
            {/* Feature Tabs */}
            <div className="flex gap-1.5">
              {[
                { icon: Smartphone, label: 'Payments' },
                { icon: Package, label: 'Inventory' },
                { icon: BarChart3, label: 'Analytics' },
                { icon: Users, label: 'Team' },
              ].map((tab, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Feature Content Cards */}
            <div className="relative h-48 overflow-hidden">
              {/* Payment Methods Feature */}
              <div className={`absolute inset-0 transition-all duration-500 ${activeFeature === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
                <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/30 backdrop-blur-sm rounded-lg p-4 border border-green-500/20 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Smartphone className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="text-base font-bold text-white">Accept Multiple Payments</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2.5">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium leading-tight">M-Pesa STK</p>
                        <p className="text-slate-400 text-[10px]">Instant push</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2.5">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Smartphone className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium leading-tight">Send Money</p>
                        <p className="text-slate-400 text-[10px]">Manual confirm</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2.5">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium leading-tight">Card/Stripe</p>
                        <p className="text-slate-400 text-[10px]">Visa, Mastercard</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2.5">
                      <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium leading-tight">Cash</p>
                        <p className="text-slate-400 text-[10px]">With change calc</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Feature */}
              <div className={`absolute inset-0 transition-all duration-500 ${activeFeature === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
                <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/30 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Package className="h-5 w-5 text-purple-400" />
                    </div>
                    <h3 className="text-base font-bold text-white">Smart Inventory</h3>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-xs">Barcode scanning (camera & hardware)</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-xs">Low stock alerts & auto-reorder</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-xs">Bulk import from CSV/Excel</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-xs">Multi-branch stock sync</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Feature */}
              <div className={`absolute inset-0 transition-all duration-500 ${activeFeature === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
                <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/30 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="text-base font-bold text-white">Real-time Analytics</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    <div className="bg-white/10 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-400 mb-1" />
                      <p className="text-white text-xs font-medium">Sales Trends</p>
                      <p className="text-slate-400 text-[10px]">Daily/Weekly/Monthly</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                      <Package className="h-5 w-5 text-purple-400 mb-1" />
                      <p className="text-white text-xs font-medium">Top Products</p>
                      <p className="text-slate-400 text-[10px]">Best sellers</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                      <Receipt className="h-5 w-5 text-orange-400 mb-1" />
                      <p className="text-white text-xs font-medium">Profit Reports</p>
                      <p className="text-slate-400 text-[10px]">Margins & costs</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                      <Zap className="h-5 w-5 text-yellow-400 mb-1" />
                      <p className="text-white text-xs font-medium">Live Dashboard</p>
                      <p className="text-slate-400 text-[10px]">Real-time updates</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Feature */}
              <div className={`absolute inset-0 transition-all duration-500 ${activeFeature === 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
                <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/30 backdrop-blur-sm rounded-lg p-4 border border-amber-500/20 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Users className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="text-base font-bold text-white">Team Management</h3>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <Shield className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span className="text-white text-xs">Role-based access (Admin, Manager, Cashier)</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <Lock className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-xs">Quick PIN login for cashiers</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <BarChart3 className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <span className="text-white text-xs">Employee performance tracking</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-lg p-2.5">
                      <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                      <span className="text-white text-xs">Shift management & activity logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`rounded-full transition-all duration-300 ${
                    activeFeature === index ? 'w-6 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            © 2024 SmartDuka
          </div>
          {/* Stats */}
          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-1">
              <Store className="h-3 w-3" />
              <span className="hidden sm:inline">500+ Shops</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-green-400" />
              <span className="hidden sm:inline">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col bg-background">
        {/* Top Bar - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground lg:hidden">SmartDuka</span>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/register-shop" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Register Shop
            </a>
            <ThemeToggleOutline />
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Title + Role in one row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Welcome back</h2>
                <p className="text-muted-foreground text-xs">Sign in to continue</p>
              </div>
              {/* Role Selection - Inline */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    role === 'admin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => { setRole('admin'); setError(''); }}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    role === 'cashier' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => { setRole('cashier'); setError(''); }}
                >
                  Cashier
                </button>
              </div>
            </div>

            {/* Session Expired Alert */}
            {sessionExpired && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-amber-700 dark:text-amber-300 text-xs">Your session has expired. Please log in again.</p>
              </div>
            )}

            {/* Error Alert - Compact */}
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-destructive text-xs">{error}</p>
              </div>
            )}

            {/* Forms */}
            {role === 'admin' ? (
              <AdminLoginForm shops={shops} onSubmit={handleAdminLogin} isLoading={isLoading} />
            ) : (
              <CashierLoginForm shops={shops} onSubmit={handleCashierLogin} isLoading={isLoading} />
            )}

            {/* Google + Register - Horizontal */}
            <div className="flex items-center gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={() => loginWithGoogle()}
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <span className="text-xs text-muted-foreground">or</span>
              <a 
                href="/login-pin" 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Lock className="h-4 w-4" />
                PIN Login
              </a>
            </div>

            {/* Bottom CTA - Compact */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              New here? <a href="/register-shop" className="text-primary hover:underline font-medium">Start free trial →</a>
            </p>

            {/* Mobile Feature Highlights - Only visible on mobile */}
            <div className="mt-6 lg:hidden">
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground text-center mb-3">Why SmartDuka?</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[8px] font-bold">M</span>
                    </div>
                    <span className="text-xs text-foreground font-medium">M-Pesa STK</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-foreground font-medium">Card Payments</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-xs text-foreground font-medium">Inventory</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-xs text-foreground font-medium">Analytics</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Free trial • No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Login - Hidden */}
      <div className="fixed bottom-4 right-4 z-50">
        {!showSuperAdminLogin ? (
          <button
            onClick={() => setShowSuperAdminLogin(true)}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-slate-300 transition-all opacity-30 hover:opacity-50"
            title="Admin Access"
          >
            <Lock className="h-4 w-4" />
          </button>
        ) : (
          <Card className="w-80 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Service Provider Access</CardTitle>
                <button
                  onClick={() => { setShowSuperAdminLogin(false); setSuperAdminEmail(''); setSuperAdminPassword(''); setSuperAdminError(''); }}
                  className="text-muted-foreground hover:text-foreground text-lg"
                >
                  ×
                </button>
              </div>
              <CardDescription className="text-xs">SmartDuka Administration</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSuperAdminLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Email</label>
                  <input type="email" value={superAdminEmail} onChange={(e) => setSuperAdminEmail(e.target.value)} className="h-8 text-sm w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Password</label>
                  <input type="password" value={superAdminPassword} onChange={(e) => setSuperAdminPassword(e.target.value)} className="h-8 text-sm w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" autoComplete="off" />
                </div>
                {superAdminError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{superAdminError}</p>
                  </div>
                )}
                <Button type="submit" className="w-full h-8 text-sm" disabled={superAdminLoading}>
                  {superAdminLoading ? 'Signing in...' : 'Access'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
