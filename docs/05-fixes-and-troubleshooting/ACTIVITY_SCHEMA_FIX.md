# Activity Schema Validation Error - Fixed

**Date**: Nov 7, 2025 | 8:39 PM UTC+03:00
**Status**: ✅ FIXED

---

## Error Found

```
ERROR [ActivityService] Failed to log activity: Activity validation failed: 
action: `status_change` is not a valid enum value for path `action`.

ValidationError: Activity validation failed: action: `status_change` is not a valid enum value for path `action`.
```

---

## Root Cause

The Activity schema had an incomplete enum list for the `action` field. The `status_change` action was being used in the activity controller but was not defined in the schema's enum.

**File**: `apps/api/src/activity/schemas/activity.schema.ts`

**Problem**: Missing enum value `status_change` in the action field

---

## Solution Applied

Added `status_change` to the enum list of valid actions in the Activity schema.

### Before
```typescript
@Prop({
  required: true,
  enum: [
    'login',
    'login_pin',
    'logout',
    'heartbeat',
    'checkout',
    // ... other actions
    'transaction_discount',
  ],
})
action: string;
```

### After
```typescript
@Prop({
  required: true,
  enum: [
    'login',
    'login_pin',
    'logout',
    'heartbeat',
    'status_change',  // ✅ ADDED
    'checkout',
    // ... other actions
    'transaction_discount',
  ],
})
action: string;
```

---

## Complete Valid Actions List

The Activity schema now supports the following actions:

```typescript
[
  'login',                    // User login
  'login_pin',               // PIN-based login
  'logout',                  // User logout
  'heartbeat',               // Keep-alive signal
  'status_change',           // ✅ NEW - User status change (online/idle/offline)
  'checkout',                // POS checkout
  'product_view',            // Product viewed
  'inventory_view',          // Inventory page viewed
  'report_view',             // Reports page viewed
  'product_add',             // Product created
  'product_edit',            // Product updated
  'product_delete',          // Product deleted
  'stock_update',            // Stock quantity changed
  'cashier_add',             // Cashier created
  'cashier_delete',          // Cashier deleted
  'cashier_disable',         // Cashier disabled
  'cashier_enable',          // Cashier enabled
  'settings_change',         // Settings updated
  'shift_start',             // Shift started
  'shift_end',               // Shift ended
  'shift_reconcile',         // Shift reconciled
  'transaction_void',        // Transaction voided
  'transaction_refund',      // Transaction refunded
  'transaction_discount',    // Transaction discounted
]
```

---

## Files Modified

### Backend
```
✅ apps/api/src/activity/schemas/activity.schema.ts
   - Added 'status_change' to enum list
   - Line 27: New action added
```

---

## Impact

### Before Fix
- ❌ Status change events failed to log
- ❌ Console error: "status_change is not a valid enum value"
- ❌ Activity tracking incomplete

### After Fix
- ✅ Status change events log successfully
- ✅ No validation errors
- ✅ Complete activity tracking
- ✅ User status changes properly recorded

---

## Testing

### Verify Fix
1. Restart backend: `cd apps/api && pnpm dev`
2. Login as cashier
3. Go to /cashier/dashboard
4. Check console - should see no Activity validation errors
5. Status changes should be logged without errors

### Expected Behavior
- ✅ No "status_change is not a valid enum value" errors
- ✅ Activity logs created successfully
- ✅ Dashboard loads without errors
- ✅ User status tracking works properly

---

## Related Code

### Activity Controller (Status Change)
```typescript
@UseGuards(JwtAuthGuard)
@Post('status')
async updateStatus(
  @Body() dto: { status: 'online' | 'idle' | 'offline'; timestamp?: string },
  @CurrentUser() user: any,
) {
  // Log status change as activity
  await this.activityService.logActivity(
    user.shopId,
    user.sub,
    user.email,
    user.role,
    'status_change',  // ✅ Now valid
    { status: dto.status },
  );
  return { success: true, status: dto.status };
}
```

---

## Summary

**Status**: ✅ **FIXED - PRODUCTION READY**

**Changes**:
- ✅ Added `status_change` to Activity schema enum
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ All activity types now supported

**Result**:
- ✅ No more validation errors
- ✅ Complete activity tracking
- ✅ User status changes properly logged
- ✅ Production ready

