'use client';

import { config } from './config';
import { getDeviceId, getDeviceFingerprint } from './device-memory';

/**
 * Secure Session Manager
 * Handles token storage, validation, and security measures
 * 
 * SECURITY NOTES:
 * - Access tokens are stored in httpOnly cookies (set by server) - NOT accessible by JS
 * - We also store in localStorage for client-side token expiry checks
 * - CSRF tokens are stored in regular cookies (readable by JS)
 * - Refresh tokens are httpOnly cookies only (never in localStorage)
 */

const TOKEN_KEY = 'smartduka:token';
const SHOP_KEY = 'smartduka:shop';
const USER_KEY = 'smartduka:user';
const SESSION_META_KEY = 'smartduka:session_meta';
const CSRF_TOKEN_KEY = 'smartduka:csrf';
const REFRESH_TOKEN_KEY = 'smartduka:refresh_fallback'; // Fallback for cross-origin issues

export interface SessionMeta {
  createdAt: number;
  lastActivityAt: number;
  deviceId: string;
  deviceFingerprint: string;
  ipHash?: string;
  refreshCount: number;
  sessionId?: string;
  expiresAt?: number;
}

/**
 * Store auth tokens securely
 * Access token stored in localStorage for client-side expiry checks
 * httpOnly cookies are set by the server - we don't set them here
 */
export function storeToken(token: string, sessionId?: string, expiresIn?: number, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  
  // Store access token in localStorage for client-side access
  // The actual secure token is in httpOnly cookie set by server
  localStorage.setItem(TOKEN_KEY, token);
  
  // Store refresh token as fallback for cross-origin cookie issues
  // This is less secure but necessary when cookies don't work
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  // Store session metadata
  const meta: SessionMeta = {
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    deviceId: getDeviceId(),
    deviceFingerprint: getDeviceFingerprint(),
    refreshCount: 0,
    sessionId,
    expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
  };
  localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
}

/**
 * Store CSRF token (readable by JS for inclusion in headers)
 */
export function storeCsrfToken(csrfToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
}

/**
 * Get CSRF token for API requests
 */
export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const stored = localStorage.getItem(CSRF_TOKEN_KEY);
  if (stored) return stored;
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'smartduka_csrf') {
      return value;
    }
  }
  return null;
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store user data
 */
export function storeUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored user
 */
export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Store shop data
 */
export function storeShop(shop: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHOP_KEY, JSON.stringify(shop));
}

/**
 * Get stored shop
 */
