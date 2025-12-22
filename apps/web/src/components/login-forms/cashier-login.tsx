'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@smartduka/ui';
import { NumericKeypad } from '../numeric-keypad';
import { ShopSelector } from '../shop-selector';
import { User, Lock, Loader2, ArrowRight } from 'lucide-react';

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
}

export function CashierLoginForm({
  shops,
  onSubmit,
  isLoading = false,
}: CashierLoginFormProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [shopId, setShopId] = useState(shops[0]?.id || '');
  const [step, setStep] = useState<'shop' | 'credentials'>('shop');

  // Load saved name from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedName = localStorage.getItem('smartduka:cashierName');
    if (savedName) setName(savedName);
  }, []);

  // Save name to localStorage when it changes
  useEffect(() => {
    if (name && typeof window !== 'undefined') {
      localStorage.setItem('smartduka:cashierName', name);
    }
  }, [name]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setPin(pin.slice(0, -1));
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, pin, shopId);
  };

  const canProceedToCredentials = !!shopId;
  const canSubmit = name.trim().length > 0 && pin.length >= 4;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Step 1: Shop Selection */}
      <div className={step === 'credentials' ? 'opacity-60' : ''}>
        <ShopSelector
          shops={shops}
          selectedShopId={shopId}
          onShopChange={(id) => {
            setShopId(id);
            if (id) setStep('credentials');
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
            
            {/* PIN Display Dots */}
            <div className="flex justify-center gap-3 mb-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    h-4 w-4 rounded-full transition-all duration-200
                    ${i < pin.length 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110 shadow-lg shadow-blue-500/30' 
                      : 'bg-slate-200 dark:bg-slate-700'
                    }
                  `}
                />
              ))}
            </div>

            {/* Hidden PIN Input for keyboard */}
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <Input
                id="pin"
                type="password"
                placeholder="Enter PIN or use keypad"
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handlePinKeyDown}
                maxLength={6}
                disabled={isLoading}
                className="h-14 pl-14 pr-4 text-center text-xl tracking-[0.5em] font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* Numeric Keypad */}
            <NumericKeypad
              onInput={handlePinInput}
              onClear={handleClear}
              disabled={isLoading}
            />
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
