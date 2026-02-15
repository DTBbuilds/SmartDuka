'use client';

import { config } from './config';

/**
 * API Resilience Layer
 * Handles backend cold starts, retries, and provides user-friendly feedback
 * for when the backend is waking up after inactivity
 */

export type BackendStatus = 
  | 'ready'           // Backend is responding normally
  | 'waking'          // Backend is starting up (cold start)
  | 'slow'            // Backend is responding but slowly
  | 'unreachable'     // Cannot reach backend
  | 'offline'         // Device is offline
  | 'error';          // Backend returned an error

export interface BackendState {
  status: BackendStatus;
  message: string;
  detail?: string;
  progress?: number;      // 0-100 for waking progress
  retryCount: number;
  estimatedWaitTime?: number; // seconds
  lastSuccessAt?: Date;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 1.5,
  timeoutMs: 30000, // 30 seconds for cold starts
};

// Cold start detection - if first request takes > 5s, likely a cold start
const COLD_START_THRESHOLD_MS = 5000;
const SLOW_RESPONSE_THRESHOLD_MS = 3000;

type StateListener = (state: BackendState) => void;

class ApiResilience {
  private state: BackendState = {
    status: 'ready',
    message: '',
    retryCount: 0,
  };

  private listeners: Set<StateListener> = new Set();
  private isWaking = false;
  private wakeStartTime: number | null = null;

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<BackendState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  getState(): BackendState {
    return this.state;
  }

  /**
   * Get user-friendly message based on status
   */
  private getStatusMessage(status: BackendStatus, retryCount: number): { message: string; detail?: string } {
    switch (status) {
      case 'waking':
        if (retryCount === 0) {
          return {
            message: 'Connecting to server...',
            detail: 'The server is starting up. This usually takes 10-30 seconds.',
          };
        } else if (retryCount === 1) {
          return {
            message: 'Server is waking up...',
            detail: 'Please wait while we establish a connection.',
          };
        } else {
          return {
            message: 'Almost there...',
            detail: 'The server is taking longer than usual to start.',
          };
        }
      case 'slow':
        return {
          message: 'Connection is slow',
          detail: 'The server is responding slowly. Your request is being processed.',
        };
      case 'unreachable':
        return {
          message: 'Server temporarily unavailable',
          detail: 'We\'re having trouble reaching the server. Retrying automatically...',
        };
      case 'offline':
        return {
          message: 'No internet connection',
          detail: 'Please check your network connection and try again.',
        };
      case 'error':
        return {
          message: 'Something went wrong',
          detail: 'We encountered an error. Please try again.',
        };
      default:
        return { message: '' };
    }
  }

  /**
   * Calculate estimated wait time based on retry count
   */
  private getEstimatedWaitTime(retryCount: number): number {
    // Typical cold start times: 10-30 seconds
    const baseTime = 15;
    const remaining = Math.max(0, baseTime - (retryCount * 3));
    return remaining;
  }

  /**
   * Calculate progress for waking state (0-100)
   */
  private getWakingProgress(): number {
    if (!this.wakeStartTime) return 0;
    const elapsed = Date.now() - this.wakeStartTime;
    // Assume 30 seconds max for cold start
    const progress = Math.min(95, (elapsed / 30000) * 100);
    return Math.round(progress);
  }

