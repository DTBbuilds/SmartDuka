# SmartDuka Cashier MVP - Implementation Guide

## Overview

This guide provides step-by-step implementation for the Cashier MVP (Weeks 1-2), focusing on:
1. PIN-based login
2. Shift management
3. Enhanced dashboard
4. Transaction logging

---

## Phase 1: PIN-Based Login

### 1.1 Backend: User Schema Update

**File**: `apps/api/src/users/schemas/user.schema.ts`

**Changes**:
```typescript
@Prop({ required: false, trim: true })
pin?: string;  // Hashed PIN for quick login

@Prop({ required: false, unique: true, sparse: true })
cashierId?: string;  // Unique cashier ID (e.g., C001)

@Prop({ default: 15 })
sessionTimeout?: number;  // Session timeout in minutes

@Prop({ type: Object, default: {} })
permissions?: {
  canVoid?: boolean;
  canRefund?: boolean;
  canDiscount?: boolean;
  maxDiscountAmount?: number;
  maxRefundAmount?: number;
};
```

### 1.2 Backend: PIN Login Endpoint

**File**: `apps/api/src/auth/auth.controller.ts`

**New Endpoint**:
```typescript
@Post('login-pin')
async loginWithPin(@Body() body: { pin: string; shopId: string }) {
  return this.authService.loginWithPin(body.pin, body.shopId);
}
```

**File**: `apps/api/src/auth/auth.service.ts`

**New Method**:
```typescript
async loginWithPin(pin: string, shopId: string): Promise<{ token: string; user: User }> {
  // Find user by PIN and shop
  const user = await this.usersService.findByPin(pin, shopId);
  if (!user) {
    throw new UnauthorizedException('Invalid PIN');
  }
  
  // Generate JWT token
  const token = this.jwtService.sign({
    sub: user._id,
    email: user.email,
    role: user.role,
    shopId: user.shopId,
  });
  
  // Log login activity
  await this.activityService.logLogin(user._id, 'pin');
  
  return { token, user };
}

async setPin(userId: string, pin: string): Promise<void> {
  const hashedPin = await bcrypt.hash(pin, 10);
  await this.usersService.updatePin(userId, hashedPin);
}
```

### 1.3 Frontend: PIN Login Page

**File**: `apps/web/src/app/login-pin/page.tsx`

**New Page**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { Lock, ArrowLeft } from 'lucide-react';

export default function LoginPinPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [shopId, setShopId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid PIN');
      }

      const { token } = await res.json();
      localStorage.setItem('smartduka:token', token);
      router.push('/cashier/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Cashier Login</CardTitle>
          <CardDescription>Enter your PIN to login</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="mt-1.5 text-center text-2xl tracking-widest"
              />
            </div>

            <div>
              <Label htmlFor="shopId">Shop ID</Label>
              <Input
                id="shopId"
                placeholder="Your shop ID"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || pin.length < 4}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 2: Shift Management

### 2.1 Backend: Shift Schema

**File**: `apps/api/src/shifts/schemas/shift.schema.ts`

**New Schema**:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  cashierName: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  openingBalance: number;

  @Prop()
  closingBalance?: number;

  @Prop()
  expectedCash?: number;

  @Prop()
  actualCash?: number;

  @Prop()
  variance?: number;

  @Prop({ enum: ['open', 'closed', 'reconciled'], default: 'open' })
  status: 'open' | 'closed' | 'reconciled';

  @Prop()
  notes?: string;

  @Prop()
  reconciliedBy?: Types.ObjectId;

  @Prop()
  reconciliedAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
ShiftSchema.index({ shopId: 1, cashierId: 1, startTime: -1 });
ShiftSchema.index({ shopId: 1, status: 1 });
```

### 2.2 Backend: Shift Service

**File**: `apps/api/src/shifts/shifts.service.ts`

**Key Methods**:
```typescript
@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async clockIn(shopId: string, cashierId: string, openingBalance: number): Promise<Shift> {
    const shift = new this.shiftModel({
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
      startTime: new Date(),
      openingBalance,
      status: 'open',
    });
    return shift.save();
  }

  async clockOut(shiftId: string): Promise<Shift> {
    return this.shiftModel.findByIdAndUpdate(
      shiftId,
      { endTime: new Date(), status: 'closed' },
      { new: true },
    );
  }

  async getCurrentShift(shopId: string, cashierId: string): Promise<Shift | null> {
    return this.shiftModel.findOne({
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
      status: 'open',
    });
  }

  async reconcileShift(shiftId: string, actualCash: number, reconciliedBy: string): Promise<Shift> {
    const shift = await this.shiftModel.findById(shiftId);
    const expectedCash = shift.openingBalance + (shift.closingBalance - shift.openingBalance);
    const variance = actualCash - expectedCash;

    return this.shiftModel.findByIdAndUpdate(
      shiftId,
      {
        actualCash,
        variance,
        status: 'reconciled',
        reconciliedBy: new Types.ObjectId(reconciliedBy),
        reconciliedAt: new Date(),
      },
      { new: true },
    );
  }
}
```

### 2.3 Frontend: Shift Management Pages

**File**: `apps/web/src/app/cashier/shift-start/page.tsx`

**New Page**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { Clock, DollarSign } from 'lucide-react';

export default function ShiftStartPage() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shifts/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopId: shop?.id,
          cashierId: user?.sub,
          openingBalance: parseFloat(openingBalance),
        }),
      });

      if (!res.ok) throw new Error('Failed to start shift');

      const shift = await res.json();
      localStorage.setItem('smartduka:shift', JSON.stringify(shift));
      router.push('/cashier/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Start Your Shift</CardTitle>
          <CardDescription>Enter your opening cash balance</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleClockIn} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <Label>Shop</Label>
              <div className="mt-1.5 p-3 bg-slate-50 rounded border">
                {shop?.name}
              </div>
            </div>

            <div>
              <Label htmlFor="opening">Opening Balance (Ksh)</Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="opening"
                  type="number"
                  placeholder="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-8"
                  step="0.01"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Starting...' : 'Start Shift'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 3: Enhanced Dashboard

### 3.1 Updated Cashier Dashboard

**File**: `apps/web/src/app/cashier/dashboard/page.tsx`

**Enhancements**:
```typescript
// Add shift information
const [shift, setShift] = useState<Shift | null>(null);

