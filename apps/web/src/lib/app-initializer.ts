'use client';

import { config } from './config';

export type InitPhase = 
  | 'idle'
  | 'checking_connection'
  | 'waking_server'
  | 'server_ready'
  | 'checking_auth'
  | 'loading_data'
  | 'ready'
  | 'error';

export interface InitState {
  phase: InitPhase;
  progress: number; // 0-100
  message: string;
  subMessage?: string;
  error?: string;
  serverLatency?: number;
  retryCount: number;
  startTime: number;
  isServerCold: boolean;
}

type InitListener = (state: InitState) => void;

class AppInitializer {
  private state: InitState = {
    phase: 'idle',
    progress: 0,
    message: 'Starting SmartDuka...',
    retryCount: 0,
    startTime: Date.now(),
    isServerCold: false,
  };

  private listeners: Set<InitListener> = new Set();
  private progressInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  // Timing thresholds
  private readonly COLD_START_THRESHOLD = 5000; // 5 seconds indicates cold start
  private readonly MAX_WAIT_TIME = 60000; // 60 seconds max wait
  private readonly HEALTH_TIMEOUT = 15000; // 15 seconds for health check

  subscribe(listener: InitListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<InitState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Start the initialization process
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    this.updateState({
      phase: 'checking_connection',
      progress: 5,
      message: 'Checking connection...',
      startTime: Date.now(),
      retryCount: 0,
    });

    // Start progress animation
    this.startProgressAnimation();

    try {
      // Step 1: Check if we're online
      if (!navigator.onLine) {
        this.updateState({
          phase: 'error',
          progress: 0,
          message: 'No internet connection',
          subMessage: 'Please check your network and try again',
          error: 'offline',
        });
        this.stopProgressAnimation();
        return false;
      }

      this.updateState({
        progress: 10,
        message: 'Connecting to server...',
      });

      // Step 2: Check server health (this may take time if server is cold)
      const healthResult = await this.checkServerHealth();

      if (!healthResult.success) {
        this.updateState({
          phase: 'error',
          progress: 0,
          message: 'Unable to connect to server',
          subMessage: healthResult.error || 'Please try again later',
          error: healthResult.error,
        });
        this.stopProgressAnimation();
        return false;
      }

      this.updateState({
        phase: 'server_ready',
        progress: 50,
        message: 'Server connected',
        subMessage: healthResult.latency ? `Response time: ${healthResult.latency}ms` : undefined,
        serverLatency: healthResult.latency,
        isServerCold: healthResult.wasCold,
      });

      // Step 3: Check authentication
      this.updateState({
        phase: 'checking_auth',
        progress: 60,
        message: 'Verifying session...',
      });

      const hasAuth = this.checkLocalAuth();

      if (hasAuth) {
        this.updateState({
          progress: 80,
          message: 'Loading your workspace...',
        });

        // Brief delay for smooth UX
        await this.delay(300);
      }

      // Step 4: Ready
      this.updateState({
        phase: 'ready',
        progress: 100,
        message: 'Ready!',
        subMessage: undefined,
      });

      this.stopProgressAnimation();
      this.initialized = true;
      return true;

    } catch (error: any) {
      this.updateState({
        phase: 'error',
        progress: 0,
        message: 'Something went wrong',
        subMessage: error.message || 'Please refresh the page',
        error: error.message,
      });
      this.stopProgressAnimation();
      return false;
    }
  }

  /**
   * Check server health with cold start handling
   */
  private async checkServerHealth(): Promise<{ success: boolean; latency?: number; wasCold: boolean; error?: string }> {
    const startTime = Date.now();
    let wasCold = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_TIMEOUT);

      // Update message if taking long
      const slowCheckTimeout = setTimeout(() => {
        wasCold = true;
        this.updateState({
          phase: 'waking_server',
          progress: 20,
          message: 'Waking up the server...',
          subMessage: 'This may take up to 30 seconds on first load',
          isServerCold: true,
        });
      }, 3000);

      const response = await fetch(`${config.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      clearTimeout(slowCheckTimeout);

      const latency = Date.now() - startTime;
      wasCold = latency > this.COLD_START_THRESHOLD;

      if (response.ok) {
        return { success: true, latency, wasCold };
      } else {
        return { success: false, wasCold, error: `Server returned ${response.status}` };
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      wasCold = elapsed > this.COLD_START_THRESHOLD;

      if (error.name === 'AbortError') {
        // Timeout - try again with longer timeout for cold starts
        return this.retryHealthCheck(wasCold);
      }

      return { success: false, wasCold, error: error.message || 'Connection failed' };
    }
  }

  /**
   * Retry health check for cold starts
   */
  private async retryHealthCheck(wasCold: boolean): Promise<{ success: boolean; latency?: number; wasCold: boolean; error?: string }> {
    if (this.state.retryCount >= 3) {
      return { success: false, wasCold: true, error: 'Server is not responding. Please try again later.' };
    }

    this.updateState({
      retryCount: this.state.retryCount + 1,
      progress: 25 + (this.state.retryCount * 5),
      message: 'Server is waking up...',
      subMessage: `Attempt ${this.state.retryCount + 1} of 3 - Please wait`,
    });

    await this.delay(2000);

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for cold starts

      const response = await fetch(`${config.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (response.ok) {
        return { success: true, latency, wasCold: true };
      }

      return this.retryHealthCheck(true);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return this.retryHealthCheck(true);
      }
      return { success: false, wasCold: true, error: error.message };
    }
  }

  /**
   * Check if user has local auth token
   */
  private checkLocalAuth(): boolean {
    if (typeof window === 'undefined') return false;
    const token = window.localStorage.getItem('smartduka:token');
    return !!token;
  }

  /**
   * Animate progress smoothly
   */
  private startProgressAnimation() {
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - this.state.startTime;
      const phase = this.state.phase;

      // Don't animate if in error or ready state
      if (phase === 'error' || phase === 'ready') return;

      // Slow progress animation based on phase
      let targetProgress = this.state.progress;

      if (phase === 'checking_connection') {
        targetProgress = Math.min(15, 5 + (elapsed / 1000) * 2);
      } else if (phase === 'waking_server') {
        // Slower progress during cold start
        targetProgress = Math.min(45, 20 + (elapsed / 1000) * 0.5);
      } else if (phase === 'checking_auth') {
        targetProgress = Math.min(75, 60 + (elapsed / 500));
      } else if (phase === 'loading_data') {
        targetProgress = Math.min(95, 80 + (elapsed / 300));
      }

      if (targetProgress > this.state.progress) {
        this.updateState({ progress: Math.round(targetProgress) });
      }
    }, 100);
  }

  private stopProgressAnimation() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset and retry initialization
   */
  async retry(): Promise<boolean> {
    this.initialized = false;
    this.updateState({
      phase: 'idle',
      progress: 0,
      message: 'Retrying...',
      subMessage: undefined,
      error: undefined,
      retryCount: 0,
      startTime: Date.now(),
    });
    return this.initialize();
  }

  getState(): InitState {
    return this.state;
  }

  isReady(): boolean {
    return this.state.phase === 'ready';
  }
}

// Singleton instance
export const appInitializer = new AppInitializer();
