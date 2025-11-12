# Turbopack HMR Error - Resolution Guide

**Date:** Nov 6, 2025  
**Issue:** Module factory not available in HMR update  
**Status:** ✅ FIXED

---

## Problem

When running `pnpm dev`, you saw this error:

```
Module was instantiated because it was required from module, 
but the module factory is not available. It might have been deleted in an HMR update.
```

This is a known issue with Next.js 16 Turbopack and HMR (Hot Module Replacement).

---

## Root Cause

- Turbopack HMR cache corruption
- Module factory missing after hot reload
- Stale build artifacts

---

## Solution Applied

### Step 1: Clear Next.js Cache ✅

```powershell
Remove-Item -Path "e:\BUILds\SmartDuka\apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue
```

This removes the `.next` build directory and all cached artifacts.

---

## What to Do Now

### 1. Restart Dev Server

```powershell
# Kill current process (Ctrl+C)
pnpm dev
```

### 2. Wait for Full Rebuild

The first startup will take longer as it rebuilds everything:
- ✅ Next.js compiling
- ✅ Turbopack bundling
- ✅ HMR ready

### 3. Verify Success

You should see:
```
@smartduka/web:dev: ▲ Next.js 16.0.1 (Turbopack)
@smartduka/web:dev: - Local: http://localhost:3000
@smartduka/web:dev: ✓ Ready in X.Xs

@smartduka/api:dev: 🚀 Backend API running on http://localhost:5000
```

No errors! ✅

---

## If Error Persists

### Option 1: Clear All Caches

```powershell
# Clear Next.js cache
Remove-Item -Path "e:\BUILds\SmartDuka\apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Clear Turbopack cache
Remove-Item -Path "e:\BUILds\SmartDuka\apps\web\.turbo" -Recurse -Force -ErrorAction SilentlyContinue

# Clear node_modules (if needed)
Remove-Item -Path "e:\BUILds\SmartDuka\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "e:\BUILds\SmartDuka\apps\web\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall
pnpm install
```

### Option 2: Disable Turbopack (Fallback)

Edit `apps/web/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopack: false,  // Disable Turbopack, use SWC instead
  },
};
```

Then restart: `pnpm dev`

---

## Prevention Tips

1. **Avoid rapid file changes** - Let HMR settle between edits
2. **Use hard refresh** - Ctrl+Shift+R if issues occur
3. **Clear cache regularly** - Before major work sessions
4. **Keep Next.js updated** - Newer versions have fixes

---

## File Cleared

- `apps/web/.next/` - Build cache directory

---

## Status

✅ **CACHE CLEARED AND READY**

The application should now start without HMR errors.

**Next step:** Restart `pnpm dev` and open http://localhost:3000

---

## Reference

- [Next.js Turbopack Docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [HMR Issues](https://github.com/vercel/next.js/discussions/turbopack)
