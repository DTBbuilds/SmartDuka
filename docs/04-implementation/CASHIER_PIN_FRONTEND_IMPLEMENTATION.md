# SmartDuka Cashier PIN Login - Frontend Implementation

**Status**: Ready for Implementation
**Priority**: HIGH
**Estimated Time**: 3-4 hours

---

## Phase 2: Frontend Login Page Redesign

### 2.1 Create Numeric Keypad Component

**File**: `apps/web/src/components/numeric-keypad.tsx` (NEW)

```typescript
'use client';

import { Button } from '@smartduka/ui';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  onInput: (digit: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  onInput,
  onClear,
  disabled = false,
}: NumericKeypadProps) {
  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', ''],
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {digits.map((row, rowIdx) => (
        <div key={rowIdx} className="contents">
          {row.map((digit, colIdx) => (
            <div key={`${rowIdx}-${colIdx}`}>
              {digit === '' ? (
                <div />
              ) : (
                <Button
                  type="button"
                  onClick={() => onInput(digit)}
                  disabled={disabled}
                  className="w-full h-12 text-lg font-semibold"
                  variant="outline"
                >
                  {digit}
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        onClick={onClear}
        disabled={disabled}
        variant="outline"
        className="col-span-3 h-12"
      >
        <Delete className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
}
```

### 2.2 Create Admin Login Form Component

**File**: `apps/web/src/components/login-forms/admin-login.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Eye, EyeOff } from 'lucide-react';

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
      <div>
        <Label htmlFor="shop">Shop</Label>
        <select
          id="shop"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          disabled={isLoading}
          className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-lg"
        >
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </div>

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
```

### 2.3 Create Cashier Login Form Component

**File**: `apps/web/src/components/login-forms/cashier-login.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { NumericKeypad } from '../numeric-keypad';

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

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, pin, shopId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="shop">Shop</Label>
        <select
          id="shop"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          disabled={isLoading}
          className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-lg"
        >
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </div>

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
            readOnly
            className="text-center text-2xl tracking-widest font-bold"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">4-6 digits</p>
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
```

### 2.4 Create PIN Display Modal

**File**: `apps/web/src/components/pin-display-modal.tsx` (NEW)

```typescript
'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@smartduka/ui';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PinDisplayModalProps {
  pin: string;
  cashierName: string;
  onClose: () => void;
}

export function PinDisplayModal({
  pin,
  cashierName,
  onClose,
}: PinDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>PIN Created Successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">Cashier: {cashierName}</p>
            <div className="bg-slate-100 p-4 rounded-lg text-center">
              <p className="text-xs text-slate-600 mb-2">PIN Code</p>
              <p className="text-3xl font-bold tracking-widest font-mono">{pin}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-xs text-blue-700">
              ⚠️ Save this PIN securely. It will only be shown once. Share it with the cashier via a secure channel.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy PIN
                </>
              )}
            </Button>
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2.5 Update Main Login Page

**File**: `apps/web/src/app/login/page.tsx` (REPLACE ENTIRE FILE)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { AdminLoginForm } from '@/components/login-forms/admin-login';
import { CashierLoginForm } from '@/components/login-forms/cashier-login';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingShops, setLoadingShops] = useState(false);

  const { login, loginWithPin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shops`);
      if (res.ok) {
        const data = await res.json();
        setShops(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch shops:', err);
    } finally {
      setLoadingShops(false);
    }
  };

  const handleAdminLogin = async (email: string, password: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, 'admin', shopId);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashierLogin = async (name: string, pin: string, shopId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithPin(pin, shopId);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingShops) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Login</CardTitle>
          <CardDescription>Choose your role to continue</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={role === 'admin' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setRole('admin');
                setError('');
              }}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant={role === 'cashier' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setRole('cashier');
                setError('');
              }}
            >
              Cashier
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Forms */}
          {role === 'admin' ? (
            <AdminLoginForm
              shops={shops}
              onSubmit={handleAdminLogin}
              isLoading={isLoading}
            />
          ) : (
            <CashierLoginForm
              shops={shops}
              onSubmit={handleCashierLogin}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2.6 Update Cashier Management Page

**File**: `apps/web/src/app/users/cashiers/page.tsx` (MODIFY)

Replace the form fields and handlers:

```typescript
// Update form state
const [formData, setFormData] = useState({
  name: "",
  phone: "",
});

const [generatedPin, setGeneratedPin] = useState('');
const [generatedCashierName, setGeneratedCashierName] = useState('');

// Update handleAddCashier
const handleAddCashier = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  if (!formData.name.trim()) {
    setError("Cashier name is required");
    return;
  }

  setIsSubmitting(true);

  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const res = await fetch(`${base}/users/cashier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        phone: formData.phone,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Failed to create cashier" }));
      throw new Error(errorData.message || "Failed to create cashier");
    }

    const { user: newCashier, pin } = await res.json();

    setGeneratedPin(pin);
    setGeneratedCashierName(newCashier.name);

    setFormData({ name: "", phone: "" });
    setShowAddForm(false);
    await fetchCashiers();
  } catch (err: any) {
    setError(err.message || "Failed to add cashier");
  } finally {
    setIsSubmitting(false);
  }
};

// Add PIN reset handler
const handleResetPin = async (cashierId: string, cashierName: string) => {
  if (!confirm(`Reset PIN for ${cashierName}?`)) return;

  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const res = await fetch(`${base}/users/${cashierId}/reset-pin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to reset PIN");

    const { pin } = await res.json();

    setGeneratedPin(pin);
    setGeneratedCashierName(cashierName);
  } catch (err: any) {
    setError(err.message || "Failed to reset PIN");
  }
};
```

---

## 📋 Frontend Implementation Checklist

- [ ] Create NumericKeypad component
- [ ] Create AdminLoginForm component
- [ ] Create CashierLoginForm component
- [ ] Create PinDisplayModal component
- [ ] Update main Login page
- [ ] Update Cashier Management page
- [ ] Test admin login form
- [ ] Test cashier login form
- [ ] Test numeric keypad
- [ ] Test PIN display modal
- [ ] Test on mobile devices
- [ ] Test accessibility

---

## 🧪 Frontend Testing Checklist

- [ ] Admin form shows email/password fields
- [ ] Cashier form shows name/PIN fields
- [ ] Role selection switches forms
- [ ] Numeric keypad enters digits
- [ ] Clear button clears PIN
- [ ] PIN masking works
- [ ] Shop dropdown populates
- [ ] Error messages display
- [ ] Loading states work
- [ ] Mobile responsive
- [ ] PIN modal displays
- [ ] Copy PIN button works

---

**Next**: Update Cashier Management UI (see CASHIER_PIN_ADMIN_UI.md)