useEffect(() => {
  const shiftData = localStorage.getItem('smartduka:shift');
  if (shiftData) {
    setShift(JSON.parse(shiftData));
  }
}, []);

// Add to dashboard JSX:
<Card>
  <CardHeader>
    <CardTitle>Current Shift</CardTitle>
  </CardHeader>
  <CardContent>
    {shift ? (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Start Time:</span>
          <span className="font-semibold">{new Date(shift.startTime).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Opening Balance:</span>
          <span className="font-semibold">{formatCurrency(shift.openingBalance)}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-semibold">{calculateDuration(shift.startTime)}</span>
        </div>
      </div>
    ) : (
      <Button onClick={() => router.push('/cashier/shift-start')}>
        Start Shift
      </Button>
    )}
  </CardContent>
</Card>
```

---

## Phase 4: Transaction Logging

### 4.1 Backend: Transaction Update

**File**: `apps/api/src/sales/schemas/order.schema.ts`

**Add Fields**:
```typescript
@Prop({ type: Types.ObjectId, required: true })
cashierId: Types.ObjectId;

@Prop({ required: true })
cashierName: string;

@Prop({ type: Types.ObjectId })
shiftId?: Types.ObjectId;

@Prop({ enum: ['sale', 'void', 'return'], default: 'sale' })
transactionType: 'sale' | 'void' | 'return';
```

### 4.2 Frontend: Receipt Update

**File**: `apps/web/src/lib/receipt-generator.ts`

**Add to Receipt**:
```typescript
export interface ReceiptData {
  // ... existing fields
  cashierName: string;
  cashierId: string;
  shiftId: string;
  transactionType: 'sale' | 'void' | 'return';
}

// In receipt template:
<div className="text-center text-xs mt-4 pt-4 border-t">
  <p>Cashier: {data.cashierName}</p>
  <p>ID: {data.cashierId}</p>
  <p>Shift: {data.shiftId}</p>
</div>
```

---

## Implementation Checklist

### Week 1
- [ ] Update User schema with PIN fields
- [ ] Create PIN login endpoint
- [ ] Create PIN login page
- [ ] Test PIN login flow
- [ ] Create Shift schema
- [ ] Create Shift service
- [ ] Create clock-in endpoint
- [ ] Create clock-out endpoint

### Week 2
- [ ] Create shift-start page
- [ ] Create shift-end page
- [ ] Update cashier dashboard
- [ ] Add shift information to dashboard
- [ ] Update transaction schema
- [ ] Update receipt generator
- [ ] Test end-to-end flow
- [ ] Create documentation

---

## Testing Checklist

### PIN Login
- [ ] PIN validation (4-6 digits)
- [ ] Invalid PIN rejection
- [ ] Session creation
- [ ] Token storage
- [ ] Auto-logout after timeout

### Shift Management
- [ ] Clock-in with opening balance
- [ ] Clock-out
- [ ] Current shift retrieval
- [ ] Shift reconciliation
- [ ] Shift history

### Dashboard
- [ ] Shift information display
- [ ] Sales metrics
- [ ] Transaction list
- [ ] Real-time updates
- [ ] Offline capability

---

## Deployment Notes

### Database Migrations
```bash
# Create indexes
db.shifts.createIndex({ shopId: 1, cashierId: 1, startTime: -1 })
db.shifts.createIndex({ shopId: 1, status: 1 })
db.users.createIndex({ cashierId: 1 }, { unique: true, sparse: true })
```

### Environment Variables
```
# .env
CASHIER_SESSION_TIMEOUT=15  # minutes
PIN_LENGTH=6
PIN_MIN_LENGTH=4
```

### Rollback Plan
- Keep email login as fallback
- PIN login optional initially
- Gradual rollout to test shops first
- Monitor error rates

---

## Success Metrics

### Performance
- PIN login < 2 seconds
- Shift clock-in < 1 second
- Dashboard load < 2 seconds

### Adoption
- 80% of cashiers using PIN login within 1 week
- 100% shift clock-in compliance
- Zero data loss during shifts

### Accuracy
- 100% transaction logging
- 100% shift reconciliation
- Zero missing receipts

---

## Next Steps

After MVP completion:
1. Gather cashier feedback
2. Optimize based on usage patterns
3. Plan Phase 1 (void/refund management)
4. Plan Phase 2 (monitoring dashboard)
5. Plan Phase 3 (biometric auth)

---

**Estimated Timeline**: 2 weeks
**Estimated Effort**: 80-100 development hours
**Testing Time**: 20-30 hours
**Total**: 100-130 hours
