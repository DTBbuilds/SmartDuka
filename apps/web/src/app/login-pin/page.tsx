'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@smartduka/ui';
import { Lock, ArrowLeft, AlertCircle, ShoppingCart, User, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { ThemeToggleOutline } from '@/components/theme-toggle';

export default function LoginPinPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);

    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/auth/login-cashier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid name or PIN');
      }

      const { token, user, shop } = data;

      localStorage.setItem('smartduka:token', token);
      localStorage.setItem('smartduka:user', JSON.stringify(user));
      localStorage.setItem('smartduka:shop', JSON.stringify(shop));

      if (user.role === 'cashier') {
        router.push('/pos');
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full max-w-[360px] mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold text-foreground">SmartDuka</span>
              </div>
              <ThemeToggleOutline />
            </div>

            {/* Login Card */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
              {/* Title */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Cashier Login</h1>
                <p className="text-muted-foreground text-sm mt-1">Enter your credentials to access POS</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Step 1: Name Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full">1</span>
                    Your Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11 text-base rounded-xl bg-background"
                      disabled={isLoading}
                      autoFocus
                      autoComplete="name"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">As registered by your admin</p>
                </div>

                {/* Step 2: PIN Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="text-sm font-medium flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full">2</span>
                    PIN Code
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter 4-6 digit PIN"
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      maxLength={6}
                      className="pl-10 h-11 text-base rounded-xl bg-background"
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">4-6 digit PIN from your admin</p>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold rounded-xl mt-2" 
                  disabled={isLoading || !name.trim() || pin.length < 4}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login to POS'
                  )}
                </Button>
              </form>
            </div>

            {/* Admin Login Link */}
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full h-10 text-sm rounded-xl text-muted-foreground hover:text-foreground mt-4" 
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin / Email Login
            </Button>

            {/* Help Tip */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                <strong>Need help?</strong> Contact your admin for login credentials.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                © 2024 SmartDuka. Built for Kenyan businesses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
