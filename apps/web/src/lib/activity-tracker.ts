/**
 * Activity Tracker
 * Tracks user activities and sends them to the backend for logging
 */

import { config } from './config';

export interface ActivityEvent {
  action: string;
  details?: Record<string, any>;
}

class ActivityTracker {
  private baseUrl: string;
  private token: string | null = null;
  private userRole: string | null = null;
  private queue: ActivityEvent[] = [];
  private isOnline: boolean = true;
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = config.apiUrl;
    this.initialize();
  }

  /**
   * Initialize event listeners (client-side only)
   */
  private initialize() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Set the authentication token and user role
   */
  setToken(token: string | null, userRole?: string) {
    this.token = token;
    this.userRole = userRole || null;
  }

  /**
   * Track an activity
   */
  async track(action: string, details?: Record<string, any>) {
    // Ensure initialized on client-side
    if (typeof window !== 'undefined' && !this.initialized) {
      this.initialize();
    }

    const event: ActivityEvent = { action, details };

    if (!this.isOnline) {
      // Queue the event if offline
      this.queue.push(event);
      return;
    }

    try {
      await this.sendActivity(event);
    } catch (error) {
      // Queue the event if sending fails
      this.queue.push(event);
      console.error('Failed to track activity:', error);
    }
  }

  /**
   * Send activity to backend
   */
  private async sendActivity(event: ActivityEvent) {
    // Skip activity logging for super admin (no shopId)
    if (!this.token || this.userRole === 'super_admin') return;

    try {
      const response = await fetch(`${this.baseUrl}/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        // Silently fail for activity logging - don't throw errors
        if (response.status !== 401) {
          console.error(`Activity log failed: ${response.status}`);
        }
        return;
      }
    } catch (error) {
      console.error('Activity tracking error:', error);
      throw error;
    }
  }

  /**
   * Flush queued activities
   */
  private async flushQueue() {
    if (this.queue.length === 0 || !this.isOnline) return;

    const events = [...this.queue];
    this.queue = [];

    for (const event of events) {
      try {
        await this.sendActivity(event);
      } catch (error) {
        // Re-queue failed events
        this.queue.push(event);
      }
    }
  }

  /**
   * Get queued activities count
   */
  getQueuedCount(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();
