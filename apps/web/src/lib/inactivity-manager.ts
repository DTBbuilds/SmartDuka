'use client';

export interface InactivityState {
  isActive: boolean;
  lastActivity: number;
  timeUntilLogout: number | null; // seconds
  showWarning: boolean;
  warningDismissed: boolean;
}

type InactivityListener = (state: InactivityState) => void;

class InactivityManager {
  private state: InactivityState = {
    isActive: true,
    lastActivity: Date.now(),
    timeUntilLogout: null,
    showWarning: false,
    warningDismissed: false,
  };

  private listeners: Set<InactivityListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  // Configuration (in seconds)
  private readonly INACTIVITY_TIMEOUT = 30 * 60; // 30 minutes of inactivity
  private readonly WARNING_BEFORE_LOGOUT = 5 * 60; // Show warning 5 minutes before logout
  private readonly CHECK_INTERVAL = 10; // Check every 10 seconds

  // Events that count as activity
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'focus',
  ];

  subscribe(listener: InactivityListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<InactivityState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Initialize the inactivity manager
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    // Add activity event listeners
    this.ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Start checking for inactivity
    this.startChecking();

    // Load last activity from storage (for cross-tab sync)
    const stored = localStorage.getItem('smartduka:lastActivity');
    if (stored) {
      const lastActivity = parseInt(stored, 10);
      if (!isNaN(lastActivity)) {
        this.state.lastActivity = lastActivity;
      }
    }

    this.initialized = true;
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    if (typeof window === 'undefined') return;

    this.ACTIVITY_EVENTS.forEach(event => {
      window.removeEventListener(event, this.handleActivity);
    });

    this.stopChecking();
    this.initialized = false;
  }

  /**
   * Handle user activity
   */
  private handleActivity = () => {
    const now = Date.now();
    this.updateState({
      isActive: true,
      lastActivity: now,
      timeUntilLogout: null,
      showWarning: false,
      warningDismissed: false,
    });

    // Persist to localStorage for cross-tab sync
    localStorage.setItem('smartduka:lastActivity', now.toString());
  };

  /**
   * Start periodic inactivity checks
   */
  private startChecking() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkInactivity();
    }, this.CHECK_INTERVAL * 1000);
  }

  /**
   * Stop periodic checks
   */
  private stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check current inactivity status
   */
  private checkInactivity() {
    // Check if user is authenticated
    const token = localStorage.getItem('smartduka:token');
    if (!token) {
      // Not logged in, no need to track
      return;
    }

    // Sync with other tabs
    const storedActivity = localStorage.getItem('smartduka:lastActivity');
    if (storedActivity) {
      const storedTime = parseInt(storedActivity, 10);
      if (!isNaN(storedTime) && storedTime > this.state.lastActivity) {
        this.state.lastActivity = storedTime;
      }
    }

    const now = Date.now();
    const inactiveSeconds = Math.floor((now - this.state.lastActivity) / 1000);
    const timeUntilLogout = this.INACTIVITY_TIMEOUT - inactiveSeconds;

    if (timeUntilLogout <= 0) {
      // Time's up - trigger logout
      this.triggerLogout();
      return;
    }

    const showWarning = timeUntilLogout <= this.WARNING_BEFORE_LOGOUT && !this.state.warningDismissed;

    this.updateState({
      isActive: inactiveSeconds < 60, // Consider active if activity within last minute
      timeUntilLogout,
      showWarning,
    });
  }

  /**
   * Trigger automatic logout
   */
  private triggerLogout() {
    // Clear auth data
    localStorage.removeItem('smartduka:token');
    localStorage.removeItem('smartduka:shop');
    localStorage.removeItem('smartduka:lastActivity');
    document.cookie = 'smartduka_token=; path=/; max-age=0';

    // Redirect to login with inactivity flag
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=inactivity';
    }
  }

  /**
   * Extend session (user clicked "Stay logged in")
   */
  extendSession() {
    this.handleActivity();
  }

  /**
   * Dismiss warning without extending session
   */
  dismissWarning() {
    this.updateState({
      showWarning: false,
      warningDismissed: true,
    });
  }

  /**
   * Manual logout
   */
  logout() {
    this.triggerLogout();
  }

  /**
   * Get formatted time until logout
   */
  formatTimeUntilLogout(): string {
    const seconds = this.state.timeUntilLogout;
    if (seconds === null || seconds <= 0) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get state
   */
  getState(): InactivityState {
    return this.state;
  }

  /**
   * Check if warning should be shown
   */
  shouldShowWarning(): boolean {
    return this.state.showWarning && !this.state.warningDismissed;
  }
}

// Singleton instance
export const inactivityManager = new InactivityManager();
