# POS Checkout Flow - Implementation Guide

**Date**: Nov 8, 2025 | 10:32 PM UTC+03:00
**Status**: 📋 READY FOR IMPLEMENTATION
**Effort**: 13-19 hours
**Priority**: HIGH

---

## Quick Start

This guide provides step-by-step implementation instructions for:
1. Desktop layout redesign (landscape-first)
2. VAT configuration system
3. Tax calculation updates
4. Mobile responsiveness
5. Accessibility improvements

---

## Phase 1: Desktop Layout Redesign (4-6 hours)

### Step 1.1: Create New Layout Components

**File**: `apps/web/src/components/pos-layout-desktop.tsx`

```typescript
// Desktop layout wrapper
// - 60% products left, 40% cart right
// - Fixed bottom action bar
// - Sticky cart section
// - Large payment buttons
```

**File**: `apps/web/src/components/pos-cart-sidebar.tsx`

```typescript
// Cart sidebar component
// - Scrollable cart items
// - Sticky totals section
// - Payment method selection (2x2 grid)
// - Cash input
// - Checkout button
```

**File**: `apps/web/src/components/pos-checkout-bar.tsx`

```typescript
// Fixed bottom action bar
// - Hold Sale button
// - Clear Cart button
// - Apply Discount button
// - Manual Item button
// - Checkout button (prominent)
// - Receipt button
```

### Step 1.2: Update Main POS Page

**File**: `apps/web/src/app/pos/page.tsx`

**Changes**:
1. Import new layout components
2. Update main container to use new layout
3. Move cart section to sidebar
4. Move action buttons to bottom bar
5. Update responsive breakpoints

**Key Code**:
```typescript
// Before: Vertical layout
<div className="grid gap-4 md:grid-cols-3">
  {/* Products */}
  {/* Cart */}
</div>

// After: Horizontal layout
<div className="flex gap-4 h-[calc(100vh-200px)]">
  {/* Products: 60% */}
  <div className="flex-1 overflow-y-auto">
    {/* Products grid */}
  </div>
  
  {/* Cart: 40% */}
  <POSCartSidebar />
</div>

{/* Fixed bottom action bar */}
<POSCheckoutBar />
```

### Step 1.3: Update Payment Method Buttons

**Current**:
```typescript
<div className="grid gap-2 grid-cols-2 sm:grid-cols-2">
  {paymentOptions.map((option) => (
    <Button size="lg" className="h-12">
      {option.label}
    </Button>
  ))}
</div>
```

**Updated**:
```typescript
<div className="grid gap-3 grid-cols-2">
  {paymentOptions.map((option) => (
    <Button 
      key={option.id}
      onClick={() => handlePaymentMethodSelect(option.id)}
      variant={selectedPaymentMethod === option.id ? "default" : "outline"}
      size="lg"
      className={`
        h-20 flex flex-col items-center justify-center gap-2
        transition-all duration-200
        ${selectedPaymentMethod === option.id 
          ? 'ring-2 ring-primary ring-offset-2' 
          : 'hover:border-primary'
        }
      `}
      aria-pressed={selectedPaymentMethod === option.id}
    >
      <option.icon className="h-6 w-6" />
      <span className="text-sm font-semibold">{option.label}</span>
      {selectedPaymentMethod === option.id && (
        <Check className="h-4 w-4 absolute top-2 right-2" />
      )}
    </Button>
  ))}
</div>
```

### Step 1.4: Add Keyboard Shortcuts

**File**: `apps/web/src/hooks/use-pos-keyboard-shortcuts.ts`

```typescript
export function usePOSKeyboardShortcuts({
  onCheckout,
  onHoldSale,
  onClearCart,
  onApplyDiscount,
  onOpenScanner,
}: POSKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter: Checkout
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        onCheckout();
      }
      
      // Ctrl+H: Hold Sale
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        onHoldSale();
      }
      
      // Ctrl+C: Clear Cart
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        onClearCart();
      }
      
      // Ctrl+D: Apply Discount
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        onApplyDiscount();
      }
      
      // Ctrl+S: Open Scanner
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onOpenScanner();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCheckout, onHoldSale, onClearCart, onApplyDiscount, onOpenScanner]);
}
```

### Step 1.5: Test Responsive Breakpoints

**Breakpoints**:
- Desktop (1920px+): 60/40 split
- Laptop (1280px - 1920px): 60/40 split
- Tablet (768px - 1280px): 55/45 split
- Mobile (< 768px): Vertical stack

**Testing**:
```bash
# Test at different viewport sizes
- 1920x1080 (Desktop)
- 1366x768 (Laptop)
- 1024x768 (Tablet)
- 768x1024 (Tablet Portrait)
- 375x667 (Mobile)
```

---

## Phase 2: VAT Configuration System (3-4 hours)

### Step 2.1: Create Database Schema

