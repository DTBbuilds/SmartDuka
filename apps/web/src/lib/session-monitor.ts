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
  private readonly EXPIRY_WARNING_SECONDS = 300; // 5 minutes - show warning to INACTIVE users
  private readonly AUTO_REFRESH_SECONDS = 600; // 10 minutes - auto refresh if active (before warning threshold)
  private readonly CHECK_INTERVAL_MS = 10000; // 10 seconds - frequent checks for better UX
  private readonly ACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes - consider inactive after 2 min no activity
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
   * Key principle: Active users should NEVER see session warnings
   */
  private async checkAndAutoRefresh() {
    if (!this.autoRefreshEnabled || !this.currentToken) return;
    if (this.state.isRefreshing) return;
    if (this.state.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) return;

    const timeUntilExpiry = this.state.timeUntilExpiry;
    if (timeUntilExpiry === null) return;

    // If token is expiring within 10 minutes and user is active, auto-refresh silently
    // This ensures active users never see the session warning
    if (timeUntilExpiry <= this.AUTO_REFRESH_SECONDS && this.isUserActive()) {
      console.log(`[SessionMonitor] Auto-refreshing token for active user (${timeUntilExpiry}s until expiry)`);
      await this.performAutoRefresh();
    }
  }

  /**
   * Perform automatic token refresh
   */
  private async performAutoRefresh() {
    if (this.state.isRefreshing) return;
    
    // Check if we've exceeded max attempts - stop the loop
    if (this.state.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
      console.warn('[SessionMonitor] Max refresh attempts reached, stopping auto-refresh');
      this.autoRefreshEnabled = false;
      // Clear session and redirect to login
      const { clearSession } = await import('./secure-session');
      clearSession();
      window.location.href = '/login?reason=session_expired';
      return;
    }

    this.updateState({ isRefreshing: true });

    try {
      const { refreshToken, getToken } = await import('./secure-session');
      
      // DO NOT reset attempts here - that causes infinite loop!
      // Attempts are only reset on successful login
      
      const result = await refreshToken();

      if (result?.accessToken) {
        console.log('[SessionMonitor] Auto-refresh successful');
        this.currentToken = result.accessToken;
        
        // Reset attempts only on SUCCESS
        this.updateState({ refreshAttempts: 0, isRefreshing: false });
        
        // Dispatch event for auth context BEFORE reinitializing
        window.dispatchEvent(new CustomEvent('token-refreshed', {
          detail: { accessToken: result.accessToken, csrfToken: result.csrfToken }
        }));
        
        // Reinitialize with new token
        this.initialize(result.accessToken);
      } else {
        // Increment attempts on failure
        const newAttempts = this.state.refreshAttempts + 1;
        console.warn(`[SessionMonitor] Auto-refresh failed (attempt ${newAttempts}/${this.MAX_REFRESH_ATTEMPTS})`);
        
        this.updateState({ 
          refreshAttempts: newAttempts,
          isRefreshing: false 
        });
        
        // If max attempts reached, redirect to login
        if (newAttempts >= this.MAX_REFRESH_ATTEMPTS) {
          console.warn('[SessionMonitor] Max refresh attempts reached, redirecting to login');
          const { clearSession } = await import('./secure-session');
          clearSession();
          window.location.href = '/login?reason=session_expired';
        }
      }
    } catch (err) {
      console.error('[SessionMonitor] Auto-refresh error:', err);
      // Increment attempts on error too
      const newAttempts = this.state.refreshAttempts + 1;
      this.updateState({ 
        refreshAttempts: newAttempts,
        isRefreshing: false 
      });
      
      if (newAttempts >= this.MAX_REFRESH_ATTEMPTS) {
        const { clearSession } = await import('./secure-session');
        clearSession();
        window.location.href = '/login?reason=session_expired';
      }
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
      // IMPORTANT: Use currentToken, not the parameter - token may have been refreshed
      const tokenToCheck = this.currentToken || token;
      const timeUntilExpiry = this.getTimeUntilExpiry(tokenToCheck);
      const isExpired = timeUntilExpiry !== null && timeUntilExpiry <= 0;
      
      // Only show expiring warning if user is INACTIVE
      // If user is active, we'll auto-refresh silently
      const isUserCurrentlyActive = this.isUserActive();
      const isExpiringSoon = timeUntilExpiry !== null && 
        timeUntilExpiry <= this.EXPIRY_WARNING_SECONDS && 
        !isUserCurrentlyActive; // Don't warn active users - we'll auto-refresh

      this.updateState({
        isValid: !isExpired,
        timeUntilExpiry,
        isExpiringSoon,
        isExpired,
      });

      // If expiring soon and user is active, trigger auto-refresh proactively
      if (timeUntilExpiry !== null && timeUntilExpiry <= this.AUTO_REFRESH_SECONDS && isUserCurrentlyActive) {
        this.checkAndAutoRefresh();
      }

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
