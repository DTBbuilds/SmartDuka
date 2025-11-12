'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, AlertCircle, Lock } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { AdminLoginForm } from '@/components/login-forms/admin-login';
import { CashierLoginForm } from '@/components/login-forms/cashier-login';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminError, setSuperAdminError] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);

  const { login, loginWithPin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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

    if (superAdminEmail === 'smartduka@admin.auth' && superAdminPassword === 'duka-smart') {
      setSuperAdminLoading(true);
      try {
        await login(superAdminEmail, superAdminPassword, 'super_admin' as any);
        router.push('/super-admin');
      } catch (err: any) {
        setSuperAdminError(err.message || 'Login failed');
      } finally {
        setSuperAdminLoading(false);
      }
    } else {
      setSuperAdminError('Invalid credentials');
    }
  };

  if (loadingShops) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Login</CardTitle>
          <CardDescription>Choose your role to continue</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={role === 'admin' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setRole('admin');
                setError('');
              }}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant={role === 'cashier' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setRole('cashier');
                setError('');
              }}
            >
              Cashier
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Forms */}
          {role === 'admin' ? (
            <AdminLoginForm
              shops={shops}
              onSubmit={handleAdminLogin}
              isLoading={isLoading}
            />
          ) : (
            <CashierLoginForm
              shops={shops}
              onSubmit={handleCashierLogin}
              isLoading={isLoading}
            />
          )}

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>
              Don't have a shop yet?{' '}
              <a href="/register-shop" className="text-primary hover:underline font-medium">
                Register your shop
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Super Admin Login - Hidden in Bottom Corner */}
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
                  onClick={() => {
                    setShowSuperAdminLogin(false);
                    setSuperAdminEmail('');
                    setSuperAdminPassword('');
                    setSuperAdminError('');
                  }}
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
                  <input
                    type="email"
                    value={superAdminEmail}
                    onChange={(e) => setSuperAdminEmail(e.target.value)}
                    className="h-8 text-sm w-full px-3 py-2 border border-slate-300 rounded-lg"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Password</label>
                  <input
                    type="password"
                    value={superAdminPassword}
                    onChange={(e) => setSuperAdminPassword(e.target.value)}
                    className="h-8 text-sm w-full px-3 py-2 border border-slate-300 rounded-lg"
                    autoComplete="off"
                  />
                </div>

                {superAdminError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{superAdminError}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-8 text-sm" 
                  disabled={superAdminLoading}
                >
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
