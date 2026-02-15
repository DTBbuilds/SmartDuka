# SmartDuka Authentication Security

## Overview

This document describes the secure authentication system implemented in SmartDuka, including token handling, session management, and protection against common vulnerabilities.

## Token Architecture

### Token Types

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| **Access Token** | httpOnly cookie + localStorage | 30 minutes | API authentication |
| **Refresh Token** | httpOnly cookie only | 30 days | Token rotation |
| **CSRF Token** | Regular cookie + localStorage | 30 minutes | CSRF protection |

### Security Properties

- **Access tokens** are short-lived (30 min) to limit exposure if compromised
- **Refresh tokens** are stored ONLY in httpOnly cookies - never accessible to JavaScript
- **Token rotation**: Each refresh invalidates the old refresh token and issues a new one
- **Session binding**: Tokens are bound to device fingerprint and session ID

## Cookie Configuration

```typescript
// Access Token Cookie
{
  httpOnly: true,      // Not accessible by JavaScript
  secure: true,        // HTTPS only in production
  sameSite: 'lax',     // CSRF protection
  maxAge: 30 * 60,     // 30 minutes
  path: '/',
}

// Refresh Token Cookie
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',  // Stricter for refresh
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: '/api/v1/auth', // Only auth endpoints
}

// CSRF Token Cookie
{
  httpOnly: false,     // Must be readable by JS
  secure: true,
  sameSite: 'lax',
  maxAge: 30 * 60,
}
```

## CSRF Protection

### How It Works

1. Server generates CSRF token on login
2. Token stored in regular cookie (readable by JS)
3. Frontend includes token in `X-CSRF-Token` header for state-changing requests
4. Server validates header matches cookie

### Protected Methods

- POST, PUT, PATCH, DELETE require CSRF token
- GET, HEAD, OPTIONS are exempt

### Skipping CSRF

Use `@SkipCsrf()` decorator for:
- Login/register endpoints (no session yet)
- Webhook endpoints (external callers)
- Refresh endpoint (uses refresh token instead)

## Session Management

### Session Schema

```typescript
{
  userId: ObjectId,
  shopId: ObjectId,
  sessionId: string,        // Unique session identifier
  accessTokenJti: string,   // JWT ID for access token
  refreshTokenId: ObjectId, // Reference to refresh token
  isActive: boolean,
  lastActivityAt: Date,
  expiresAt: Date,
  deviceId: string,
  deviceFingerprint: string,
  userAgent: string,
  ipAddress: string,
  clientType: 'web' | 'mobile' | 'pos' | 'api',
}
```

### Session Validation

On each authenticated request:
1. JWT signature verified
2. Session looked up by `sessionId` in token
3. Session must be active and not expired
4. Session activity timestamp updated

### Session Termination

- **Logout**: Terminates current session only
- **Logout All**: Revokes all sessions for user
- **Password Reset**: Revokes all sessions for security
- **Token Theft Detection**: If refresh token hash doesn't match, all user sessions revoked

## Refresh Token Flow

### Endpoint: `POST /api/v1/auth/refresh`

**Does NOT require valid access token** - uses refresh token from cookie.

```
1. Client sends request with refresh token cookie
2. Server validates refresh token hash
3. Old refresh token marked as revoked
4. New token pair generated (rotation)
5. New cookies set in response
6. Old token's `replacedByToken` points to new token
```

### Token Theft Detection

If someone tries to use a revoked refresh token:
1. Server detects token was already used
2. All user tokens immediately revoked
3. User must re-authenticate

## API Endpoints

### Authentication

| Endpoint | Method | Auth | CSRF | Description |
|----------|--------|------|------|-------------|
| `/auth/login` | POST | No | Skip | Email/password login |
| `/auth/login-pin` | POST | No | Skip | PIN login |
| `/auth/login-cashier` | POST | No | Skip | Name + PIN login |
| `/auth/register-shop` | POST | No | Skip | Shop registration |
| `/auth/refresh` | POST | Refresh Token | Skip | Token rotation |
| `/auth/logout` | POST | JWT | Yes | Logout current session |
| `/auth/logout-all` | POST | JWT | Yes | Logout all devices |
| `/auth/me` | GET | JWT | No | Get current user |
| `/auth/sessions` | GET | JWT | No | List active sessions |
| `/auth/sessions/:id` | DELETE | JWT | Yes | Terminate session |
| `/auth/csrf-token` | GET | JWT | No | Get new CSRF token |

### Google OAuth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | GET | Initiate OAuth flow |
| `/auth/google/callback` | GET | OAuth callback - sets cookies, redirects |

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=30m

# Refresh Token
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRY=30d

# Cookie Domain (production only)
COOKIE_DOMAIN=.yourdomain.com
```

## Frontend Integration

### Making Authenticated Requests

```typescript
// All requests should include credentials
fetch('/api/v1/endpoint', {
  credentials: 'include', // Sends httpOnly cookies
  headers: {
    'X-CSRF-Token': getCsrfToken(), // For POST/PUT/PATCH/DELETE
  },
});
```

### Token Refresh

```typescript
// Automatic refresh when token expires
if (shouldRefreshToken(accessToken)) {
  const result = await refreshToken();
  if (result) {
    // New tokens automatically set in cookies
    // Update local state with new access token
  }
}
```

## Security Checklist

- [x] Access tokens in httpOnly cookies
- [x] Refresh tokens in httpOnly cookies with restricted path
- [x] CSRF protection for state-changing requests
- [x] Token rotation on refresh
- [x] Session validation on each request
- [x] Device fingerprint tracking
- [x] Token theft detection
- [x] Rate limiting on refresh endpoint (10/min)
- [x] Secure cookie flags (Secure, SameSite)
- [x] No tokens in URLs (except legacy OAuth)
- [x] Password reset revokes all sessions

## Files

### Backend
- `apps/api/src/auth/services/cookie.service.ts` - Cookie management
- `apps/api/src/auth/services/csrf.service.ts` - CSRF token generation
- `apps/api/src/auth/guards/csrf.guard.ts` - CSRF validation guard
- `apps/api/src/auth/guards/jwt-cookie-auth.guard.ts` - JWT + session validation
- `apps/api/src/auth/guards/refresh-token.guard.ts` - Refresh token extraction
- `apps/api/src/auth/token.service.ts` - Token generation and rotation
- `apps/api/src/auth/auth.service.ts` - Authentication logic
- `apps/api/src/auth/auth.controller.ts` - Auth endpoints

### Frontend
- `apps/web/src/lib/secure-session.ts` - Token storage and refresh
- `apps/web/src/lib/auth-context.tsx` - Auth state management
- `apps/web/src/lib/api-client.ts` - API client with CSRF headers
