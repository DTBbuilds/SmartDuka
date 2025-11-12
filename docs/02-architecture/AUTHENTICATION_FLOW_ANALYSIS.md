# SmartDuka Authentication & Authorization Flow Analysis

**Date:** Nov 6, 2025  
**Status:** Analysis & Planning Phase  
**Priority:** CRITICAL - Core Application Security

---

## 🔍 CURRENT STATE ANALYSIS

### Current Flow Issues ❌

1. **No Global Authentication Guard**
   - Users can access `/admin`, `/pos`, `/reports` without authentication
   - Only individual page-level checks exist
   - Shows "Access Denied" message instead of redirecting to login

2. **Inconsistent Protection**
   - Some pages check auth in `useEffect` (admin, cashiers, reports)
   - Some pages show error message instead of redirecting
   - No loading state while checking authentication
   - Race conditions possible during auth check

3. **Missing Role-Based Route Protection**
   - Cashiers can navigate to `/admin` (shows error but still loads)
   - Admins can access `/pos` (works but shouldn't be primary)
   - No middleware to prevent unauthorized access

4. **Home Page Vulnerability**
   - `/` (home) shows DashboardEnhanced without auth check
   - Any unauthenticated user can see dashboard
   - No redirect to login for unauthenticated users

5. **No Loading State**
   - Auth context loads from localStorage asynchronously
   - Pages render before auth is verified
   - Causes flash of content then redirect

### Current Page Protection Status

```
Page                  | Auth Check | Role Check | Redirect | Issue
/                     | ❌ NO      | ❌ NO      | ❌ NO    | CRITICAL
/login                | ✅ YES     | ❌ NO      | ✅ YES   | OK
/register-shop        | ✅ YES     | ❌ NO      | ✅ YES   | OK
/onboarding           | ✅ YES     | ✅ ADMIN   | ✅ YES   | OK
/admin                | ✅ YES     | ✅ ADMIN   | ❌ NO    | ERROR MSG
/pos                  | ❌ NO      | ❌ NO      | ❌ NO    | CRITICAL
/reports              | ✅ YES     | ✅ ADMIN   | ❌ NO    | ERROR MSG
/users/cashiers       | ✅ YES     | ✅ ADMIN   | ✅ YES   | OK
```

---

## 📋 INDUSTRY BEST PRACTICES

### 1. Authentication Flow (Standard)
```
User Visits App
    ↓
Check if token exists in localStorage
    ↓
If NO token → Redirect to /login
    ↓
If token exists → Validate token
    ↓
If invalid/expired → Clear storage, redirect to /login
    ↓
If valid → Decode token, set user context
    ↓
Check user role for page access
    ↓
If unauthorized → Redirect to appropriate page
    ↓
If authorized → Render page
```

### 2. Route Protection Levels

**Public Routes** (No auth required)
- `/login`
- `/register-shop`
- `/` (landing page - if exists)

**Protected Routes** (Auth required)
- `/onboarding` (admin only)
- `/pos` (admin or cashier)
- `/admin` (admin only)
- `/reports` (admin only)
- `/users/cashiers` (admin only)

**Role-Based Routes**
- Admin: `/admin`, `/reports`, `/users/cashiers`, `/onboarding`
- Cashier: `/pos` (read-only access to products)

### 3. Error Handling Strategy

```
Scenario                          | Action
User not authenticated            | Redirect to /login
User authenticated but expired    | Clear storage, redirect to /login
User lacks required role          | Redirect to /pos (cashier) or /admin (admin)
Shop status is suspended          | Show warning, restrict operations
Shop status is pending            | Redirect to /onboarding
```

### 4. Loading States

```
Initial Load
    ↓
Show loading spinner (full screen)
    ↓
Check auth from localStorage
    ↓
Validate token with backend (optional)
    ↓
Set user context
    ↓
Hide loading spinner
    ↓
Render appropriate page
```

---

## 🏗️ RECOMMENDED ARCHITECTURE

### 1. Authentication Guard Component

```typescript
// components/auth-guard.tsx
export function AuthGuard({ 
  children, 
  requiredRole?: 'admin' | 'cashier' 
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  
  if (!user) {
    router.push('/login');
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    router.push(user.role === 'admin' ? '/admin' : '/pos');
    return null;
  }

  return children;
}
```

### 2. Protected Page Wrapper

```typescript
// app/admin/page.tsx
export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminContent />
    </AuthGuard>
  );
}
```

### 3. Enhanced Auth Context

```typescript
// lib/auth-context.tsx
export type AuthContextType = {
  user: AuthUser | null;
  shop: Shop | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: 'admin' | 'cashier') => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerShop: (shopData: any, adminData: any) => Promise<void>;
};
```

### 4. Route Protection Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('smartduka:token')?.value;
  const pathname = request.nextUrl.pathname;

  // Public routes
  if (['/login', '/register-shop'].includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Create Authentication Guard Component
**Time:** 30 minutes

1. Create `components/auth-guard.tsx`
2. Create `components/loading-screen.tsx`
3. Add `hasRole()` method to auth context
4. Add `isAuthenticated` property to auth context

### Phase 2: Update Auth Context
**Time:** 20 minutes

1. Add loading state management
2. Add token validation
3. Add role checking methods
4. Add error handling

### Phase 3: Protect All Routes
**Time:** 45 minutes

1. Wrap `/admin` with AuthGuard (admin only)
2. Wrap `/pos` with AuthGuard (any authenticated)
3. Wrap `/reports` with AuthGuard (admin only)
4. Wrap `/users/cashiers` with AuthGuard (admin only)
5. Wrap `/onboarding` with AuthGuard (admin only)
6. Update `/` to redirect unauthenticated users

### Phase 4: Add Middleware
**Time:** 20 minutes

1. Create `middleware.ts`
2. Configure route protection
3. Handle token validation
4. Add redirect logic

### Phase 5: Fix Loading States
**Time:** 15 minutes

1. Add full-screen loading spinner
2. Prevent content flash
3. Show loading during auth check
4. Smooth transitions

### Phase 6: Testing & Verification
**Time:** 30 minutes

1. Test unauthenticated access
2. Test role-based access
3. Test token expiration
4. Test redirects
5. Test loading states

---

## 📊 EXPECTED BEHAVIOR AFTER IMPLEMENTATION

### Unauthenticated User Flow
```
1. User visits http://localhost:3000
   ↓
2. App checks localStorage for token
   ↓
3. No token found
   ↓
4. Show loading spinner
   ↓
5. Redirect to /login
   ↓
6. User sees login form
```

### Authenticated Admin Flow
```
1. Admin visits http://localhost:3000
   ↓
2. App checks localStorage for token
   ↓
3. Token found and valid
   ↓
4. Decode token, set user context
   ↓
5. Check role: admin ✅
   ↓
6. Redirect to /admin
   ↓
7. Admin sees dashboard
```

### Authenticated Cashier Flow
```
1. Cashier visits http://localhost:3000
   ↓
2. App checks localStorage for token
   ↓
3. Token found and valid
   ↓
4. Decode token, set user context
   ↓
5. Check role: cashier ✅
   ↓
6. Redirect to /pos
   ↓
7. Cashier sees POS system
```

### Cashier Tries to Access Admin
```
1. Cashier visits http://localhost:3000/admin
   ↓
2. AuthGuard checks role
   ↓
3. Role is cashier, not admin
   ↓
4. Redirect to /pos
   ↓
5. Cashier sees POS system
```

---

## 🔐 SECURITY CONSIDERATIONS

### Token Storage
- ✅ Use localStorage (current)
- ⚠️ Consider httpOnly cookies for production
- ⚠️ Add CSRF protection

### Token Validation
- ✅ Decode JWT on client
- ⚠️ Validate signature on backend
- ⚠️ Check expiration time
- ⚠️ Refresh token logic

### Role-Based Access
- ✅ Check role on client
- ✅ Enforce on backend (already done)
- ⚠️ Add permission matrix for future

### Shop Verification
- ✅ Check shop status on login
- ✅ Prevent suspended shops from accessing
- ⚠️ Show appropriate message

---

## 📝 IMPLEMENTATION CHECKLIST

### Auth Guard Component
- [ ] Create `components/auth-guard.tsx`
- [ ] Create `components/loading-screen.tsx`
- [ ] Handle loading state
- [ ] Handle unauthenticated state
- [ ] Handle unauthorized state
- [ ] Add role checking

### Auth Context Updates
- [ ] Add `isAuthenticated` property
- [ ] Add `hasRole()` method
- [ ] Improve loading state
- [ ] Add error handling
- [ ] Add token validation

### Route Protection
- [ ] Protect `/admin`
- [ ] Protect `/pos`
- [ ] Protect `/reports`
- [ ] Protect `/users/cashiers`
- [ ] Protect `/onboarding`
- [ ] Update `/` home page
- [ ] Update `/login` redirect if authenticated
- [ ] Update `/register-shop` redirect if authenticated

### Middleware
- [ ] Create `middleware.ts`
- [ ] Configure route matching
- [ ] Add token validation
- [ ] Add redirect logic
- [ ] Test middleware

### Testing
- [ ] Test unauthenticated access
- [ ] Test admin access
- [ ] Test cashier access
- [ ] Test role-based redirects
- [ ] Test token expiration
- [ ] Test loading states
- [ ] Test error scenarios

---

## 🎯 SUCCESS CRITERIA

✅ Unauthenticated users cannot access protected routes  
✅ Authenticated users see appropriate dashboard  
✅ Admins can access admin features  
✅ Cashiers cannot access admin features  
✅ Redirects happen smoothly without flash  
✅ Loading states show during auth check  
✅ Error messages are clear and helpful  
✅ All role-based access works correctly  
✅ Token expiration is handled gracefully  
✅ Shop status is verified on login  

---

## 📚 REFERENCE LINKS

### Authentication Best Practices
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://nextjs.org/docs/app/building-your-application/authentication
- https://jwt.io/introduction

### Role-Based Access Control
- https://en.wikipedia.org/wiki/Role-based_access_control
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

### Next.js Middleware
- https://nextjs.org/docs/app/building-your-application/routing/middleware
- https://nextjs.org/docs/app/building-your-application/routing/route-handlers

### Security
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://owasp.org/www-project-top-ten/

---

**Status:** Ready for Implementation  
**Priority:** CRITICAL  
**Estimated Time:** 3-4 hours  
**Next Step:** Begin Phase 1 implementation
