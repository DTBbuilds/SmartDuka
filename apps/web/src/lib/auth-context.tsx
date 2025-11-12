'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { activityTracker } from './activity-tracker';
import { statusManager } from './status-manager';

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

type AuthContextType = {
  user: AuthUser | null;
  shop: Shop | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: 'admin' | 'cashier' | 'super_admin', shopId?: string) => Promise<void>;
  loginWithPin: (pin: string, shopId: string) => Promise<void>;
  logout: () => void;
  registerShop: (shopData: any, adminData: any) => Promise<void>;
  hasRole: (role: 'admin' | 'cashier' | 'super_admin') => boolean;
  isAdmin: () => boolean;
  isCashier: () => boolean;
  isSuperAdmin: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = window.localStorage.getItem('smartduka:token');
    const storedShop = window.localStorage.getItem('smartduka:shop');
    if (storedToken) {
      try {
        const decoded = JSON.parse(atob(storedToken.split('.')[1]));
        setUser(decoded);
        setToken(storedToken);
        
        // Initialize activity tracking and status manager
        activityTracker.setToken(storedToken, decoded.role);
        statusManager.initialize(storedToken, decoded.sub, decoded.shopId);
        if (storedShop) {
          setShop(JSON.parse(storedShop));
        }
      } catch (err) {
        window.localStorage.removeItem('smartduka:token');
        window.localStorage.removeItem('smartduka:shop');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: 'admin' | 'cashier' | 'super_admin', shopId?: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password,
        role,
        shopId,
      }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }
    const data = await res.json();
    const { token: authToken, user: userData, shop: shopData } = data;
    
    if (!authToken) throw new Error('No token received');
    
    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopData);
    
    window.localStorage.setItem('smartduka:token', authToken);
    window.localStorage.setItem('smartduka:shop', JSON.stringify(shopData));
    
    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
    
    // Track login activity
    await activityTracker.track('login', { email: userData.email });
  };

  const registerShop = async (shopData: any, adminData: any) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
    const res = await fetch(`${base}/auth/register-shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: normalizedShop, admin: adminData }),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }
    
    const data = await res.json();
    const { token: authToken, user: userData, shop: shopInfo } = data;
    
    if (!authToken) throw new Error('No token received');
    
    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopInfo);
    
    window.localStorage.setItem('smartduka:token', authToken);
    window.localStorage.setItem('smartduka:shop', JSON.stringify(shopInfo));
    
    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);
  };

  const logout = () => {
    // Track logout activity
    activityTracker.track('logout', {});
    
    // Cleanup status manager
    statusManager.cleanup();
    
    setUser(null);
    setShop(null);
    setToken(null);
    window.localStorage.removeItem('smartduka:token');
    window.localStorage.removeItem('smartduka:shop');
  };

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
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${base}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, shopId }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Invalid PIN or Shop ID');
    }

    const data = await res.json();
    const { token: authToken, user: userData, shop: shopInfo } = data;

    if (!authToken) throw new Error('No token received');

    const decoded = JSON.parse(atob(authToken.split('.')[1]));
    setUser(decoded);
    setToken(authToken);
    setShop(shopInfo);

    window.localStorage.setItem('smartduka:token', authToken);
    window.localStorage.setItem('smartduka:shop', JSON.stringify(shopInfo));

    // Initialize activity tracking and status manager
    activityTracker.setToken(authToken, decoded.role);
    statusManager.initialize(authToken, decoded.sub, decoded.shopId);

    // Track login activity
    await activityTracker.track('login_pin', { method: 'PIN' });
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ 
      user, 
      shop, 
      token, 
      loading, 
      isAuthenticated,
      login, 
      loginWithPin,
      logout, 
      registerShop,
      hasRole,
      isAdmin,
      isCashier,
      isSuperAdmin
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
