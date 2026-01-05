'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { activityTracker } from './activity-tracker';
import { statusManager } from './status-manager';
import { config } from './config';
import { clearAllLocalData } from './db';
import { clearAllCache } from './data-cache';
import { hotDataManager } from './hot-data-manager';
import { recordShopLogin, getPreferredShop, getRecentShops, getDeviceId, type RecentShop } from './device-memory';
import { storeToken, storeShop, storeUser, clearSession, validateSessionIntegrity, shouldRefreshToken, refreshToken as refreshAuthToken, storeCsrfToken, getCsrfToken, resetRefreshAttempts } from './secure-session';

export type AuthUser = {
  sub: string;
  email: string;
  name?: string;
  role: 'admin' | 'cashier' | 'super_admin';
  shopId?: string;
};

export type Shop = {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'active' | 'suspended' | 'rejected';
  email?: string;
  rejectionReason?: string;
};

// Demo mode key for localStorage
const DEMO_MODE_KEY = 'smartduka:demo_mode';

type AuthContextType = {
  user: AuthUser | null;
  shop: Shop | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isShopPending: boolean;
  login: (email: string, password: string, role?: 'admin' | 'cashier' | 'super_admin', shopId?: string) => Promise<void>;
  loginWithPin: (pin: string, shopId: string) => Promise<void>;
  loginWithGoogle: () => void;
  registerShopWithGoogle: (googleProfile: GoogleProfile, shopData: any) => Promise<void>;
  setAuthFromTokens: (tokens: { accessToken: string; csrfToken?: string; sessionId?: string; expiresIn?: number }, userData: any, shopData: any) => void;
  logout: () => void;
  registerShop: (shopData: any, adminData: any) => Promise<void>;
  enterDemoMode: (forceShop?: Shop) => void;
  exitDemoMode: () => void;
  hasRole: (role: 'admin' | 'cashier' | 'super_admin') => boolean;
  isAdmin: () => boolean;
  isCashier: () => boolean;
  isSuperAdmin: () => boolean;
  refreshShop: () => Promise<Shop | null>;
  updateShop: (shopData: Partial<Shop>) => void;
};

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeSession = async () => {
      const storedToken = window.localStorage.getItem('smartduka:token');
      const storedShop = window.localStorage.getItem('smartduka:shop');
      const storedDemoMode = window.localStorage.getItem(DEMO_MODE_KEY);
      
      if (storedToken) {
        try {
          // Validate session integrity
          const integrity = validateSessionIntegrity();
          if (!integrity.valid) {
            console.warn('Session integrity check failed:', integrity.reason);
            clearSession();
            setLoading(false);
            return;
          }
          
          const decoded = JSON.parse(atob(storedToken.split('.')[1]));
          
          // Check if token is expired
          const isExpired = decoded.exp && Date.now() >= decoded.exp * 1000;
          if (isExpired) {
            console.warn('Token expired, clearing session');
            clearSession();
            setLoading(false);
            return;
          }
          
          setUser(decoded);
          setToken(storedToken);
          
          // Sync cookie for middleware authentication
          const isSecure = window.location.protocol === 'https:';
          const cookieFlags = [
            `smartduka_token=${storedToken}`,
            'path=/',
            `max-age=${7 * 24 * 60 * 60}`,
            'SameSite=Lax',
          ];
          if (isSecure) cookieFlags.push('Secure');
          document.cookie = cookieFlags.join('; ');
          
          // Initialize activity tracking, status manager, and hot data
          activityTracker.setToken(storedToken, decoded.role);
          statusManager.initialize(storedToken, decoded.sub, decoded.shopId);
          hotDataManager.initialize(storedToken);
          
          if (storedShop) {
            const parsedShop = JSON.parse(storedShop);
            setShop(parsedShop);
            // Restore demo mode only if shop is still pending
            if (storedDemoMode === 'true' && parsedShop.status === 'pending') {
              setIsDemoMode(true);
            }
          }
          
          // Check if token should be refreshed (less than 5 minutes remaining)
          if (shouldRefreshToken(storedToken)) {
            const refreshResult = await refreshAuthToken();
            if (refreshResult) {
              setToken(refreshResult.accessToken);
              const newDecoded = JSON.parse(atob(refreshResult.accessToken.split('.')[1]));
              setUser(newDecoded);
              // Update status manager with new token
              statusManager.updateToken(refreshResult.accessToken);
            }
          }
        } catch (err) {
          console.error('Session initialization error:', err);
          clearSession();
        }
      }
      setLoading(false);
    };
    
    initializeSession();
  }, []);

  // Proactive token refresh - check every 2 minutes for 15-minute tokens
  useEffect(() => {
    if (!token) return;

    const checkAndRefresh = async () => {
      if (shouldRefreshToken(token)) {
        console.log('[Auth] Token expiring soon, refreshing...');
        const refreshResult = await refreshAuthToken();
        if (refreshResult) {
          setToken(refreshResult.accessToken);
          const newDecoded = JSON.parse(atob(refreshResult.accessToken.split('.')[1]));
          setUser(newDecoded);
          // Update status manager with new token
          statusManager.updateToken(refreshResult.accessToken);
          console.log('[Auth] Token refreshed successfully');
        } else {
          console.warn('[Auth] Token refresh failed');
        }
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkAndRefresh, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [token]);

  // Listen for token-refreshed events from session expiry warning component
  useEffect(() => {
    const handleTokenRefreshed = (event: CustomEvent<{ accessToken: string; csrfToken: string }>) => {
      const { accessToken } = event.detail;
      if (accessToken) {
        console.log('[Auth] Token refreshed via session extension');
        setToken(accessToken);
        try {
          const newDecoded = JSON.parse(atob(accessToken.split('.')[1]));
          setUser(newDecoded);
          // Update status manager with new token
          statusManager.updateToken(accessToken);
          // Update activity tracker
          activityTracker.setToken(accessToken, newDecoded.role);
          // Update hot data manager with new token
          hotDataManager.updateToken(accessToken);
        } catch (err) {
          console.error('[Auth] Failed to decode refreshed token:', err);
        }
      }
    };

    window.addEventListener('token-refreshed', handleTokenRefreshed as EventListener);
    return () => {
      window.removeEventListener('token-refreshed', handleTokenRefreshed as EventListener);
    };
  }, []);

  const login = async (email: string, password: string, role?: 'admin' | 'cashier' | 'super_admin', shopId?: string) => {
    const res = await fetch(`${config.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: receive httpOnly cookies
      body: JSON.stringify({ 
        email, 
        password,
        role,
        shopId,
        deviceId: getDeviceId(),
      }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    const { tokens, user: userData, shop: shopData } = data;
    
    // Get access token from response (also set as httpOnly cookie by server)
    const authToken = tokens?.accessToken;
    if (!authToken) throw new Error('No token received');
    
    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopData);
    
    // Use secure session storage
    storeToken(authToken, tokens?.sessionId, tokens?.expiresIn);
    storeShop(shopData);
    storeUser(userData);
    resetRefreshAttempts(); // Reset refresh counter on successful login
    
    // Store CSRF token for future requests
    if (tokens?.csrfToken) {
      storeCsrfToken(tokens.csrfToken);
    }
    
    // Record shop login for device memory (with role)
    if (shopData) {
      recordShopLogin(
        { id: shopData.id, name: shopData.name },
        { email: userData.email, name: userData.name, role: decoded.role }
      );
    }
    
    // Initialize activity tracking, status manager, and hot data
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
    hotDataManager.initialize(authToken);
    
    // Track login activity
    await activityTracker.track('login', { email: userData.email });
  };

  const registerShop = async (shopData: any, adminData: any) => {
    // Normalize optional fields before sending
    const normalizedShop = { ...shopData } as any;
    if (typeof normalizedShop.kraPin === 'string') {
      const v = normalizedShop.kraPin.trim();
      if (!v) {
        delete normalizedShop.kraPin; // omit empty
      } else {
        normalizedShop.kraPin = v.toUpperCase();
      }
    }
    
    // Remove confirmPassword - it's only for frontend validation
    const { confirmPassword, ...adminPayload } = adminData;
    
    const res = await fetch(`${config.apiUrl}/auth/register-shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: receive httpOnly cookies
      body: JSON.stringify({ shop: normalizedShop, admin: adminPayload }),
    });
    
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    const { tokens, user: userData, shop: shopInfo } = data;
    
    const authToken = tokens?.accessToken;
    if (!authToken) throw new Error('No token received');
    
    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopInfo);
    
    // Use secure session storage
    storeToken(authToken, tokens?.sessionId, tokens?.expiresIn);
    storeShop(shopInfo);
    storeUser(userData);
    resetRefreshAttempts(); // Reset refresh counter on successful login
    
    // Store CSRF token
    if (tokens?.csrfToken) {
      storeCsrfToken(tokens.csrfToken);
    }
    
    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
  };

  const logout = async () => {
    // Track logout activity
    activityTracker.track('logout', {});
    
    // Cleanup status manager
    statusManager.cleanup();
    
    // Clear all local IndexedDB data to prevent data leakage between shops
    // This is critical for multi-tenancy security
    try {
      await clearAllLocalData();
    } catch (err) {
      console.warn('Failed to clear local data on logout:', err);
    }
    
    // Clear all cached data (dashboard, POS, user data)
    try {
      clearAllCache();
    } catch (err) {
      console.warn('Failed to clear cache on logout:', err);
    }
    
    // Cleanup hot data manager
    try {
      hotDataManager.cleanup();
    } catch (err) {
      console.warn('Failed to cleanup hot data on logout:', err);
    }
    
    setUser(null);
    setShop(null);
    setToken(null);
    setIsDemoMode(false);
    
    // Use secure session clear (handles localStorage, cookie, and session meta)
    clearSession();
    window.localStorage.removeItem(DEMO_MODE_KEY);
  };

  // Demo mode functions
  const enterDemoMode = (forceShop?: Shop) => {
    const targetShop = forceShop || shop;
    if (targetShop?.status === 'pending') {
      setIsDemoMode(true);
      window.localStorage.setItem(DEMO_MODE_KEY, 'true');
    }
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    window.localStorage.removeItem(DEMO_MODE_KEY);
  };

  // Check if shop is pending verification
  const isShopPending = shop?.status === 'pending';

  const hasRole = (role: 'admin' | 'cashier' | 'super_admin'): boolean => {
    return user?.role === role;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isCashier = (): boolean => {
    return user?.role === 'cashier';
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'super_admin';
  };

  const loginWithPin = async (pin: string, shopId: string) => {
    const res = await fetch(`${config.apiUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pin, shopId }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.message || 'Invalid PIN or Shop ID');
    }
    const { tokens, user: userData, shop: shopInfo } = data;

    const authToken = tokens?.accessToken;
    if (!authToken) throw new Error('No token received');

    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopInfo);

    storeToken(authToken, tokens?.sessionId, tokens?.expiresIn);
    storeShop(shopInfo);
    storeUser(userData);
    resetRefreshAttempts(); // Reset refresh counter on successful login
    
    if (tokens?.csrfToken) {
      storeCsrfToken(tokens.csrfToken);
    }

    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);

    // Track login activity
    await activityTracker.track('login_pin', { method: 'PIN' });
  };

  // Google OAuth login - redirects to backend which handles Google OAuth flow
  const loginWithGoogle = () => {
    window.location.href = `${config.apiUrl}/auth/google`;
  };

  // Register shop with Google profile (for new users coming from Google OAuth)
  const registerShopWithGoogle = async (googleProfile: GoogleProfile, shopData: any) => {
    const res = await fetch(`${config.apiUrl}/auth/register-shop-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ googleProfile, shop: shopData }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    const { tokens, user: userData, shop: shopInfo } = data;

    const authToken = tokens?.accessToken;
    if (!authToken) throw new Error('No token received');

    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopInfo);

    storeToken(authToken, tokens?.sessionId, tokens?.expiresIn);
    storeShop(shopInfo);
    storeUser(userData);
    resetRefreshAttempts(); // Reset refresh counter on successful login
    
    if (tokens?.csrfToken) {
      storeCsrfToken(tokens.csrfToken);
    }

    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
  };

  const setAuthFromTokens = (
    tokens: { accessToken: string; csrfToken?: string; sessionId?: string; expiresIn?: number },
    userData: any,
    shopData: any
  ) => {
    const authToken = tokens.accessToken;
    if (!authToken) return;

    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    
    const shopInfo: Shop = {
      id: shopData?.id || decoded.shopId,
      name: shopData?.name || 'Shop',
      status: shopData?.status || 'active',
    };
    setShop(shopInfo);

    storeToken(authToken, tokens.sessionId, tokens.expiresIn);
    storeShop(shopInfo);
    storeUser(userData);
    resetRefreshAttempts(); // Reset refresh counter on successful login
    
    if (tokens.csrfToken) {
      storeCsrfToken(tokens.csrfToken);
    }

    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
  };

  const isAuthenticated = !!user && !!token;

  /**
   * Refresh shop data from the server
   * Useful after verification, subscription changes, etc.
   */
  const refreshShop = async (): Promise<Shop | null> => {
    if (!token || !shop?.id) return null;
    
    try {
      const res = await fetch(`${config.apiUrl}/shops/${shop.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const text = await res.text();
        if (!text) return shop; // Return current shop if empty response
        const updatedShop = JSON.parse(text);
        const newShop: Shop = {
          id: updatedShop._id || updatedShop.id,
          name: updatedShop.name,
          status: updatedShop.status,
          email: updatedShop.email,
          rejectionReason: updatedShop.rejectionReason,
        };
        
        setShop(newShop);
        window.localStorage.setItem('smartduka:shop', JSON.stringify(newShop));
        
        // Exit demo mode if shop is now active
        if (newShop.status === 'active' && isDemoMode) {
          setIsDemoMode(false);
          window.localStorage.removeItem(DEMO_MODE_KEY);
        }
        
        return newShop;
      }
      return null;
    } catch (err) {
      console.error('Failed to refresh shop:', err);
      return null;
    }
  };

  /**
   * Update shop data locally (for optimistic updates)
   */
  const updateShop = (shopData: Partial<Shop>) => {
    if (!shop) return;
    
    const updatedShop = { ...shop, ...shopData };
    setShop(updatedShop);
    window.localStorage.setItem('smartduka:shop', JSON.stringify(updatedShop));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      shop, 
      token, 
      loading, 
      isAuthenticated,
      isDemoMode,
      isShopPending: isShopPending || false,
      login, 
      loginWithPin,
      loginWithGoogle,
      registerShopWithGoogle,
      setAuthFromTokens,
      logout, 
      registerShop,
      enterDemoMode,
      exitDemoMode,
      hasRole,
      isAdmin,
      isCashier,
      isSuperAdmin,
      refreshShop,
      updateShop,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
