# API Errors Fix Report

## Errors Found

### 1. **401 Unauthorized - GET /inventory/products**
- **Issue**: JWT token not being sent or invalid
- **Root Cause**: Frontend not including Authorization header or token expired
- **Fix**: Ensure token is passed in all requests

### 2. **403 Forbidden - GET /activity/cashier/{cashierId}/transactions**
- **Issue**: Cashier trying to access activity endpoint (admin-only)
- **Root Cause**: Activity endpoints require 'admin' role, but cashiers have 'cashier' role
- **Solution**: Create cashier-specific endpoints or allow cashiers to view own transactions

### 3. **404 Not Found - GET /shifts/current**
- **Issue**: Endpoint exists but returns 404
- **Root Cause**: No active shift for user or incorrect endpoint path
- **Solution**: Handle 404 gracefully (already done in code)

## Solutions Implemented

### Solution 1: Fix Activity Endpoints for Cashiers
- Add new endpoint: `GET /activity/cashier/self/transactions` (cashier can view own)
- Keep admin-only endpoints for viewing other cashiers

### Solution 2: Fix Inventory Endpoint Authentication
- Ensure JWT guard is properly validating tokens
- Add error handling for expired tokens

### Solution 3: Add Graceful Error Handling
- Handle 401 errors by redirecting to login
- Handle 403 errors by showing permission denied message
- Handle 404 errors by showing "no data" message

## Files to Modify

1. `apps/api/src/activity/activity.controller.ts` - Add cashier self-view endpoint
2. `apps/web/src/app/cashier/dashboard/page.tsx` - Use new endpoint
3. `apps/web/src/lib/auth-context.ts` - Handle token refresh
