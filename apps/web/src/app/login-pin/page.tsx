'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@smartduka/ui';
import { Lock, ArrowLeft, AlertCircle, ShoppingCart, Zap, Shield, Users } from 'lucide-react';
import { config } from '@/lib/config';
import { ThemeToggleOutline } from '@/components/theme-toggle';

export default function LoginPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [shopId, setShopId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showShopId, setShowShopId] = useState(false);

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (!shopId.trim()) {
      setError('Shop ID is required');
      return;
    }

    setIsLoading(true);

    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, shopId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(data.message || 'Invalid PIN or Shop ID');
      }

      const { token, user, shop } = await res.json();

      localStorage.setItem('smartduka:token', token);
      localStorage.setItem('smartduka:user', JSON.stringify(user));
      localStorage.setItem('smartduka:shop', JSON.stringify(shop));

      if (user.role === 'cashier') {
        router.push('/cashier/dashboard');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              Quick Access<br />
              <span className="text-primary">PIN Login</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-md">
              Fast and secure login for cashiers. Enter your PIN to start processing sales.
            </p>
          </div>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Instant access to POS</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Secure 4-6 digit PIN</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Multi-cashier support</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for Kenyan businesses.
        </div>
      </div>

      {/* Right Panel - PIN Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 overflow-y-auto bg-background">
        <div className="w-full max-w-sm">
          {/* Header with theme toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground lg:hidden">SmartDuka</span>
            </div>
            <ThemeToggleOutline />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Cashier PIN Login</h2>
            <p className="text-muted-foreground mt-1">Quick access for cashiers</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="pin" className="text-sm font-medium">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                maxLength={6}
                className="mt-1.5 text-center text-3xl tracking-widest font-bold h-16"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">4-6 digits</p>
            </div>

            {showShopId && (
              <div>
                <Label htmlFor="shopId" className="text-sm font-medium">Shop ID</Label>
                <Input
                  id="shopId"
                  placeholder="Enter your shop ID"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="mt-1.5"
                  disabled={isLoading}
                />
              </div>
            )}

            {!showShopId && (
              <Button type="button" variant="outline" className="w-full text-sm" onClick={() => setShowShopId(true)}>
                Enter Shop ID
              </Button>
            )}

            <Button type="submit" className="w-full h-12" disabled={isLoading || pin.length < 4 || !shopId.trim()}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="pt-2 border-t">
              <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => router.push('/login')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Email Login
              </Button>
            </div>
          </form>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> PIN login is faster for high-volume transactions. Ask your admin to set your PIN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