  /**
   * Check if backend is available with a quick health check
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${config.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wake up the backend with retries and progress updates
   */
  async wakeBackend(): Promise<boolean> {
    if (this.isWaking) {
      // Already waking, wait for it
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isWaking) {
            clearInterval(checkInterval);
            resolve(this.state.status === 'ready');
          }
        }, 500);
      });
    }

    this.isWaking = true;
    this.wakeStartTime = Date.now();

    const initialMsg = this.getStatusMessage('waking', 0);
    this.updateState({
      status: 'waking',
      message: initialMsg.message,
      detail: initialMsg.detail,
      progress: 0,
      retryCount: 0,
      estimatedWaitTime: this.getEstimatedWaitTime(0),
    });

    let retryCount = 0;
    const maxRetries = 10; // More retries for cold starts
    let delay = 2000; // Start with 2 second delay

    while (retryCount < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const startTime = Date.now();
        const response = await fetch(`${config.apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        const elapsed = Date.now() - startTime;

        if (response.ok) {
          this.isWaking = false;
          this.wakeStartTime = null;
          this.updateState({
            status: elapsed > SLOW_RESPONSE_THRESHOLD_MS ? 'slow' : 'ready',
            message: '',
            detail: undefined,
            progress: 100,
            retryCount: 0,
            lastSuccessAt: new Date(),
          });
          return true;
        }
      } catch (error: any) {
        // Check if offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const offlineMsg = this.getStatusMessage('offline', retryCount);
          this.updateState({
            status: 'offline',
            message: offlineMsg.message,
            detail: offlineMsg.detail,
            retryCount,
          });
          this.isWaking = false;
          return false;
        }
      }

      retryCount++;
      const retryMsg = this.getStatusMessage('waking', retryCount);
      this.updateState({
        status: 'waking',
        message: retryMsg.message,
        detail: retryMsg.detail,
        progress: this.getWakingProgress(),
        retryCount,
        estimatedWaitTime: this.getEstimatedWaitTime(retryCount),
      });

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.3, 5000); // Increase delay, max 5 seconds
    }

    // Failed to wake
    this.isWaking = false;
    this.wakeStartTime = null;
    const failedMsg = this.getStatusMessage('unreachable', retryCount);
    this.updateState({
      status: 'unreachable',
      message: failedMsg.message,
      detail: failedMsg.detail,
      retryCount,
    });
    return false;
  }

  /**
   * Execute a fetch request with resilience (retries, timeout, wake-up detection)
   */
  async resilientFetch<T>(
    url: string,
    options: RequestInit = {},
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<Response> {
    const cfg = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | null = null;
    let delay = cfg.initialDelayMs;

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        // Check if offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const { message, detail } = this.getStatusMessage('offline', attempt);
          this.updateState({ status: 'offline', message, detail, retryCount: attempt });
          throw new Error('No internet connection');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

        const startTime = Date.now();
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const elapsed = Date.now() - startTime;

        // Detect cold start (first request took a long time)
        if (elapsed > COLD_START_THRESHOLD_MS && attempt === 0) {
          console.log(`[API] Cold start detected: ${elapsed}ms`);
        }

        // Update state on success
        if (response.ok || response.status < 500) {
          this.updateState({
            status: elapsed > SLOW_RESPONSE_THRESHOLD_MS ? 'slow' : 'ready',
            message: '',
            retryCount: 0,
            lastSuccessAt: new Date(),
          });
        }

        return response;
      } catch (error: any) {
        lastError = error;

        // Don't retry on abort (user cancelled) or if offline
        if (error.name === 'AbortError') {
          // Timeout - likely cold start
          if (attempt === 0) {
            // First timeout, try to wake the backend
            const { message, detail } = this.getStatusMessage('waking', attempt);
            this.updateState({
              status: 'waking',
              message,
              detail,
              retryCount: attempt,
              estimatedWaitTime: this.getEstimatedWaitTime(attempt),
            });
          }
        }

        if (attempt < cfg.maxRetries) {
          const { message, detail } = this.getStatusMessage('waking', attempt + 1);
          this.updateState({
            status: 'waking',
            message,
            detail,
            retryCount: attempt + 1,
            estimatedWaitTime: this.getEstimatedWaitTime(attempt + 1),
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelayMs);
        }
      }
    }

    // All retries exhausted
    const unreachableMsg = this.getStatusMessage('unreachable', cfg.maxRetries);
    this.updateState({
      status: 'unreachable',
      message: unreachableMsg.message,
      detail: unreachableMsg.detail,
      retryCount: cfg.maxRetries,
    });

    throw lastError || new Error('Failed to connect to server');
  }

  /**
   * Mark backend as ready (call after successful request)
   */
  markReady() {
    if (this.state.status !== 'ready') {
      this.updateState({
        status: 'ready',
        message: '',
        detail: undefined,
        progress: undefined,
        retryCount: 0,
        lastSuccessAt: new Date(),
      });
    }
  }

  /**
   * Reset state
   */
  reset() {
    this.isWaking = false;
    this.wakeStartTime = null;
    this.updateState({
      status: 'ready',
      message: '',
      detail: undefined,
      progress: undefined,
      retryCount: 0,
    });
  }
}

// Singleton instance
export const apiResilience = new ApiResilience();
