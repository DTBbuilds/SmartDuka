'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@smartduka/ui';
import { ShopSelector } from '../shop-selector';
import { User, Lock, Loader2, ArrowRight, Star, Clock } from 'lucide-react';
import { getPreferredShop, getRecentShops, getTimeSinceLastLogin, type RecentShop } from '@/lib/device-memory';

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
  onSubmit: (name: string, pin: string, shopId: string) => Promise<void>;
  isLoading?: boolean;
  preferredShopId?: string;
  recentShops?: RecentShop[];
}

export function CashierLoginForm({
  shops,
  onSubmit,
  isLoading = false,
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
  
  // Get saved name from recent shop if available
  const [name, setName] = useState(() => {
    const recent = recentShops.find(s => s.id === shopId);
    return recent?.lastUserName || '';
  });
  const [pin, setPin] = useState('');
  
  // Auto-skip to credentials if we have a preferred shop
  const hasPreferredShop = !!preferredShopId || !!getPreferredShop();
  const [step, setStep] = useState<'shop' | 'credentials'>(hasPreferredShop ? 'credentials' : 'shop');

  // Load saved name from localStorage or recent shop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // First check recent shops for this shop
    const deviceRecentShops = getRecentShops();
    const recentForShop = deviceRecentShops.find(s => s.id === shopId);
    if (recentForShop?.lastUserName) {
      setName(recentForShop.lastUserName);
      return;
    }
    // Fallback to localStorage
    const savedName = localStorage.getItem('smartduka:cashierName');
    if (savedName) setName(savedName);
  }, [shopId]);

  // Save name to localStorage when it changes
  useEffect(() => {
    if (name && typeof window !== 'undefined') {
      localStorage.setItem('smartduka:cashierName', name);
    }
  }, [name]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, pin, shopId);
  };

  const canProceedToCredentials = !!shopId;
  const canSubmit = name.trim().length > 0 && pin.length >= 4;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Quick Shop Indicator (when we have a preferred shop) */}
      {step === 'credentials' && hasPreferredShop && (
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
      <div className={step === 'credentials' ? 'hidden' : ''}>
        <ShopSelector
          shops={shops}
          selectedShopId={shopId}
          onShopChange={(id) => {
            setShopId(id);
            if (id) {
              // Load name for this shop if available
              const deviceRecentShops = getRecentShops();
              const recentForShop = deviceRecentShops.find(s => s.id === id);
              if (recentForShop?.lastUserName) {
                setName(recentForShop.lastUserName);
              }
              setStep('credentials');
            }
          }}
          disabled={isLoading}
          label="Step 1: Select Your Shop"
          placeholder="Tap to choose your shop..."
        />
      </div>

      {/* Continue Button (mobile-friendly) */}
      {step === 'shop' && canProceedToCredentials && (
        <Button
          type="button"
          onClick={() => setStep('credentials')}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Step 2: Credentials */}
      {step === 'credentials' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Step 2: Enter Your Name
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="h-14 pl-14 pr-4 text-base border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Step 3: Enter Your PIN
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
        </div>
      )}
    </form>
  );
}
