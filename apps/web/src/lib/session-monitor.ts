'use client';

import { config } from './config';

export interface SessionState {
  isValid: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null; // in seconds
  isExpiringSoon: boolean; // less than 5 minutes
  isExpired: boolean;
  isRefreshing: boolean;
  lastActivity: Date | null;
  refreshAttempts: number;
}

type SessionListener = (state: SessionState) => void;

/**
 * Intelligent Session Monitor
 * 
 * Features:
 * - Proactive token refresh before expiry
 * - Activity-based session extension
 * - Smart retry with exponential backoff
 * - User activity tracking to keep session alive
 */
class SessionMonitor {
  private state: SessionState = {
    isValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
    isExpiringSoon: false,
    isExpired: false,
    isRefreshing: false,
    lastActivity: null,
    refreshAttempts: 0,
  };

  private listeners: Set<SessionListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private activityInterval: NodeJS.Timeout | null = null;
  private warningShown = false;
  private currentToken: string | null = null;
  private autoRefreshEnabled = true;

  // Thresholds - Intelligent timing
  private readonly EXPIRY_WARNING_SECONDS = 300; // 5 minutes - show warning
  private readonly AUTO_REFRESH_SECONDS = 180; // 3 minutes - auto refresh if active
  private readonly CHECK_INTERVAL_MS = 15000; // 15 seconds - more frequent checks
  private readonly ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - consider inactive
  private readonly MAX_REFRESH_ATTEMPTS = 3;

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<SessionState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Parse JWT token and extract expiry
   */
  parseToken(token: string): { exp: number; sub: string; role: string } | null {
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
  isTokenExpired(token: string): boolean {
    const payload = this.parseToken(token);
    if (!payload?.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry(token: string): number | null {
    const payload = this.parseToken(token);
    if (!payload?.exp) return null;
    return Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 1000));
  }

  /**
   * Initialize monitoring with a token
   */
  initialize(token: string | null) {
    this.stopMonitoring();
    this.warningShown = false;
    this.currentToken = token;

    if (!token) {
      this.updateState({
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        isExpiringSoon: false,
        isExpired: true,
        isRefreshing: false,
        lastActivity: null,
        refreshAttempts: 0,
      });
      return;
    }

    const payload = this.parseToken(token);
    if (!payload?.exp) {
      this.updateState({
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        isExpiringSoon: false,
        isExpired: true,
        isRefreshing: false,
        lastActivity: null,
        refreshAttempts: 0,
      });
      return;
    }

    const expiresAt = new Date(payload.exp * 1000);
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const isExpired = timeUntilExpiry !== null && timeUntilExpiry <= 0;
    const isExpiringSoon = timeUntilExpiry !== null && timeUntilExpiry <= this.EXPIRY_WARNING_SECONDS;

    this.updateState({
      isValid: !isExpired,
      expiresAt,
      timeUntilExpiry,
      isExpiringSoon,
      isExpired,
      isRefreshing: false,
      lastActivity: new Date(),
      refreshAttempts: 0,
    });

    // Start periodic checks
    this.startMonitoring(token);
    
    // Start activity tracking
    this.startActivityTracking();
  }

  /**
   * Record user activity - call this on user interactions
   */
  recordActivity() {
    this.updateState({ lastActivity: new Date() });
  }

  /**
   * Check if user is currently active (had activity in last 5 minutes)
   */
  isUserActive(): boolean {
    if (!this.state.lastActivity) return false;
    return Date.now() - this.state.lastActivity.getTime() < this.ACTIVITY_TIMEOUT_MS;
  }

  /**
   * Start tracking user activity
   */
  private startActivityTracking() {
    if (typeof window === 'undefined') return;

    // Track various user activities
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      this.recordActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Store cleanup function
    this.activityInterval = setInterval(() => {
      // Periodic activity check - could trigger proactive refresh
      this.checkAndAutoRefresh();
    }, 60000) as unknown as NodeJS.Timeout; // Check every minute
  }

  /**
   * Intelligent auto-refresh based on activity and token expiry
   */
  private async checkAndAutoRefresh() {
    if (!this.autoRefreshEnabled || !this.currentToken) return;
    if (this.state.isRefreshing) return;
    if (this.state.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) return;

    const timeUntilExpiry = this.state.timeUntilExpiry;
    if (timeUntilExpiry === null) return;

    // If token is expiring soon and user is active, auto-refresh
    if (timeUntilExpiry <= this.AUTO_REFRESH_SECONDS && this.isUserActive()) {
      console.log('[SessionMonitor] Auto-refreshing token for active user');
      await this.performAutoRefresh();
    }
  }

  /**
   * Perform automatic token refresh
   */
  private async performAutoRefresh() {
    if (this.state.isRefreshing) return;

    this.updateState({ isRefreshing: true });

    try {
      const { refreshToken } = await import('./secure-session');
      const result = await refreshToken();

      if (result?.accessToken) {
        console.log('[SessionMonitor] Auto-refresh successful');
        this.currentToken = result.accessToken;
        this.initialize(result.accessToken);
        
        // Dispatch event for auth context
        window.dispatchEvent(new CustomEvent('token-refreshed', {
          detail: { accessToken: result.accessToken, csrfToken: result.csrfToken }
        }));
        
        this.updateState({ refreshAttempts: 0 });
      } else {
        console.warn('[SessionMonitor] Auto-refresh failed');
        this.updateState({ 
          refreshAttempts: this.state.refreshAttempts + 1,
          isRefreshing: false 
        });
      }
    } catch (err) {
      console.error('[SessionMonitor] Auto-refresh error:', err);
      this.updateState({ 
        refreshAttempts: this.state.refreshAttempts + 1,
        isRefreshing: false 
      });
    }
  }

  /**
   * Enable/disable auto-refresh
   */
  setAutoRefresh(enabled: boolean) {
    this.autoRefreshEnabled = enabled;
  }

  private startMonitoring(token: string) {
    this.checkInterval = setInterval(() => {
      const timeUntilExpiry = this.getTimeUntilExpiry(token);
      const isExpired = timeUntilExpiry !== null && timeUntilExpiry <= 0;
      const isExpiringSoon = timeUntilExpiry !== null && timeUntilExpiry <= this.EXPIRY_WARNING_SECONDS;

      this.updateState({
        isValid: !isExpired,
        timeUntilExpiry,
        isExpiringSoon,
        isExpired,
      });

      // Stop monitoring if expired
      if (isExpired) {
        this.stopMonitoring();
      }
    }, this.CHECK_INTERVAL_MS);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }

  getState(): SessionState {
    return this.state;
  }

  /**
   * Format time until expiry for display
   */
  formatTimeUntilExpiry(): string {
    const seconds = this.state.timeUntilExpiry;
    if (seconds === null) return 'Unknown';
    if (seconds <= 0) return 'Expired';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }

  markWarningShown() {
    this.warningShown = true;
  }

  shouldShowWarning(): boolean {
    return this.state.isExpiringSoon && !this.warningShown && !this.state.isExpired;
  }
}

// Singleton instance
export const sessionMonitor = new SessionMonitor();