**File**: `apps/api/src/shop-settings/shop-settings.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ShopSettings extends Document {
  @Prop({ required: true })
  shopId: string;

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0.16 }, // 16% for Kenya
      name: { type: String, default: 'VAT' },
      description: { type: String, default: 'Value Added Tax (16%)' },
      appliedByDefault: { type: Boolean, default: true },
    },
    default: {},
  })
  tax: {
    enabled: boolean;
    rate: number;
    name: string;
    description: string;
    appliedByDefault: boolean;
  };

  @Prop({ type: [String], default: [] })
  taxExemptProducts: string[];

  @Prop({ type: Map, of: Object, default: {} })
  categoryTaxRates: Record<string, { rate: number; exempt: boolean }>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShopSettingsSchema = SchemaFactory.createForClass(ShopSettings);
ShopSettingsSchema.index({ shopId: 1 });
```

### Step 2.2: Create Backend Service

**File**: `apps/api/src/shop-settings/shop-settings.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopSettings } from './shop-settings.schema';
import { CreateShopSettingsDto, UpdateShopSettingsDto } from './dto';

@Injectable()
export class ShopSettingsService {
  constructor(
    @InjectModel(ShopSettings.name) private model: Model<ShopSettings>,
  ) {}

  async getByShopId(shopId: string): Promise<ShopSettings> {
    let settings = await this.model.findOne({ shopId });
    
    if (!settings) {
      // Create default settings
      settings = await this.model.create({
        shopId,
        tax: {
          enabled: true,
          rate: 0.16,
          name: 'VAT',
          description: 'Value Added Tax (16%)',
          appliedByDefault: true,
        },
        taxExemptProducts: [],
        categoryTaxRates: {},
      });
    }
    
    return settings;
  }

  async update(
    shopId: string,
    dto: UpdateShopSettingsDto,
  ): Promise<ShopSettings> {
    return this.model.findOneAndUpdate(
      { shopId },
      { ...dto, updatedAt: new Date() },
      { new: true, upsert: true },
    );
  }

  async addTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $addToSet: { taxExemptProducts: productId } },
      { new: true },
    );
  }

  async removeTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $pull: { taxExemptProducts: productId } },
      { new: true },
    );
  }

  async setCategoryTaxRate(
    shopId: string,
    categoryId: string,
    rate: number,
    exempt: boolean,
  ): Promise<ShopSettings> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $set: { [`categoryTaxRates.${categoryId}`]: { rate, exempt } } },
      { new: true },
    );
  }
}
```

### Step 2.3: Create Backend Controller

**File**: `apps/api/src/shop-settings/shop-settings.controller.ts`

```typescript
import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ShopSettingsService } from './shop-settings.service';
import { UpdateShopSettingsDto } from './dto';

@Controller('shop-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopSettingsController {
  constructor(private service: ShopSettingsService) {}

  @Get(':shopId')
  async getSettings(@Param('shopId') shopId: string) {
    return this.service.getByShopId(shopId);
  }

  @Put(':shopId')
  @Roles('admin')
  async updateSettings(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopSettingsDto,
  ) {
    return this.service.update(shopId, dto);
  }

  @Post(':shopId/tax-exempt-products/:productId')
  @Roles('admin')
  async addTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.addTaxExemptProduct(shopId, productId);
  }

  @Delete(':shopId/tax-exempt-products/:productId')
  @Roles('admin')
  async removeTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.removeTaxExemptProduct(shopId, productId);
  }

  @Post(':shopId/category-tax-rates/:categoryId')
  @Roles('admin')
  async setCategoryTaxRate(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: { rate: number; exempt: boolean },
  ) {
    return this.service.setCategoryTaxRate(
      shopId,
      categoryId,
      body.rate,
      body.exempt,
    );
  }
}
```

### Step 2.4: Create Admin Settings Page

**File**: `apps/web/src/app/admin/settings/tax/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Switch, Label } from '@smartduka/ui';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';

export default function TaxSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/shop-settings/${user?.shopId}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shop-settings/${user?.shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      toast({ type: 'success', title: 'Saved', message: 'Tax settings updated' });
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tax Settings</h1>
        <p className="text-muted-foreground">Configure VAT and tax settings for your shop</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VAT Configuration</CardTitle>
          <CardDescription>Configure Value Added Tax (VAT) for Kenya</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable VAT</Label>
            <Switch
              checked={settings?.tax?.enabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  tax: { ...settings.tax, enabled: checked },
                })
              }
            />
          </div>

          <div>
            <Label>VAT Rate (%)</Label>
            <Input
              type="number"
              value={settings?.tax?.rate * 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tax: { ...settings.tax, rate: Number(e.target.value) / 100 },
                })
              }
              step="0.1"
              min="0"
              max="100"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current rate: {(settings?.tax?.rate * 100).toFixed(1)}%
            </p>
          </div>

          <div>
            <Label>Tax Name</Label>
            <Input
              value={settings?.tax?.name}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tax: { ...settings.tax, name: e.target.value },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Apply tax by default</Label>
            <Switch
              checked={settings?.tax?.appliedByDefault}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  tax: { ...settings.tax, appliedByDefault: checked },
                })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Tax Exempt Products Section */}
      {/* Category Tax Rates Section */}
    </div>
  );
}
```

