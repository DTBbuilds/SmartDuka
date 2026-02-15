'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, AlertCircle, Lock, Clock, ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { AdminLoginForm } from '@/components/login-forms/admin-login';
import { CashierLoginForm } from '@/components/login-forms/cashier-login';
import { ThemeToggleOutline } from '@/components/theme-toggle';
import { getPreferredShop, getRecentShops, getPreferredRole } from '@/lib/device-memory';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'cashier'>(() => {
    if (typeof window !== 'undefined') {
      return getPreferredRole() || 'admin';
    }
    return 'admin';
  });
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
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);

  const { login, loginWithPin, loginWithGoogle, enterDemoMode, isAuthenticated, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const googleError = searchParams.get('error');
  const expired = searchParams.get('expired');
  const logoutReason = searchParams.get('reason');

  useEffect(() => {
    if (authLoading) return;
    
    if (isAuthenticated && user) {
      const redirectTo = searchParams.get('redirect') || (user.role === 'cashier' ? '/pos' : user.role === 'super_admin' ? '/super-admin' : '/admin');
      router.replace(redirectTo);
    }
  }, [isAuthenticated, user, authLoading, router, searchParams]);

  useEffect(() => {
    fetchShops();
    // Check if Google OAuth is configured
    fetch(`${config.apiUrl}/auth/google/status`)
      .then(res => res.json())
      .then(data => setGoogleConfigured(!!data?.configured))
      .catch(() => setGoogleConfigured(false));
    if (googleError) {
      setError(decodeURIComponent(googleError));
    }
    if (expired === 'true') {
      setSessionExpired(true);
    }
    if (logoutReason === 'inactivity') {
      setError('You were logged out due to inactivity. Please log in again.');
    }
  }, [googleError, expired, logoutReason]);

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

  // Helper to format user-friendly error messages
  const getLoginErrorMessage = (error: string, role: 'admin' | 'cashier' | 'super_admin') => {
    const lowerError = error.toLowerCase();
    
    // User not found / Invalid credentials
    if (lowerError.includes('invalid credentials') || lowerError.includes('user not found')) {
      if (role === 'admin') {
        return {
          title: 'Account not found',
          message: 'No admin account found with this email and password combination.',
          actions: [
            'Check that you selected the correct shop',
            'Verify your email address is spelled correctly',
            'Make sure you\'re using the right password',
            'If you\'re new, ask the shop owner to create an account for you',
          ]
        };
      } else if (role === 'cashier') {
        return {
          title: 'Invalid PIN or not registered',
          message: 'The PIN you entered is incorrect or you\'re not registered as a cashier for this shop.',
          actions: [
            'Make sure you selected the correct shop',
            'Check that your PIN is entered correctly (4-6 digits)',
            'Contact your shop admin to verify your cashier account',
          ]
        };
      }
    }
    
    // Account inactive/suspended
    if (lowerError.includes('inactive') || lowerError.includes('suspended') || lowerError.includes('disabled')) {
      return {
        title: 'Account suspended',
        message: 'Your account has been suspended or deactivated.',
        actions: [
          'Contact your shop administrator for assistance',
          'Your account may have been disabled for security reasons',
        ]
      };
    }
    
    // Shop not found
    if (lowerError.includes('shop not found') || lowerError.includes('invalid shop')) {
      return {
        title: 'Shop not found',
        message: 'The selected shop could not be found or has been removed.',
        actions: [
          'Select a different shop from the list',
          'The shop may have been deleted or suspended',
          'Contact SmartDuka support if you believe this is an error',
        ]
      };
    }
    
    // Network/server errors
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return {
        title: 'Connection error',
        message: 'Unable to connect to SmartDuka servers.',
        actions: [
          'Check your internet connection',
          'Try again in a few moments',
          'If the problem persists, contact support',
        ]
      };
    }
    
    // Default error
    return {
      title: 'Login failed',
      message: error || 'An unexpected error occurred during login.',
      actions: [
        'Please check your credentials and try again',
        'If the problem persists, contact support',
      ]
    };
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
      // Mark login as successful and redirect immediately
      setLoginSuccess(true);
      const redirectTo = searchParams.get('redirect') || '/admin';
      // Use window.location for more reliable redirect after state changes
      window.location.href = redirectTo;
    } catch (err: any) {
      const errorInfo = getLoginErrorMessage(err.message || 'Login failed', 'admin');
      setError(`${errorInfo.title}: ${errorInfo.message}`);
      setIsLoading(false);
    }
  };

  const handleCashierLogin = async (pin: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithPin(pin, shopId);
      const selectedShop = shops.find(s => s.id === shopId);
      if (selectedShop?.status === 'pending' || selectedShop?.demoMode) {
        // Pass the shop directly since state might not be updated yet
        enterDemoMode(selectedShop as any);
      }
      // Mark login as successful and redirect immediately
      setLoginSuccess(true);
      const redirectTo = searchParams.get('redirect') || '/pos';
      // Use window.location for more reliable redirect after state changes
      window.location.href = redirectTo;
    } catch (err: any) {
      const errorInfo = getLoginErrorMessage(err.message || 'Login failed', 'cashier');
      setError(`${errorInfo.title}: ${errorInfo.message}`);
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
      // Mark login as successful and redirect immediately
      setLoginSuccess(true);
      // Use window.location for more reliable redirect after state changes
      window.location.href = '/super-admin';
    } catch (err: any) {
      const errorInfo = getLoginErrorMessage(err.message || 'Login failed', 'super_admin');
      setSuperAdminError(`${errorInfo.title}: ${errorInfo.message}`);
      setSuperAdminLoading(false);
    }
  };

  // Show loading while checking auth or loading shops
  if (loadingShops || authLoading || loginSuccess) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">{loginSuccess ? 'Redirecting...' : 'Connecting to SmartDuka...'}</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-orange-500 rounded-xl">
            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold text-foreground">SmartDuka</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link 
            href="/register-shop" 
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            Register Shop
          </Link>
          <ThemeToggleOutline />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Login Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>Sign in to your SmartDuka account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="flex justify-center">
                <div className="flex gap-1 p-1 bg-muted rounded-lg w-full max-w-xs">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                      role === 'admin' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => { setRole('admin'); setError(''); }}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                      role === 'cashier' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => { setRole('cashier'); setError(''); }}
                  >
                    Cashier
                  </button>
                </div>
              </div>

              {/* Session Expired Alert */}
              {sessionExpired && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-amber-700 dark:text-amber-300 text-sm">Your session has expired. Please log in again.</p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-destructive text-sm font-medium">{error}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Need help? <Link href="/register-shop" className="text-primary hover:underline">Register your shop</Link> or contact support.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Forms */}
              {role === 'admin' ? (
                <AdminLoginForm 
                  shops={shops} 
                  onSubmit={handleAdminLogin} 
                  isLoading={isLoading}
                  preferredShopId={getPreferredShop()?.id}
                  recentShops={getRecentShops()}
                />
              ) : (
                <CashierLoginForm 
                  shops={shops} 
                  onSubmit={handleCashierLogin} 
                  isLoading={isLoading}
                  preferredShopId={getPreferredShop()?.id}
                  recentShops={getRecentShops()}
                />
              )}

              {/* Divider */}
              {/* Google Login - only show when configured */}
              {googleConfigured && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 h-11"
                    onClick={() => loginWithGoogle()}
                    disabled={isLoading}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                  </Button>
                </>
              )}

              {/* Register Link */}
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register-shop" className="text-primary hover:underline font-medium">
                  Start free trial
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} SmartDuka. All rights reserved.
          </p>
        </div>
      </main>

      {/* Super Admin Login - Hidden */}
      <div className="fixed bottom-4 right-4 z-50">
        {!showSuperAdminLogin ? (
          <button
            onClick={() => setShowSuperAdminLogin(true)}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-slate-300 transition-all opacity-20 hover:opacity-50"
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
