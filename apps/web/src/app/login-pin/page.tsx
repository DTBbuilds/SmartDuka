'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';

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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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

      // Store auth data
      localStorage.setItem('smartduka:token', token);
      localStorage.setItem('smartduka:user', JSON.stringify(user));
      localStorage.setItem('smartduka:shop', JSON.stringify(shop));

      // Redirect based on role
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Cashier PIN Login</CardTitle>
          <CardDescription>Quick access for cashiers</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="pin" className="text-sm font-medium">
                PIN Code
              </Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                maxLength={6}
                className="mt-1.5 text-center text-3xl tracking-widest font-bold"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">4-6 digits</p>
            </div>

            {showShopId && (
              <div>
                <Label htmlFor="shopId" className="text-sm font-medium">
                  Shop ID
                </Label>
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
              <Button
                type="button"
                variant="outline"
                className="w-full text-sm"
                onClick={() => setShowShopId(true)}
              >
                Enter Shop ID
              </Button>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || pin.length < 4 || !shopId.trim()}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => router.push('/login')}
              >
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
        </CardContent>
      </Card>
    </div>
  );
}
