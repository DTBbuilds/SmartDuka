# Cashier Activity Logging Fix - Implementation Guide

**Date**: November 11, 2025
**Status**: READY FOR IMPLEMENTATION
**Effort**: 30 minutes
**Priority**: HIGH

---

## Problem

Cashier sales records are created but NOT logged in activity log. This means:
- ❌ No real-time activity tracking
- ❌ Admin cannot see checkout timeline
- ❌ No audit trail for transactions

---

## Solution

Add activity logging to checkout process.

---

## Implementation Steps

### Step 1: Update SalesService

**File**: `apps/api/src/sales/sales.service.ts`

**Add import** (at top of file):
```typescript
import { ActivityService } from '../activity/activity.service';
```

**Add to constructor** (line ~10):
```typescript
constructor(
  @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  private readonly inventoryService: InventoryService,
  private readonly activityService: ActivityService,  // ✅ ADD THIS
) {}
```

**Add activity logging** (after line 93, after `await order.save()`):
```typescript
// Log checkout activity
try {
  await this.activityService.logActivity(
    shopId,
    userId,
    dto.cashierName || 'Unknown Cashier',
    'cashier',
    'checkout',
    {
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.items.length,
      paymentStatus: order.paymentStatus,
      branchId: branchId,
      orderItems: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    }
  );
} catch (error) {
  // Log error but don't fail checkout
  console.error('Failed to log checkout activity:', error);
}
```

### Step 2: Update SalesModule

**File**: `apps/api/src/sales/sales.module.ts`

**Add import** (at top):
```typescript
import { ActivityModule } from '../activity/activity.module';
```

**Add to imports** (in @Module decorator):
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    InventoryModule,
    ActivityModule,  // ✅ ADD THIS
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
```

### Step 3: Verify ActivityModule Exports ActivityService

**File**: `apps/api/src/activity/activity.module.ts`

Ensure it has:
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Activity.name, schema: ActivitySchema }])],
  providers: [ActivityService],
  exports: [ActivityService],  // ✅ MUST BE EXPORTED
})
export class ActivityModule {}
```

---

## Testing

### Test 1: Create a Sale
```bash
curl -X POST http://localhost:5000/sales/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "123",
        "name": "Product",
        "quantity": 1,
        "unitPrice": 100
      }
    ],
    "payments": [
      {
        "method": "cash",
        "amount": 100
      }
    ],
    "cashierId": "cashier123",
    "cashierName": "John Doe"
  }'
```

### Test 2: Verify Order Created
```bash
curl -X GET http://localhost:5000/sales/orders \
  -H "Authorization: Bearer <admin_token>"
```

Expected: Order with `cashierId`, `cashierName`, `userId`

### Test 3: Verify Activity Logged (After Fix)
```bash
curl -X GET http://localhost:5000/activity/cashier/cashier123/transactions \
  -H "Authorization: Bearer <admin_token>"
```

Expected: Activity log entry with action='checkout'

---

## Verification Checklist

- [ ] SalesService imports ActivityService
- [ ] SalesService constructor includes ActivityService
- [ ] Activity logging added after order.save()
- [ ] SalesModule imports ActivityModule
- [ ] ActivityModule exports ActivityService
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors
- [ ] Test checkout creates order
- [ ] Test activity log created
- [ ] Test admin can view activity

---

## Code Changes Summary

### Files Modified: 2
1. `apps/api/src/sales/sales.service.ts`
2. `apps/api/src/sales/sales.module.ts`

### Lines Added: ~25
### Lines Removed: 0
### Breaking Changes: None

---

## Expected Results

### Before Fix
```
Cashier completes checkout
    ↓
Order created in database ✅
Inventory reduced ✅
Activity logged ❌
```

### After Fix
```
Cashier completes checkout
    ↓
Order created in database ✅
Inventory reduced ✅
Activity logged ✅
```

---

## Rollback Plan

If needed, simply remove:
1. ActivityService import from SalesService
2. ActivityService from constructor
3. Activity logging code
4. ActivityModule from SalesModule

---

## Performance Impact

- **Negligible**: Activity logging is async and non-blocking
- **Database**: One additional write per checkout
- **Response Time**: No impact (async operation)

---

## Monitoring

After deployment, monitor:
- Checkout success rate (should remain 100%)
- Activity log creation rate (should match checkout rate)
- Error logs for activity logging failures

---

## Success Criteria

✅ All checkouts logged in activity
✅ Admin can view cashier activity
✅ Activity includes order details
✅ No performance degradation
✅ No checkout failures

---

**Status**: READY FOR IMPLEMENTATION
**Estimated Time**: 30 minutes
**Risk Level**: LOW
**Testing Required**: YES
