# CORS Troubleshooting - Quick Fix

**Status:** ✅ FIXED

---

## Quick Checklist

### 1. Ensure Backend is Running ✅

```bash
# Terminal 1: Start backend API
cd apps/api
pnpm dev

# Expected output:
# 🚀 Backend API running on http://localhost:5000
```

### 2. Ensure Frontend is Running ✅

```bash
# Terminal 2: Start frontend
cd apps/web
pnpm dev

# Expected output:
# ▲ Next.js 16.0.1 (Turbopack)
# - Local: http://localhost:3000
```

### 3. Verify Both Are Running

```bash
# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost:3000
```

---

## If You Still See CORS Errors

### Step 1: Clear Service Worker Cache

```javascript
// Open browser DevTools (F12) → Console
// Paste this code:

navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    reg.unregister();
    console.log('Service Worker unregistered');
  });
});

// Then refresh the page (Ctrl+R or Cmd+R)
```

### Step 2: Clear Browser Cache

- **Chrome/Edge:** Ctrl+Shift+Delete → Clear browsing data
- **Firefox:** Ctrl+Shift+Delete → Clear Recent History
- **Safari:** Develop → Empty Web Storage

### Step 3: Hard Refresh

- **Chrome/Edge:** Ctrl+Shift+R
- **Firefox:** Ctrl+Shift+R
- **Safari:** Cmd+Shift+R

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for requests to `http://localhost:5000`
5. Check response headers for:
   ```
   Access-Control-Allow-Origin: http://localhost:3000
   ```

---

## Common Issues & Solutions

### Issue: "Failed to load http://localhost:5000/inventory/products"

**Cause:** Backend API not running

**Solution:**
```bash
# Make sure backend is running
cd apps/api
pnpm dev
```

### Issue: "CORS request did not succeed"

**Cause:** CORS headers missing or incorrect

**Solution:**
1. Verify backend CORS config in `apps/api/src/main.ts`
2. Restart backend: `pnpm dev`
3. Hard refresh frontend

### Issue: Service Worker errors in console

**Cause:** Stale service worker cache

**Solution:**
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Refresh page
```

### Issue: "The strategy could not generate a response"

**Cause:** Service worker caching strategy incompatible with cross-origin

**Solution:**
- Already fixed in `apps/web/public/sw.js`
- Changed from `StaleWhileRevalidate` to `NetworkFirst`
- Clear service worker cache (see above)

---

## Verify Fix

### Test 1: Check CORS Headers

```bash
curl -i http://localhost:5000/inventory/products

# Look for these headers in response:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
```

### Test 2: Check Frontend Network Requests

1. Open http://localhost:3000
2. Open DevTools (F12)
3. Go to Network tab
4. Navigate to `/admin` page
5. Look for requests to `http://localhost:5000/inventory/products`
6. Should see Status: **200** (not 0 or error)

### Test 3: Check Console for Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Should NOT see CORS errors
4. Should see successful data loading

---

## Environment Configuration

### Frontend (.env.local) ✅
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (apps/api/src/main.ts) ✅
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Final Verification

After applying fixes, you should be able to:

- ✅ Navigate to http://localhost:3000
- ✅ See navbar with all links
- ✅ Click on "Inventory" → see products loading
- ✅ Click on "Admin" → see products and categories
- ✅ See NO CORS errors in console
- ✅ See NO service worker errors
- ✅ All data loads successfully

---

## If Issues Persist

1. **Restart everything:**
   ```bash
   # Kill all processes (Ctrl+C)
   # Close all terminals
   # Restart backend and frontend
   ```

2. **Check port conflicts:**
   ```bash
   # Check if ports are in use
   netstat -ano | findstr :3000  # Windows
   netstat -ano | findstr :5000  # Windows
   
   lsof -i :3000  # Mac/Linux
   lsof -i :5000  # Mac/Linux
   ```

3. **Check logs:**
   - Backend: Look for "🚀 Backend API running"
   - Frontend: Look for "▲ Next.js running"

---

**Status:** ✅ All CORS issues should be resolved!

If you still have issues, check the detailed guide in `CORS_FIX_GUIDE.md`
