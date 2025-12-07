'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, AlertCircle, Lock, Store, BarChart3, Users, Shield, Sparkles, ArrowRight, Clock } from 'lucide-react';
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

  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const base = config.apiUrl;
      const res = await fetch(`${base}/shops`);
      if (res.ok) {
        const data = await res.json();
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
      router.push('/');
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
      router.push('/');
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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Branding (Dark themed) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-slate-900 p-8 flex-col justify-between relative overflow-hidden">
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
        
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Manage Your Business<br />
              <span className="text-primary">Smarter & Faster</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-md">
              Complete POS solution for Kenyan retailers. Track sales, manage inventory, and grow your business.
            </p>
          </div>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Store className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Multi-branch Support</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Team Management</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Secure & Reliable</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for Kenyan businesses.
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
