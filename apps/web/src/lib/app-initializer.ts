'use client';

import { config } from './config';

export type InitPhase =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'ready'
  | 'error';

export interface InitState {
  phase: InitPhase;
  progress: number; // 0-100
  error?: string;
}

type InitListener = (state: InitState) => void;

class AppInitializer {
  private state: InitState = {
    phase: 'idle',
    progress: 0,
  };

  private listeners: Set<InitListener> = new Set();
  private initialized = false;
  private animFrame: number | null = null;
  private targetProgress = 0;

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

  private startSmoothProgress() {
    const animate = () => {
      if (this.state.progress < this.targetProgress) {
        const diff = this.targetProgress - this.state.progress;
        const step = Math.max(0.3, diff * 0.08);
        this.updateState({ progress: Math.min(this.targetProgress, this.state.progress + step) });
      }
      this.animFrame = requestAnimationFrame(animate);
    };
    this.animFrame = requestAnimationFrame(animate);
  }

  private stopSmoothProgress() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    this.updateState({ phase: 'connecting', progress: 0 });
    this.targetProgress = 30;
    this.startSmoothProgress();

    try {
      // Check connectivity
      if (!navigator.onLine) {
        this.stopSmoothProgress();
        this.updateState({ phase: 'error', progress: 0, error: 'No internet connection' });
        return false;
      }

      // Health check with 12s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(`${config.apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          this.stopSmoothProgress();
          this.updateState({ phase: 'error', progress: 0, error: 'Server unavailable' });
          return false;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        this.stopSmoothProgress();
        this.updateState({
          phase: 'error',
          progress: 0,
          error: err.name === 'AbortError' ? 'Connection timed out' : 'Unable to reach server',
        });
        return false;
      }

      // Auth check
      this.targetProgress = 70;
      this.updateState({ phase: 'authenticating' });

      const hasAuth = typeof window !== 'undefined' && !!window.localStorage.getItem('smartduka:token');
      if (hasAuth) {
        this.targetProgress = 90;
        await new Promise(r => setTimeout(r, 200));
      }

      // Done
      this.targetProgress = 100;
      this.updateState({ phase: 'ready', progress: 100 });
      this.stopSmoothProgress();
      this.initialized = true;
      return true;

    } catch (error: any) {
      this.stopSmoothProgress();
      this.updateState({ phase: 'error', progress: 0, error: error.message || 'Something went wrong' });
      return false;
    }
  }

  async retry(): Promise<boolean> {
    this.initialized = false;
    this.updateState({ phase: 'idle', progress: 0, error: undefined });
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
