'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@smartduka/ui';
import { ShopSelector } from '../shop-selector';
import { Lock, Loader2, ArrowRight, Star, Clock, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { getPreferredShop, type RecentShop } from '@/lib/device-memory';
import { config } from '@/lib/config';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preferredShopId,
  recentShops = [],
}: CashierLoginFormProps) {
  // Use preferred shop if available
  const [shopId, setShopId] = useState(() => {
    if (preferredShopId && shops.some(s => s.id === preferredShopId)) {
      return preferredShopId;
    }
    const preferred = getPreferredShop();
    if (preferred && shops.some(s => s.id === preferred.id)) {
      return preferred.id;
    }
    return shops[0]?.id || '';
  });
  
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
  
  // Auto-skip to PIN entry if we have a preferred shop
  const hasPreferredShop = !!preferredShopId || !!getPreferredShop();
  const [step, setStep] = useState<'shop' | 'pin'>(hasPreferredShop ? 'pin' : 'shop');

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{validationError}</p>
        </div>
      )}

      {/* Quick Shop Indicator (when we have a preferred shop) */}
      {step === 'pin' && hasPreferredShop && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {shops.find(s => s.id === shopId)?.name || 'Your Shop'}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Remembered from last login
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('shop')}
            className="text-xs text-primary hover:underline"
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
            setShopId(id);
            if (id) {
              setStep('pin');
            }
          }}
          disabled={isLoading}
          label="Step 1: Select Your Shop"
          placeholder="Tap to choose your shop..."
        />
      </div>

      {/* Continue Button (mobile-friendly) */}
      {step === 'shop' && canProceedToPin && (
        <Button
          type="button"
          onClick={() => setStep('pin')}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Step 2: PIN Entry */}
      {step === 'pin' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* PIN Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Step 2: Enter Your PIN
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
                placeholder="Enter 4-6 digit PIN"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                disabled={isLoading}
                autoFocus
                className="h-14 pl-14 pr-4 text-center text-xl tracking-[0.3em] font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">4-6 digit PIN from your admin</p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className={`
              w-full h-14 text-base font-semibold rounded-xl transition-all duration-200
              ${canSubmit 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }
            `}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Sign In to POS
              </>
            )}
          </Button>

          {/* Back to shop selection */}
          <button
            type="button"
            onClick={() => setStep('shop')}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2"
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
                <span>Sign up with Google</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Link your Google account for faster login (requires PIN once)
              </p>
            </>
          )}

          {/* Help Text for Cashiers */}
          <div className="p-3 bg-muted/50 rounded-lg mt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Don't have a PIN?</strong> Ask your shop administrator to create a cashier account for you.</p>
                <p><strong>Wrong shop?</strong> Make sure you select the correct shop where you are employed.</p>
                <p><strong>Forgot PIN?</strong> Contact your admin to reset your PIN.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
