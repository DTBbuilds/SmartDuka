'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { NumericKeypad } from '../numeric-keypad';
import { ShopSelector } from '../shop-selector';

interface CashierLoginFormProps {
  shops: Array<{ id: string; name: string }>;
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <ShopSelector
        shops={shops}
        selectedShopId={shopId}
        onShopChange={setShopId}
        disabled={isLoading}
      />

      <div>
        <Label htmlFor="name">Your Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="pin">PIN Code</Label>
        <div className="relative mt-1.5">
          <Input
            id="pin"
            type="password"
            placeholder="••••"
            value={pin}
            onChange={handlePinChange}
            onKeyDown={handlePinKeyDown}
            maxLength={6}
            autoFocus
            disabled={isLoading}
            className="text-center text-2xl tracking-widest font-bold"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-500">4-6 digits</p>
          <p className="text-xs text-slate-500">{pin.length}/6</p>
        </div>
        
        {/* Visual Progress Indicator */}
        <div className="flex gap-1 mt-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < pin.length
                  ? 'bg-green-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      <NumericKeypad
        onInput={handlePinInput}
        onClear={handleClear}
        disabled={isLoading}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || pin.length < 4}
      >
        {isLoading ? 'Logging in...' : 'Login as Cashier'}
      </Button>
    </form>
  );
}
