'use client';

import { config } from './config';

/**
 * API Resilience Layer
 * Handles retries, timeouts, and provides user-friendly feedback
 * for connection issues
 */

export type BackendStatus = 
  | 'ready'           // Backend is responding normally
  | 'waking'          // Backend is reconnecting
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
  timeoutMs: 15000,
};

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
        return {
          message: 'Reconnecting...',
          detail: retryCount > 1 ? 'Taking longer than usual. Please wait.' : undefined,
        };
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
   * Calculate progress for reconnecting state (0-100)
   */
  private getWakingProgress(): number {
    if (!this.wakeStartTime) return 0;
    const elapsed = Date.now() - this.wakeStartTime;
    const progress = Math.min(95, (elapsed / 15000) * 100);
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
          if (attempt === 0) {
            const { message, detail } = this.getStatusMessage('waking', attempt);
            this.updateState({
              status: 'waking',
              message,
              detail,
              retryCount: attempt,
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
