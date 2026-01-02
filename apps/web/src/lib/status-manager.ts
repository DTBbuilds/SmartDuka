/**
 * Status Manager
 * Manages online/offline status and sends heartbeat to backend
 */

import { config } from './config';

export type UserStatus = 'online' | 'idle' | 'offline';

class StatusManager {
  private baseUrl: string;
  private token: string | null = null;
  private userId: string | null = null;
  private shopId: string | null = null;
  private status: UserStatus = 'offline';
  private lastActivity: Date = new Date();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private initialHeartbeatTimeout: NodeJS.Timeout | null = null;
  private inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  private idleThreshold = 15 * 60 * 1000; // 15 minutes
  private heartbeatInterval_ms = 30 * 1000; // 30 seconds
  private initialHeartbeatDelay_ms = 2000; // 2 second delay for first heartbeat
  private initialized: boolean = false;
  private tokenValidated: boolean = false;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;

  constructor() {
    this.baseUrl = config.apiUrl;
    this.setupActivityListeners();
  }

  /**
   * Initialize status manager with user info
   */
  initialize(token: string, userId: string, shopId: string) {
    if (typeof window === 'undefined') {
      return;
    }

    // Allow re-initialization with new token (e.g., after token refresh)
    if (this.initialized && this.token === token) {
      return;
    }

    this.initialized = true;
    this.token = token;
    this.userId = userId;
    this.shopId = shopId;
    this.status = 'online';
    this.lastActivity = new Date();
    this.tokenValidated = false;
    this.consecutiveFailures = 0;

    // Setup activity listeners if not already done
    this.setupActivityListeners();

    // Start heartbeat with delay to allow auth to stabilize
    this.startHeartbeat();
  }

  /**
   * Update token (e.g., after refresh)
   */
  updateToken(token: string) {
    if (token && token !== this.token) {
      this.token = token;
      this.tokenValidated = false;
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Setup activity listeners (client-side only)
   */
  private setupActivityListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      document.addEventListener(event, () => this.recordActivity(), { passive: true });
    });
  }

  /**
   * Record user activity
   */
  private recordActivity() {
    this.lastActivity = new Date();

    if (this.status !== 'online') {
      this.status = 'online';
      this.updateStatus();
    }

    // Reset inactivity timeout
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    this.inactivityTimeout = setTimeout(() => {
      if (this.status === 'online') {
        this.status = 'idle';
        this.updateStatus();
      }
    }, this.inactivityThreshold);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat() {
    // Clear any existing intervals/timeouts
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.initialHeartbeatTimeout) {
      clearTimeout(this.initialHeartbeatTimeout);
    }

    // Delay initial heartbeat to allow auth to fully stabilize
    // This prevents 401 errors right after OAuth callback
    this.initialHeartbeatTimeout = setTimeout(() => {
      this.sendHeartbeat();
      
      // Start regular interval after first successful heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, this.heartbeatInterval_ms);
    }, this.initialHeartbeatDelay_ms);
  }

  /**
   * Send heartbeat to backend
   */
  private async sendHeartbeat() {
    // Skip heartbeat if no token, userId, or shopId
    if (!this.token || !this.userId || !this.shopId) return;
    
    // Skip if token looks invalid (too short or malformed JWT)
    if (this.token.length < 50 || this.token.split('.').length !== 3) return;
    
    // Skip if too many consecutive failures (back off)
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      // Reset after 1 minute to try again
      setTimeout(() => {
        this.consecutiveFailures = 0;
      }, 60000);
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/activity/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        credentials: 'include', // Include cookies for session validation
        body: JSON.stringify({
          userId: this.userId,
          shopId: this.shopId,
          status: this.status,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        this.tokenValidated = true;
        this.consecutiveFailures = 0;
      } else if (response.status === 401) {
        // Token might be expired or invalid
        this.consecutiveFailures++;
        this.tokenValidated = false;
        // Don't log - this is expected during auth transitions
      } else {
        this.consecutiveFailures++;
        console.error('Heartbeat failed:', response.status);
      }
    } catch (error) {
      // Network error - increment failures but don't log
      this.consecutiveFailures++;
    }
  }

  /**
   * Update status on backend
   */
  private async updateStatus() {
    if (!this.token || !this.userId) return;

    try {
      await fetch(`${this.baseUrl}/activity/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          userId: this.userId,
          shopId: this.shopId,
          status: this.status,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Status update error:', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): UserStatus {
    return this.status;
  }

  /**
   * Get last activity time
   */
  getLastActivity(): Date {
    return this.lastActivity;
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    
    if (this.initialHeartbeatTimeout) {
      clearTimeout(this.initialHeartbeatTimeout);
      this.initialHeartbeatTimeout = null;
    }

    this.status = 'offline';
    this.token = null;
    this.userId = null;
    this.shopId = null;
    this.initialized = false;
    this.tokenValidated = false;
    this.consecutiveFailures = 0;
  }

  /**
   * Check if heartbeat is working
   */
  isHealthy(): boolean {
    return this.tokenValidated && this.consecutiveFailures === 0;
  }
}

// Export singleton instance
export const statusManager = new StatusManager();
