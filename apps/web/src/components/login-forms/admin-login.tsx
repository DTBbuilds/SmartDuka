'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Eye, EyeOff, AlertTriangle, ArrowRight, Store } from 'lucide-react';
import { ShopSelector } from '../shop-selector';

interface Shop {
  id: string;
  shopId?: string;
  name: string;
  status?: 'pending' | 'verified' | 'active' | 'suspended';
  demoMode?: boolean;
  demoExpiresAt?: string;
}

interface AdminLoginFormProps {
  shops: Shop[];
  onSubmit: (email: string, password: string, shopId: string) => Promise<void>;
  isLoading?: boolean;
  preferredShopId?: string;
  recentShops?: Array<{ id: string; name: string; lastUsed: number }>;
}

export function AdminLoginForm({
  shops,
  onSubmit,
  isLoading = false,
  preferredShopId,
  recentShops = [],
}: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Use preferred shop if available and exists in shops list, otherwise first shop
  const [shopId, setShopId] = useState(() => {
    if (preferredShopId && shops.some(s => s.id === preferredShopId)) {
      return preferredShopId;
    }
    return shops[0]?.id || '';
  });
  const [showPassword, setShowPassword] = useState(false);

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validate shop selection
    if (!shopId) {
      setValidationError('Please select your shop before signing in. If you don\'t see your shop, it may not be registered yet.');
      return;
    }

    // Validate email
    if (!email.trim()) {
      setValidationError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address (e.g., admin@yourshop.com).');
      return;
    }

    // Validate password
    if (!password.trim()) {
      setValidationError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    await onSubmit(email, password, shopId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Validation Error */}
      {validationError && (
        <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{validationError}</p>
        </div>
      )}

      {/* Make the selected merchant unmistakable before credentials. */}
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Store aria-hidden="true" className="h-4 w-4 text-primary" /> 1. Choose your shop
        </p>
        <ShopSelector
          shops={shops}
          selectedShopId={shopId}
          onShopChange={(id) => {
            setShopId(id);
            setValidationError('');
          }}
          disabled={isLoading}
          label="Shop"
        />
      </div>
      <p className="text-sm font-semibold text-foreground">2. Enter your account details</p>

      {/* Easy-to-read form on a counter tablet or phone; no narrow side-by-side fields. */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@shop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            inputMode="email"
            required
            className="mt-1 min-h-12 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              required
              className="min-h-12 rounded-xl pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <Button type="submit" className="min-h-14 w-full gap-2 rounded-xl text-base font-bold" disabled={isLoading}>
        {isLoading ? 'Opening your shop…' : 'Sign in to shop'}
        {!isLoading && <ArrowRight aria-hidden="true" className="h-5 w-5" />}
      </Button>

      {/* P1-13: self-service password recovery */}
      <div className="text-center">
        <a href="/forgot-password" className="text-xs text-primary hover:underline">
          Forgot your password?
        </a>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Working at an existing shop? Ask its owner to invite you.{' '}
        <a href="/register-shop" className="font-semibold text-primary underline-offset-2 hover:underline">Create a new shop</a>
      </p>
    </form>
  );
}
