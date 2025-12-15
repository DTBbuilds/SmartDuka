'use client';

import { connectionMonitor } from './connection-monitor';
import { sessionMonitor } from './session-monitor';

type VisibilityCallback = (isVisible: boolean) => void;

class TabVisibilityManager {
  private listeners: Set<VisibilityCallback> = new Set();
  private lastHiddenTime: number | null = null;
  private initialized = false;

  // Threshold for triggering refresh (5 minutes)
  private readonly STALE_THRESHOLD_MS = 5 * 60 * 1000;

  initialize() {
    if (this.initialized || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);

    this.initialized = true;
  }

  cleanup() {
    if (typeof document === 'undefined') return;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);

    this.initialized = false;
  }

  subscribe(callback: VisibilityCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(isVisible: boolean) {
    this.listeners.forEach(callback => callback(isVisible));
  }

  private handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';

    if (isVisible) {
      this.onTabBecameVisible();
    } else {
      this.lastHiddenTime = Date.now();
    }

    this.notify(isVisible);
  };

  private handleFocus = () => {
    this.onTabBecameVisible();
    this.notify(true);
  };

  private handleBlur = () => {
    this.lastHiddenTime = Date.now();
    this.notify(false);
  };

  private onTabBecameVisible() {
    const wasHiddenFor = this.lastHiddenTime 
      ? Date.now() - this.lastHiddenTime 
      : 0;

    // If tab was hidden for more than threshold, refresh state
    if (wasHiddenFor > this.STALE_THRESHOLD_MS) {
      this.refreshState();
    }

    this.lastHiddenTime = null;
  }

  private refreshState() {
    // Check connection status
    connectionMonitor.checkConnection();

    // Re-validate session
    const token = typeof window !== 'undefined' 
      ? window.localStorage.getItem('smartduka:token') 
      : null;

    if (token) {
      // Check if token is expired
      if (sessionMonitor.isTokenExpired(token)) {
        // Token expired while tab was inactive - trigger logout
        this.handleExpiredSession();
      } else {
        // Reinitialize session monitor
        sessionMonitor.initialize(token);
      }
    }
  }

  private handleExpiredSession() {
    // Clear auth data
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('smartduka:token');
      window.localStorage.removeItem('smartduka:shop');
      document.cookie = 'smartduka_token=; path=/; max-age=0';

      // Redirect to login with expired flag
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
  }

  isVisible(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  }

  getTimeSinceHidden(): number | null {
    if (!this.lastHiddenTime) return null;
    return Date.now() - this.lastHiddenTime;
  }
}

// Singleton instance
export const tabVisibilityManager = new TabVisibilityManager();
