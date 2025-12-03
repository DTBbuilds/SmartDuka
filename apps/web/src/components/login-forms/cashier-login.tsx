'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { NumericKeypad } from '../numeric-keypad';
import { ShopSelector } from '../shop-selector';

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
    // Only allow digits
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Shop & Name - side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ShopSelector
          shops={shops}
          selectedShopId={shopId}
          onShopChange={setShopId}
          disabled={isLoading}
        />
        <div>
          <Label htmlFor="name" className="text-xs">Your Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
            className="mt-1 h-9"
          />
        </div>
      </div>

      {/* PIN with inline dots */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="pin" className="text-xs">PIN Code</Label>
          <div className="flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < pin.length ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="relative mt-1">
          <Input
            id="pin"
            type="password"
            placeholder="••••"
            value={pin}
            onChange={handlePinChange}
            onKeyDown={handlePinKeyDown}
            maxLength={6}
            disabled={isLoading}
            className="h-9 text-center text-lg tracking-widest font-bold"
          />
        </div>
      </div>

      {/* Compact Keypad */}
      <NumericKeypad
        onInput={handlePinInput}
        onClear={handleClear}
        disabled={isLoading}
      />

      <Button type="submit" className="w-full h-9" disabled={isLoading || pin.length < 4}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