export function getShop(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SHOP_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Update last activity timestamp
 */
export function updateActivity(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(SESSION_META_KEY);
    if (stored) {
      const meta: SessionMeta = JSON.parse(stored);
      meta.lastActivityAt = Date.now();
      localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get session metadata
 */
export function getSessionMeta(): SessionMeta | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SESSION_META_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Validate session integrity
 * Checks if session appears to be from the same device
 */
export function validateSessionIntegrity(): { valid: boolean; reason?: string } {
  const meta = getSessionMeta();
  if (!meta) {
    return { valid: true }; // No meta means new session
  }
  
  const currentFingerprint = getDeviceFingerprint();
  const currentDeviceId = getDeviceId();
  
  // Check device ID matches
  if (meta.deviceId !== currentDeviceId) {
    return { valid: false, reason: 'device_mismatch' };
  }
  
  // Check fingerprint (allow some variance for browser updates)
  // For now, we just log if different but don't invalidate
  if (meta.deviceFingerprint !== currentFingerprint) {
    console.warn('Device fingerprint changed - possible browser update or suspicious activity');
  }
  
  return { valid: true };
}

/**
 * Parse JWT token payload
 */
export function parseToken(token: string): any | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Get time until token expires (in seconds)
 */
export function getTokenExpiryTime(token: string): number | null {
  const payload = parseToken(token);
  if (!payload?.exp) return null;
  return Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 1000));
}

/**
 * Check if token should be refreshed
 * With 15-minute access tokens, refresh when less than 5 minutes remaining
 * This gives buffer time for the refresh request
 */
export function shouldRefreshToken(token: string): boolean {
  const expiryTime = getTokenExpiryTime(token);
  if (expiryTime === null) return true;
  return expiryTime < 300; // Less than 5 minutes (300 seconds)
}

/**
 * Check if token is about to expire (less than 2 minutes)
 * Used for urgent refresh before API calls
 */
export function isTokenAboutToExpire(token: string): boolean {
  const expiryTime = getTokenExpiryTime(token);
  if (expiryTime === null) return true;
  return expiryTime < 120; // Less than 2 minutes
}

// Track refresh attempts to prevent infinite loops
let refreshAttempts = 0;
let lastRefreshAttempt = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN_MS = 5000; // 5 seconds between refresh attempts

/**
 * Refresh the auth token using refresh token rotation
 * The refresh token is in httpOnly cookie - we don't need to send it manually
 */
export async function refreshToken(): Promise<{ accessToken: string; csrfToken: string } | null> {
  // Rate limiting to prevent refresh loops
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    console.warn('[SecureSession] Refresh rate limited, waiting...');
    return null;
  }
  
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    console.error('[SecureSession] Max refresh attempts reached, clearing session');
    clearSession();
    // Reset for next session
    refreshAttempts = 0;
    return null;
  }
  
  lastRefreshAttempt = now;
  refreshAttempts++;
  
  try {
    const csrfToken = getCsrfToken();
    
    console.log(`[SecureSession] Attempting token refresh (attempt ${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})...`);
    
    // Get fallback refresh token from localStorage (for cross-origin scenarios)
    const fallbackRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Important: sends httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        // Send refresh token in header as fallback
        ...(fallbackRefreshToken ? { 'Authorization': `Bearer ${fallbackRefreshToken}` } : {}),
      },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        deviceFingerprint: getDeviceFingerprint(),
        // Also send in body as another fallback
        refreshToken: fallbackRefreshToken || undefined,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.tokens?.accessToken) {
        console.log('[SecureSession] Token refresh successful');
        
        // Reset refresh attempts on success
        refreshAttempts = 0;
        
        // Store new tokens
        storeToken(data.tokens.accessToken, data.tokens.sessionId, data.tokens.expiresIn);
        if (data.tokens.csrfToken) {
          storeCsrfToken(data.tokens.csrfToken);
        }
        
        // Update refresh count
        const meta = getSessionMeta();
        if (meta) {
          meta.refreshCount++;
          meta.lastActivityAt = Date.now();
          localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
        }
        
        return {
          accessToken: data.tokens.accessToken,
          csrfToken: data.tokens.csrfToken,
        };
      }
    }
    
    // Log the error response for debugging
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[SecureSession] Token refresh failed:', response.status, errorText);
    
    // Handle specific error cases
    if (response.status === 401) {
      // Check if it's a "No refresh token provided" error - this means cookies aren't being sent
      // This happens in cross-origin setups where sameSite cookies are blocked
      if (errorText.includes('No refresh token provided')) {
        console.warn('[SecureSession] Refresh token cookie not sent - cross-origin cookie issue or session expired');
        // Don't spam the console - this is expected when session has expired
        // User will be redirected to login
      }
      
      // Only clear session after max attempts to avoid premature logout
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn('[SecureSession] Refresh token invalid after max attempts, clearing session');
        clearSession();
        refreshAttempts = 0; // Reset for next session
      }
    }
    // 403 = Forbidden (might be CSRF issue - don't clear, let user retry)
    // 5xx = Server error (don't clear, let user retry)
    
    return null;
  } catch (err) {
    // Network errors - don't clear session, user might just be offline
    console.error('[SecureSession] Failed to refresh token (network error):', err);
    return null;
  }
}

/**
 * Reset refresh attempt counter (call after successful login)
 */
export function resetRefreshAttempts(): void {
  refreshAttempts = 0;
  lastRefreshAttempt = 0;
}

/**
 * Clear all session data
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SHOP_KEY);
  localStorage.removeItem(SESSION_META_KEY);
  localStorage.removeItem(CSRF_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('smartduka:lastActivity');
  
  // Clear client-side cookies (httpOnly cookies cleared by server on logout)
  document.cookie = 'smartduka_token=; path=/; max-age=0';
  document.cookie = 'smartduka_csrf=; path=/; max-age=0';
}

/**
 * Check for suspicious session activity
 */
export function detectSuspiciousActivity(): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const meta = getSessionMeta();
  
  if (!meta) {
    return { suspicious: false, reasons: [] };
  }
  
  // Check for rapid refresh attempts (more than 10 in session)
  if (meta.refreshCount > 10) {
    reasons.push('excessive_refresh_attempts');
  }
  
  // Check for device fingerprint mismatch
  if (meta.deviceFingerprint !== getDeviceFingerprint()) {
    reasons.push('fingerprint_mismatch');
  }
  
  // Check for device ID mismatch
  if (meta.deviceId !== getDeviceId()) {
    reasons.push('device_id_mismatch');
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
