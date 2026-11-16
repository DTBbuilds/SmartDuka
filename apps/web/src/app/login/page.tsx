'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, AlertCircle, Lock, Clock, ArrowLeft, Mail, Loader2, ShieldCheck, Store, UserRound, ScanLine, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { AdminLoginForm } from '@/components/login-forms/admin-login';
import { CashierLoginForm } from '@/components/login-forms/cashier-login';
import { LoginWorkspaceIntro } from '@/components/login-forms/login-workspace-intro';
import { ThemeToggleOutline } from '@/components/theme-toggle';
import { getPreferredShop, getRecentShops, getPreferredRole } from '@/lib/device-memory';

export default function LoginPage() {
  // The initial render is stable across SSR/hydration; device role is restored after mount.
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  useEffect(() => {
    const savedRole = getPreferredRole();
    if (savedRole === 'admin' || savedRole === 'cashier') setRole(savedRole);
  }, []);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; shopId?: string; name: string; status?: 'pending' | 'verified' | 'active' | 'suspended'; demoMode?: boolean; demoExpiresAt?: string }>>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [shopLoadError, setShopLoadError] = useState(false);
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminError, setSuperAdminError] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);

  // OTP verification state
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpUserName, setOtpUserName] = useState('');
  const [otpShopName, setOtpShopName] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Handle Google OAuth OTP redirect — OAUTH-SEC2: the user/shop
  // details arrive via a one-time exchange ticket (no personal
  // information in the URL).
  useEffect(() => {
    const otpFlag = searchParams.get('otp');
    const otpTicket = searchParams.get('otp_ticket');
    if (otpFlag === 'true' && otpTicket) {
      (async () => {
        try {
          const res = await fetch(`${config.apiUrl}/auth/oauth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ticket: otpTicket }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.email) {
            setError('Your sign-in session has expired. Please sign in again.');
            return;
          }
          setOtpEmail(data.email);
          setOtpUserName(data.userName || '');
          setOtpShopName(data.shopName || '');
          setOtpCode(['', '', '', '', '', '']);
          setOtpError('');
          setShowOtpVerification(true);
          setOtpResendCooldown(60);
          setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        } catch {
          setError('Could not reach the server. Please sign in again.');
        }
      })();
    }
  }, []); // run once on mount

  useEffect(() => {
    fetchShops();
    // Check if Google OAuth is configured
    fetch(`${config.apiUrl}/auth/google/status`)
      .then(res => res.json())
      .then(data => setGoogleConfigured(!!data?.configured))
      .catch(() => setGoogleConfigured(false));
    if (googleError) {
      // Never render OAuth error text from an untrusted redirect URL.
      setError('Google sign-in was not completed. Please try again.');
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
      setShopLoadError(false);
      const base = config.apiUrl;
      const res = await fetch(`${base}/shops`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      if (!res.ok || !Array.isArray(data)) {
        throw new Error('Shop directory is currently unavailable');
      }
      setShops(data);
    } catch (err) {
      console.error('Failed to fetch shops:', err);
      setShopLoadError(true);
      setShops([]);
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
      message: 'Please check your sign-in details and try again. If the problem continues, contact support.',
      actions: [
        'Please check your credentials and try again',
        'If the problem persists, contact support',
      ]
    };
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
      const newOtp = pastedData.split('');
      setOtpCode(newOtp);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyLoginOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the full 6-digit code');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${config.apiUrl}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: otpEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || 'Invalid verification code');
        setOtpCode(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        setOtpLoading(false);
        return;
      }
      // Success - store tokens and redirect
      const { tokens, user: userData, shop: shopData } = data;
      const authToken = tokens?.accessToken;
      if (!authToken) {
        setOtpError('Authentication failed. Please try again.');
        setOtpLoading(false);
        return;
      }
      // Import and use secure session utilities
      const { storeToken, storeShop, storeUser, storeCsrfToken, resetRefreshAttempts } = await import('@/lib/secure-session');
      const decoded = JSON.parse(atob(authToken.split('.')[1]));
      storeToken(authToken, tokens?.sessionId, tokens?.expiresIn, tokens?.refreshToken);
      storeShop(shopData);
      storeUser(userData);
      resetRefreshAttempts();
      if (tokens?.csrfToken) storeCsrfToken(tokens.csrfToken);
      setLoginSuccess(true);
      const redirectTo = searchParams.get('redirect') || (decoded.role === 'cashier' ? '/pos' : '/admin');
      window.location.href = redirectTo;
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed');
      setOtpLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (otpResendCooldown > 0) return;
    setOtpResending(true);
    try {
      const res = await fetch(`${config.apiUrl}/auth/resend-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, userName: otpUserName }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpResendCooldown(60);
        setOtpError('');
        setOtpCode(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        setOtpError(data.message || 'Failed to resend code');
      }
    } catch {
      setOtpError('Failed to resend code. Check your connection.');
    } finally {
      setOtpResending(false);
    }
  };

  // OTP resend cooldown timer
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => setOtpResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  const handleAdminLogin = async (email: string, password: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, 'admin', shopId);
      const selectedShop = shops.find(s => s.id === shopId);
      if (selectedShop?.status === 'pending' || selectedShop?.demoMode) {
        enterDemoMode(selectedShop as any);
      }
      setLoginSuccess(true);
      const redirectTo = searchParams.get('redirect') || '/admin';
      window.location.href = redirectTo;
    } catch (err: any) {
      // Handle email verification requirement
      if (err.requiresEmailVerification) {
        setOtpEmail(err.email);
        setOtpUserName(err.userName || '');
        setOtpShopName(err.shopName || '');
        setOtpCode(['', '', '', '', '', '']);
        setOtpError('');
        setShowOtpVerification(true);
        setOtpResendCooldown(60);
        setIsLoading(false);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }
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
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="flex min-h-16 items-center justify-between border-b border-border px-4 py-3 md:px-8">
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
      <main className="flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:py-10">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-10">
          <LoginWorkspaceIntro role={role} />
          <div className="mx-auto w-full max-w-[540px]">
          {/* Back to Home */}
          <Link 
            href="/" 
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* OTP Verification Card */}
          {showOtpVerification ? (
            <Card className="rounded-[1.5rem] border border-border/70 bg-card shadow-sm sm:shadow-lg">
              <CardHeader className="space-y-1 pb-4 text-center">
                <div className="mx-auto mb-2 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                  <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                <CardDescription>
                  We sent a 6-digit verification code to<br />
                  <span className="font-medium text-foreground">{otpEmail}</span>
                </CardDescription>
                {otpShopName && (
                  <p className="text-xs text-muted-foreground mt-1">Shop: {otpShopName}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-center text-muted-foreground">
                  Check your email inbox and spam folder for the code. This is a one-time verification to confirm your email address.
                </p>

                {/* OTP Input */}
                <div className="flex justify-center gap-1 sm:gap-2" onPaste={handleOtpPaste}>
                  {otpCode.map((digit, index) => (
                    <div key={index} className="relative">
                      <input
                        ref={el => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        aria-label={`Verification digit ${index + 1}`}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        className={`h-12 w-9 rounded-xl border-2 bg-background text-center text-xl font-bold sm:h-14 sm:w-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:scale-105 ${
                          digit ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
                        } ${otpError ? 'border-destructive animate-pulse' : ''} ${
                          otpLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
                        }`}
                        disabled={otpLoading}
                        autoFocus={index === 0}
                        placeholder="-"
                      />
                      {digit && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded-full animate-ping opacity-75"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Quick Paste Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.readText().then(text => {
                        const pastedData = text.replace(/\D/g, '').slice(0, 6);
                        if (pastedData.length === 6) {
                          const newOtp = pastedData.split('');
                          setOtpCode(newOtp);
                          otpInputRefs.current[5]?.focus();
                        }
                      }).catch(() => {
                        // Clipboard access denied
                      });
                    }}
                    className="text-xs"
                  >
                    📋 Paste from Clipboard
                  </Button>
                </div>

                {/* OTP Error */}
                {otpError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{otpError}</p>
                  </div>
                )}

                {/* Verify Button */}
                <Button
                  onClick={handleVerifyLoginOtp}
                  disabled={otpLoading || otpCode.join('').length !== 6}
                  className="w-full h-12 text-base"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Verify &amp; Sign In
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
                      onClick={handleResendLoginOtp}
                      disabled={otpResending}
                      className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      {otpResending ? 'Sending...' : "Didn't receive the code? Resend"}
                    </button>
                  )}
                </div>

                {/* Back to login */}
                <div className="text-center pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      setShowOtpVerification(false);
                      setOtpCode(['', '', '', '', '', '']);
                      setOtpError('');
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="inline h-3 w-3 mr-1" />
                    Back to login
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
          /* Login Card */
          <Card className="rounded-[1.5rem] border border-border/70 bg-card shadow-sm sm:shadow-lg">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                {role === 'cashier' ? <ScanLine aria-hidden="true" className="h-4 w-4" /> : <Store aria-hidden="true" className="h-4 w-4" />}
                {role === 'cashier' ? 'Cashier terminal' : 'Shop management'}
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {role === 'cashier' ? 'Ready for your shift?' : 'Welcome back to your shop'}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {role === 'cashier' ? 'Choose your shop and enter your staff PIN to access the POS.' : 'Choose your shop and sign in to manage the day’s business.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Session Expired Alert */}
              {sessionExpired && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-amber-700 dark:text-amber-300 text-sm">Your session has expired. Please log in again.</p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
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

              {/* No blank selector or false "no shops" on a network failure. */}
              {shopLoadError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <span>We couldn't load the shop directory. Check your connection and try again.</span>
                  <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => { void fetchShops(); }}>Retry shops</Button>
                </div>
              )}

              {/* Role-first: match the retail job before choosing a sign-in method. */}
              <section aria-labelledby="login-role-label" className="space-y-2">
                <p id="login-role-label" className="text-sm font-semibold text-foreground">Sign in as</p>
                <div role="group" aria-labelledby="login-role-label" className="flex w-full gap-1 rounded-xl bg-muted p-1">
                  <button type="button" aria-pressed={role === 'admin'}
                    onClick={() => { setRole('admin'); setError(''); }}
                    className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${role === 'admin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <UserRound aria-hidden="true" className="h-4 w-4" /> Admin
                  </button>
                  <button type="button" aria-pressed={role === 'cashier'}
                    onClick={() => { setRole('cashier'); setError(''); }}
                    className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${role === 'cashier' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <ScanLine aria-hidden="true" className="h-4 w-4" /> Cashier
                  </button>
                </div>
              </section>

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

              {/* Google is an admin alternative, not a competing cashier PIN action. */}
              {role === 'admin' && googleConfigured && (
                <div className="space-y-3 pt-1">
                  <div className="relative flex items-center justify-center text-xs uppercase text-muted-foreground">
                    <span className="absolute inset-x-0 border-t border-border" aria-hidden="true" />
                    <span className="relative bg-card px-3">Or sign in with Google</span>
                  </div>
                  <Button type="button" variant="outline" onClick={() => loginWithGoogle()}
                    disabled={isLoading} className="min-h-12 w-full gap-3 rounded-xl border-2 text-sm font-semibold">
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                    <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Register Link */}
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register-shop" className="text-primary hover:underline font-medium">
                  Register for free
                </Link>
              </p>
            </CardContent>
          </Card>
          )}

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} SmartDuka. All rights reserved.
          </p>
          </div>
        </div>
      </main>

      {/* Service provider access is separate from merchant sign-in. */}
      <div className="mx-auto w-full max-w-sm px-4 pb-6 text-center">
        {!showSuperAdminLogin ? (
          <button
            onClick={() => setShowSuperAdminLogin(true)}
            className="min-h-11 rounded-lg px-3 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Open service provider sign-in"
          >
            Service provider access
          </button>
        ) : (
          <Card className="w-full rounded-xl shadow-sm">
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
