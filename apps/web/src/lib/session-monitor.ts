'use client';

import { config } from './config';

export interface SessionState {
  isValid: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null; // in seconds
  isExpiringSoon: boolean; // less than 5 minutes
  isExpired: boolean;
}

type SessionListener = (state: SessionState) => void;

class SessionMonitor {
  private state: SessionState = {
    isValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
    isExpiringSoon: false,
    isExpired: false,
  };

  private listeners: Set<SessionListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private warningShown = false;

  // Thresholds
  private readonly EXPIRY_WARNING_SECONDS = 300; // 5 minutes
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds

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

    if (!token) {
      this.updateState({
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        isExpiringSoon: false,
        isExpired: true,
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
    });

    // Start periodic checks
    this.startMonitoring(token);
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