---

## Phase 3: Tax Calculation Updates (2-3 hours)

### Step 3.1: Update POS Page Tax Calculation

**File**: `apps/web/src/app/pos/page.tsx`

**Current Code** (Line 433):
```typescript
const tax = Math.round(subtotalAfterDiscount * 0.02);
```

**Updated Code**:
```typescript
// Fetch shop settings on mount
const [shopSettings, setShopSettings] = useState(null);

useEffect(() => {
  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/shop-settings/${shopId}`);
      const data = await res.json();
      setShopSettings(data);
    } catch (err) {
      console.error('Failed to fetch shop settings:', err);
    }
  };
  
  fetchSettings();
}, [shopId]);

// Calculate tax with exemptions
const calculateTax = () => {
  if (!shopSettings?.tax?.enabled) return 0;
  
  let taxableAmount = 0;
  cartItems.forEach(item => {
    // Check if product is tax exempt
    if (!shopSettings.taxExemptProducts?.includes(item.productId)) {
      // Check category tax rate
      const categoryRate = shopSettings.categoryTaxRates?.[item.categoryId]?.rate 
        ?? shopSettings.tax.rate;
      
      if (!shopSettings.categoryTaxRates?.[item.categoryId]?.exempt) {
        taxableAmount += item.unitPrice * item.quantity;
      }
    }
  });
  
  return Math.round(taxableAmount * shopSettings.tax.rate);
};

const tax = calculateTax();
```

### Step 3.2: Update Cart Display

**File**: `apps/web/src/app/pos/page.tsx`

**Update totals display**:
```typescript
<div className="w-full text-sm">
  <div className="flex justify-between text-muted-foreground">
    <span>Subtotal</span>
    <span>{formatCurrency(subtotal)}</span>
  </div>
  
  {totalDiscount > 0 && (
    <div className="flex justify-between text-muted-foreground">
      <span>Discount</span>
      <span>-{formatCurrency(totalDiscount)}</span>
    </div>
  )}
  
  {shopSettings?.tax?.enabled && (
    <>
      <Separator className="my-2" />
      <div className="flex justify-between text-muted-foreground text-xs">
        <span>Subtotal (taxable)</span>
        <span>{formatCurrency(subtotalAfterDiscount)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{shopSettings.tax.name} ({(shopSettings.tax.rate * 100).toFixed(1)}%)</span>
        <span>{formatCurrency(tax)}</span>
      </div>
    </>
  )}
  
  <Separator className="my-2" />
  <div className="flex justify-between text-lg font-semibold">
    <span>Total due</span>
    <span>{formatCurrency(total)}</span>
  </div>
</div>
```

---

## Phase 4: Mobile Responsiveness (2-3 hours)

### Step 4.1: Update Responsive Classes

**Breakpoints**:
```typescript
// Desktop (1920px+)
className="flex gap-4"

// Laptop (1280px - 1920px)
className="md:flex md:gap-4"

// Tablet (768px - 1280px)
className="md:flex md:gap-3"

// Mobile (< 768px)
className="flex flex-col gap-4"
```

### Step 4.2: Mobile-Specific Optimizations

**Touch targets**: Minimum 44x44px
**Button spacing**: 8px gap
**Product grid**: 2 columns on mobile
**Cart**: Full width, collapsible

---

## Phase 5: Testing & Refinement (2-3 hours)

### Step 5.1: Unit Tests

```typescript
// Test tax calculation
describe('calculateTax', () => {
  it('should return 0 if tax disabled', () => {
    // ...
  });
  
  it('should apply correct rate', () => {
    // ...
  });
  
  it('should handle exemptions', () => {
    // ...
  });
});
```

### Step 5.2: Integration Tests

```typescript
// Test checkout flow
describe('Checkout Flow', () => {
  it('should calculate tax correctly', () => {
    // ...
  });
  
  it('should handle payment method selection', () => {
    // ...
  });
  
  it('should process checkout', () => {
    // ...
  });
});
```

### Step 5.3: E2E Tests

```typescript
// Test full user flow
describe('POS E2E', () => {
  it('should complete full checkout', () => {
    // ...
  });
});
```

---

## Deployment Checklist

- [ ] All components created
- [ ] Database schema migrated
- [ ] Backend endpoints tested
- [ ] Frontend pages created
- [ ] Tax calculation verified
- [ ] Responsive design tested
- [ ] Accessibility audit passed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tested
- [ ] User testing completed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Deployed to production

---

## Success Criteria

✅ Desktop layout: 60/40 split, no scrolling needed
✅ Payment buttons: Large, distinct, easy to access
✅ VAT: Configurable, 16% default for Kenya
✅ Tax exemptions: Per-product and per-category
✅ Mobile: Responsive, touch-friendly
✅ Accessibility: WCAG 2.1 AA compliant
✅ Performance: < 2s load time
✅ Keyboard navigation: Full support

---

**Status**: 📋 READY FOR IMPLEMENTATION
**Next Step**: Begin Phase 1 implementation
