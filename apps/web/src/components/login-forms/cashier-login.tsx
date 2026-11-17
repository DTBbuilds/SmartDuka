'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@smartduka/ui';
import { ShopSelector } from '../shop-selector';
import { Lock, Loader2, ArrowRight, Star, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { getPreferredShop, type RecentShop } from '@/lib/device-memory';
import { config } from '@/lib/config';
import { resolveCashierShopChoice } from '@/lib/login-workspace-state';

interface Shop {
  id: string;
  shopId?: string;
  name: string;
  status?: 'pending' | 'verified' | 'active' | 'suspended';
  demoMode?: boolean;
  demoExpiresAt?: string;
}

interface CashierLoginFormProps {
  shops: Shop[];
  onSubmit: (pin: string, shopId: string) => Promise<void>;
  isLoading?: boolean;
  preferredShopId?: string;
  recentShops?: RecentShop[];
}

export function CashierLoginForm({
  shops,
  onSubmit,
  isLoading = false,
  preferredShopId,
}: CashierLoginFormProps) {
  const [initialChoice] = useState(() =>
    resolveCashierShopChoice(shops, preferredShopId, getPreferredShop()?.id),
  );
  const [shopId, setShopId] = useState(initialChoice.shopId);
  const [pin, setPin] = useState('');
  const [validationError, setValidationError] = useState('');
  const [googleConfigured, setGoogleConfigured] = useState(false);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch(`${config.apiUrl}/auth/google/status`)
      .then(res => res.json())
      .then(data => setGoogleConfigured(!!data?.configured))
      .catch(() => setGoogleConfigured(false));
  }, []);
  
  const [step, setStep] = useState<'shop' | 'pin'>(initialChoice.step);
  const hasPreferredShop = !!shopId && shops.some(shop => shop.id === shopId) && step === 'pin';

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validate shop selection
    if (!shopId) {
      setValidationError('Please select your shop first. Your admin should have registered the shop already.');
      setStep('shop');
      return;
    }

    // Validate PIN
    if (!pin.trim()) {
      setValidationError('Please enter your PIN code.');
      return;
    }

    if (pin.length < 4) {
      setValidationError('PIN must be at least 4 digits. Contact your admin if you forgot your PIN.');
      return;
    }

    if (pin.length > 6) {
      setValidationError('PIN cannot be more than 6 digits.');
      return;
    }

    await onSubmit(pin, shopId);
  };

  const canProceedToPin = !!shopId;
  const canSubmit = pin.length >= 4;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Validation Error */}
      {validationError && (
        <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{validationError}</p>
        </div>
      )}

      {/* Quick Shop Indicator (when we have a preferred shop) */}
      {step === 'pin' && hasPreferredShop && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {shops.find(s => s.id === shopId)?.name || 'Your Shop'}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Selected shop · cashier access
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('shop')}
            className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Change
          </button>
        </div>
      )}

      {/* Step 1: Shop Selection */}
      <div className={step === 'pin' ? 'hidden' : ''}>
        <ShopSelector
          shops={shops}
          selectedShopId={shopId}
          onShopChange={(id) => {
            // Keep a prior shop's PIN out of the next shop's sign-in attempt.
            setPin('');
            setValidationError('');
            setShopId(id);
            if (id) setStep('pin');
          }}
          disabled={isLoading}
          label="1. Choose your shop"
          placeholder="Tap to choose your shop..."
        />
      </div>

      {/* Continue Button (mobile-friendly) */}
      {step === 'shop' && canProceedToPin && (
        <Button
          type="button"
          onClick={() => setStep('pin')}
          className="min-h-14 w-full gap-2 rounded-xl text-base font-bold"
        >
          Continue to PIN
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Step 2: PIN Entry */}
      {step === 'pin' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* PIN Input */}
          <div>
            <label htmlFor="pin"
              className="mb-2 block text-sm font-semibold text-foreground">
              2. Enter your cashier PIN
            </label>
            
            {/* PIN Input - uses device keyboard */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="4–6 digit PIN"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                autoComplete="off"
                aria-describedby="pin-help"
                disabled={isLoading}
                className="min-h-14 w-full rounded-xl border-2 border-border bg-background pl-14 pr-4 text-lg font-semibold tracking-normal focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <p id="pin-help" className="mt-2 text-xs text-muted-foreground">Enter the 4–6 digit PIN issued by your shop administrator. Never share your PIN.</p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="min-h-14 w-full gap-2 rounded-xl text-base font-bold"
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                Checking your PIN…
              </>
            ) : (
              <>
                <Lock aria-hidden="true" className="h-5 w-5" />
                Sign in to POS
                <ArrowRight aria-hidden="true" className="ml-1 h-5 w-5" />
              </>
            )}
          </Button>

          {/* Back to shop selection */}
          <button
            type="button"
            onClick={() => setStep('shop')}
            className="min-h-11 w-full rounded-lg text-center text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            ← Change shop
          </button>

          {/* Google Signup Option - Only show after shop is selected and when configured */}
          {shopId && googleConfigured && (
            <>
              <div className="relative mt-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Store selected shop in sessionStorage so callback can use it
                  sessionStorage.setItem('smartduka:cashier_google_shopId', shopId);
                  sessionStorage.setItem('smartduka:cashier_google_shopName', shops.find(s => s.id === shopId)?.name || '');
                  window.location.href = `${config.apiUrl}/auth/google/cashier`;
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 h-12 px-4 text-sm font-medium border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Set up Google sign-in</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Optional: link Google to your cashier account. Your shop may require PIN verification first.
              </p>
            </>
          )}

          <p className="rounded-xl bg-muted/50 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            Need a PIN or a reset? Ask your shop administrator. Only staff invited to this shop can sign in.
          </p>
        </div>
      )}
    </form>
  );
}
