'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Eye, EyeOff, AlertTriangle, Info } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{validationError}</p>
        </div>
      )}

      {/* Shop selector - full width */}
      <ShopSelector
        shops={shops}
        selectedShopId={shopId}
        onShopChange={setShopId}
        disabled={isLoading}
      />

      {/* Email & Password - side by side on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@shop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-xs">Password</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="h-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-9" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      {/* Help Text */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Not registered?</strong> Ask your shop admin to create an account for you, or <a href="/register-shop" className="text-primary hover:underline">register a new shop</a>.</p>
            <p><strong>Forgot password?</strong> Contact your shop administrator to reset it.</p>
          </div>
        </div>
      </div>
    </form>
  );
}
