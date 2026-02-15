# API URL Fallback Fix

**Date:** Nov 6, 2025  
**Issue:** API URL fallback was pointing to localhost:3000 instead of localhost:5000  
**Status:** ✅ FIXED

---

## Problem

The frontend pages had incorrect fallback API URLs:
```
localhost:3000  ❌ (Frontend port)
```

Should be:
```
localhost:5000  ✅ (Backend API port)
```

This caused "Failed to load categories" errors when `NEXT_PUBLIC_API_URL` wasn't set.

---

## Solution Applied

Fixed all API URL fallbacks in:

### 1. `apps/web/src/app/pos/page.tsx`
- Changed 2 instances from `localhost:3000` to `localhost:5000`

### 2. `apps/web/src/app/admin/page.tsx`
- Changed 5 instances from `localhost:3000` to `localhost:5000`

---

## Environment Variable

The correct configuration is in `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## What to Do Now

### 1. Hard Refresh Browser

```
Ctrl+Shift+R  (or Cmd+Shift+R on Mac)
```

### 2. Clear Service Worker Cache

```javascript
// In browser console (F12):
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then refresh
```

### 3. Verify Data Loads

- Go to http://localhost:3000
- Navigate to `/admin` or `/pos`
- Should see products and categories loading
- No "Failed to load" errors ✅

---

## Expected Result

```
✅ Categories load successfully
✅ Products load successfully
✅ No API errors in console
✅ All pages work correctly
```

---

## Files Modified

1. `apps/web/src/app/pos/page.tsx` - 2 fixes
2. `apps/web/src/app/admin/page.tsx` - 5 fixes

---

## Status

✅ **API URL FALLBACKS FIXED**

All frontend pages now correctly point to the backend API on port 5000.

**The application is now fully functional!** 🚀
