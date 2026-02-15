'use client';

import { config } from './config';

export interface ShiftActivityState {
  shiftId: string | null;
  isActive: boolean;
  lastActivityAt: number;
  activeTimeMs: number;
  inactiveTimeMs: number;
  isOnBreak: boolean;
}

type ActivityListener = (state: ShiftActivityState) => void;

class ShiftActivityTracker {
  private state: ShiftActivityState = {
    shiftId: null,
    isActive: true,
    lastActivityAt: Date.now(),
    activeTimeMs: 0,
    inactiveTimeMs: 0,
    isOnBreak: false,
  };

  private listeners: Set<ActivityListener> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private initialized = false;

  // Configuration
  private readonly PING_INTERVAL = 60 * 1000; // Send ping every 60 seconds
  private readonly INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes of no activity = inactive
  private readonly ACTIVITY_CHECK_INTERVAL = 10 * 1000; // Check activity every 10 seconds

  // Events that count as activity
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ];

  subscribe(listener: ActivityListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<ShiftActivityState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Initialize tracking for a shift
   */
  initialize(shiftId: string, authToken: string) {
    if (typeof window === 'undefined') return;

    this.token = authToken;
    this.state.shiftId = shiftId;
    this.state.lastActivityAt = Date.now();
    this.state.isActive = true;

    // Add activity event listeners
    this.ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Start periodic activity checks
    this.startActivityChecking();

    // Start periodic pings to backend
    this.startPinging();

    this.initialized = true;
    console.log('[ShiftActivityTracker] Initialized for shift:', shiftId);
  }

  /**
   * Cleanup when shift ends
   */
  cleanup() {
    if (typeof window === 'undefined') return;

    // Remove event listeners
    this.ACTIVITY_EVENTS.forEach(event => {
      window.removeEventListener(event, this.handleActivity);
    });

    // Stop intervals
    this.stopActivityChecking();
    this.stopPinging();

    // Reset state
    this.state = {
      shiftId: null,
      isActive: true,
      lastActivityAt: Date.now(),
      activeTimeMs: 0,
      inactiveTimeMs: 0,
      isOnBreak: false,
    };
    this.token = null;
    this.initialized = false;

    console.log('[ShiftActivityTracker] Cleaned up');
  }

  /**
   * Handle user activity
   */
  private handleActivity = () => {
    const now = Date.now();
    this.updateState({
      lastActivityAt: now,
      isActive: true,
    });
  };

  /**
   * Start periodic activity checks
   */
  private startActivityChecking() {
    if (this.activityCheckInterval) return;

    this.activityCheckInterval = setInterval(() => {
      this.checkActivity();
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Stop activity checking
   */
  private stopActivityChecking() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Check if user is currently active
   */
  private checkActivity() {
    if (this.state.isOnBreak) return; // Don't check during breaks

    const now = Date.now();
    const timeSinceLastActivity = now - this.state.lastActivityAt;
    const isActive = timeSinceLastActivity < this.INACTIVITY_THRESHOLD;

    if (this.state.isActive !== isActive) {
      this.updateState({ isActive });
      console.log('[ShiftActivityTracker] Activity status changed:', isActive ? 'active' : 'inactive');
    }
  }

  /**
   * Start periodic pings to backend
   */
  private startPinging() {
    if (this.pingInterval) return;

    // Send initial ping
    this.sendPing();

    // Then ping periodically
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL);
  }

  /**
   * Stop pinging
   */
  private stopPinging() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send activity ping to backend
   */
  private async sendPing() {
    if (!this.state.shiftId || !this.token) return;

    try {
      const res = await fetch(`${config.apiUrl}/shifts/${this.state.shiftId}/activity-ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          isActive: this.state.isActive && !this.state.isOnBreak,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.updateState({
          activeTimeMs: data.activeTimeMs || 0,
          inactiveTimeMs: data.inactiveTimeMs || 0,
        });
      }
    } catch (error) {
      console.error('[ShiftActivityTracker] Failed to send ping:', error);
    }
  }

  /**
   * Start a break
   */
  async startBreak(reason?: string): Promise<boolean> {
    if (!this.state.shiftId || !this.token) return false;

    try {
      const res = await fetch(`${config.apiUrl}/shifts/${this.state.shiftId}/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        this.updateState({ isOnBreak: true, isActive: false });
        console.log('[ShiftActivityTracker] Break started');
        return true;
      }
    } catch (error) {
      console.error('[ShiftActivityTracker] Failed to start break:', error);
    }
    return false;
  }

  /**
   * End a break
   */
  async endBreak(): Promise<boolean> {
    if (!this.state.shiftId || !this.token) return false;

    try {
      const res = await fetch(`${config.apiUrl}/shifts/${this.state.shiftId}/break/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (res.ok) {
        this.updateState({ isOnBreak: false, isActive: true, lastActivityAt: Date.now() });
        console.log('[ShiftActivityTracker] Break ended');
        return true;
      }
    } catch (error) {
      console.error('[ShiftActivityTracker] Failed to end break:', error);
    }
    return false;
  }

  /**
   * Get current state
   */
  getState(): ShiftActivityState {
    return this.state;
  }

  /**
   * Check if tracker is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Format time in milliseconds to human readable
   */
  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get active percentage
   */
  getActivePercentage(): number {
    const total = this.state.activeTimeMs + this.state.inactiveTimeMs;
    if (total === 0) return 100;
    return Math.round((this.state.activeTimeMs / total) * 100);
  }
}

// Singleton instance
export const shiftActivityTracker = new ShiftActivityTracker();
