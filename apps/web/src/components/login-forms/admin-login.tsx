'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Eye, EyeOff } from 'lucide-react';
import { ShopSelector } from '../shop-selector';

interface AdminLoginFormProps {
  shops: Array<{ id: string; name: string }>;
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <ShopSelector
        shops={shops}
        selectedShopId={shopId}
        onShopChange={setShopId}
        disabled={isLoading}
      />

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@shop.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative mt-1.5">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login as Admin'}
      </Button>
    </form>
  );
}
