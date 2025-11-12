/**
 * Status Manager
 * Manages online/offline status and sends heartbeat to backend
 */

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
  private inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  private idleThreshold = 15 * 60 * 1000; // 15 minutes
  private heartbeatInterval_ms = 30 * 1000; // 30 seconds
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    this.setupActivityListeners();
  }

  /**
   * Initialize status manager with user info
   */
  initialize(token: string, userId: string, shopId: string) {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.token = token;
    this.userId = userId;
    this.shopId = shopId;
    this.status = 'online';
    this.lastActivity = new Date();

    // Setup activity listeners if not already done
    this.setupActivityListeners();

    // Start heartbeat
    this.startHeartbeat();
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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval_ms);

    // Send initial heartbeat
    this.sendHeartbeat();
  }

  /**
   * Send heartbeat to backend
   */
  private async sendHeartbeat() {
    // Skip heartbeat if no token, userId, or shopId
    if (!this.token || !this.userId || !this.shopId) return;

    try {
      const response = await fetch(`${this.baseUrl}/activity/heartbeat`, {
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

      if (!response.ok) {
        // Silently fail for heartbeat - don't log 401 errors
        if (response.status !== 401) {
          console.error('Heartbeat failed:', response.status);
        }
      }
    } catch (error) {
      // Silently fail - heartbeat errors should not break the app
      // console.error('Heartbeat error:', error);
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

    this.status = 'offline';
    this.token = null;
    this.userId = null;
    this.shopId = null;
  }
}

// Export singleton instance
export const statusManager = new StatusManager();
