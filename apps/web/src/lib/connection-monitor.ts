'use client';

import { config } from './config';

export type ConnectionStatus = 'connecting' | 'connected' | 'slow' | 'offline' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  latency: number | null;
  lastChecked: Date | null;
  errorMessage: string | null;
  retryCount: number;
}

type ConnectionListener = (state: ConnectionState) => void;

class ConnectionMonitor {
  private state: ConnectionState = {
    status: 'connecting',
    latency: null,
    lastChecked: null,
    errorMessage: null,
    retryCount: 0,
  };

  private listeners: Set<ConnectionListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  // Thresholds
  private readonly SLOW_THRESHOLD_MS = 3000; // 3 seconds
  private readonly TIMEOUT_MS = 15000; // 15 seconds
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<ConnectionState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  async checkConnection(): Promise<ConnectionState> {
    if (this.isChecking) return this.state;
    this.isChecking = true;

    const startTime = Date.now();

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(`${config.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (response.ok) {
        const status: ConnectionStatus = latency > this.SLOW_THRESHOLD_MS ? 'slow' : 'connected';
        this.updateState({
          status,
          latency,
          lastChecked: new Date(),
          errorMessage: null,
          retryCount: 0,
        });
      } else {
        this.updateState({
          status: 'error',
          latency,
          lastChecked: new Date(),
          errorMessage: `Server returned ${response.status}`,
          retryCount: this.state.retryCount + 1,
        });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;

      if (error.name === 'AbortError') {
        this.updateState({
          status: 'slow',
          latency,
          lastChecked: new Date(),
          errorMessage: 'Connection timeout - server is slow to respond',
          retryCount: this.state.retryCount + 1,
        });
      } else if (!navigator.onLine) {
        this.updateState({
          status: 'offline',
          latency: null,
          lastChecked: new Date(),
          errorMessage: 'No internet connection',
          retryCount: this.state.retryCount + 1,
        });
      } else {
        this.updateState({
          status: 'error',
          latency: null,
          lastChecked: new Date(),
          errorMessage: error.message || 'Failed to connect to server',
          retryCount: this.state.retryCount + 1,
        });
      }
    } finally {
      this.isChecking = false;
    }

    return this.state;
  }

  startMonitoring() {
    // Initial check
    this.checkConnection();

    // Set up periodic checks
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkConnection();
      }, this.CHECK_INTERVAL_MS);
    }

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkConnection());
      window.addEventListener('offline', () => {
        this.updateState({
          status: 'offline',
          errorMessage: 'No internet connection',
        });
      });
    }
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state.status === 'connected' || this.state.status === 'slow';
  }

  isOffline(): boolean {
    return this.state.status === 'offline';
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor();
