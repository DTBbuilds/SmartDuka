'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Eye, EyeOff } from 'lucide-react';
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
}

export function AdminLoginForm({
  shops,
  onSubmit,
  isLoading = false,
}: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopId, setShopId] = useState(shops[0]?.id || '');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, shopId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
    </form>
  );
}
