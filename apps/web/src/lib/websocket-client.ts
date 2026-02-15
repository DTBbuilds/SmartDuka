'use client';

import { io, Socket } from 'socket.io-client';
import { refreshEvents } from './refresh-events';

class WebSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    // Delay connection to ensure auth token is available
    if (typeof window !== 'undefined') {
      setTimeout(() => this.connect(), 500);
    }
  }

  private connect() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = this.getAuthToken();

    if (!token) {
      console.log('🔌 WebSocket: No auth token found, skipping connection');
      return;
    }

    try {
      this.socket = io(`${apiUrl}/events`, {
        auth: {
          token,
        },
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
        upgrade: true,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
        forceNew: true,
      });
    } catch (err) {
      console.warn('🔌 WebSocket: Failed to initialize:', err);
      return;
    }

    this.setupEventListeners();
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('smartduka:token') || sessionStorage.getItem('smartduka:token');
  }

  private getUserRole(): string | null {
    const token = this.getAuthToken();
    if (!token) return null;
    
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded?.role || null;
    } catch {
      return null;
    }
  }

  private getShopId(): string | null {
    const token = this.getAuthToken();
    if (!token) return null;
    
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded?.shopId || null;
    } catch {
      return null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket: Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.subscribeToEvents();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket: Disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      const errorMsg = error?.message || 'Connection failed';
      console.warn('🔌 WebSocket: Connection error:', errorMsg);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('🔌 WebSocket: Max reconnection attempts reached, will retry later');
        // Don't completely disconnect, just stop trying for now
      }
    });

    this.socket.on('error', (error) => {
      // Only log if there's actual error content
      if (error && Object.keys(error).length > 0) {
        console.warn('🔌 WebSocket: Error:', error?.message || error);
      }
    });

    this.socket.on('subscribed', (data) => {
      console.log('🔌 WebSocket: Subscribed to', data);
    });

    // Listen for payment verification events
    this.socket.on('payment:verified', (data) => {
      console.log('🔄 Payment verified event received:', data);
      
      // Emit refresh events to trigger UI updates
      refreshEvents.emit('payment:completed', {
        invoiceId: data.invoiceId,
        shopId: data.shopId,
      });
      
      if (data.subscriptionActivated) {
        refreshEvents.emit('subscription:updated', {
          shopId: data.shopId,
        });
      }
      
      refreshEvents.emit('invoice:paid', {
        invoiceId: data.invoiceId,
      });

      // Show success notification
      this.showNotification('Payment Verified', 'Your payment has been verified and subscription is now active!', 'success');
    });

    // Listen for subscription updates
    this.socket.on('subscription:updated', (data) => {
      console.log('🔄 Subscription updated event received:', data);
      
      refreshEvents.emit('subscription:updated', {
        shopId: data.shopId,
        subscriptionId: data.subscriptionId,
      });

      // Show success notification for activation
      if (data.status === 'subscription_activated') {
        this.showNotification('Subscription Activated', 'Your subscription is now active!', 'success');
      }
    });

    // Admin events (for super admin dashboard)
    this.socket.on('admin:payment_verified', (data) => {
      console.log('🔄 Admin payment verified event received:', data);
      
      // Trigger admin dashboard refresh
      refreshEvents.emit('shop:updated', {
        shopId: data.shopId,
      });
      
      // Show admin notification
      this.showNotification('Payment Verified', `Payment verified for shop ${data.shopId}`, 'info');
    });

    this.socket.on('admin:subscription_updated', (data) => {
      console.log('🔄 Admin subscription updated event received:', data);
      
      // Trigger admin dashboard refresh
      refreshEvents.emit('subscription:updated', {
        shopId: data.shopId,
      });
    });
  }

  private subscribeToEvents() {
    if (!this.socket || !this.isConnected) return;

    const role = this.getUserRole();
    const shopId = this.getShopId();

    if (role === 'super_admin') {
      // Super admin subscribes to admin events
      this.socket.emit('subscribe', {
        channel: 'admin',
        token: this.getAuthToken(),
      });
    } else if (shopId) {
      // Regular users subscribe to shop events
      this.socket.emit('subscribe', {
        channel: 'shop',
        shopId: shopId,
        token: this.getAuthToken(),
      });
    }
  }

  private showNotification(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') {
    // Try to use browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: 'smartduka-payment',
      });
    }

    // Also emit a local notification event that UI components can listen to
    refreshEvents.emit('notification:show', {
      title,
      message,
      type,
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public reconnect() {
    this.disconnect();
    const token = this.getAuthToken();
    if (token) {
      this.connect();
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

// Singleton instance
export const websocketClient = new WebSocketClient();

// Hook for React components
export function useWebSocket() {
  return {
    isConnected: websocketClient.isSocketConnected(),
    reconnect: () => websocketClient.reconnect(),
    requestNotificationPermission: () => websocketClient.requestNotificationPermission(),
  };
}
