'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface ActivityStats {
  totalActiveShops: number;
  totalActiveUsers: number;
  totalLoginsToday: number;
  totalLoginsThisWeek: number;
  topActiveShops: ShopActivity[];
  recentLogins: LoginEntry[];
  loginMethodStats: {
    password: number;
    google: number;
    pin: number;
  };
}

interface ShopActivity {
  shopId: string;
  shopName: string;
  email: string;
  status: 'active' | 'idle' | 'offline';
  lastLogin: string;
  activeUsers: number;
  totalUsers: number;
  recentLogins: number;
}

interface LoginEntry {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  email: string;
  name: string;
  role: string;
  shopName: string;
  loginMethod: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ActiveSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  shopId: string;
  shopName: string;
  sessionId: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

interface ActivityData {
  stats: ActivityStats | null;
  shopActivities: ShopActivity[];
  activeSessions: ActiveSession[];
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useSuperAdminActivity() {
  const [data, setData] = useState<ActivityData>({
    stats: null,
    shopActivities: [],
    activeSessions: [],
    isConnected: false,
    lastUpdate: null,
  });
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('smartduka_access');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const newSocket = io(`${wsUrl}/super-admin-activity`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      newSocket.on('connect', () => {
        console.log('Connected to activity monitoring WebSocket');
        setData(prev => ({ ...prev, isConnected: true, lastUpdate: new Date() }));
        setError(null);
        reconnectAttempts.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from activity monitoring WebSocket:', reason);
        setData(prev => ({ ...prev, isConnected: false }));
        
        if (reason === 'io server disconnect') {
          // Server disconnected, don't reconnect automatically
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err);
        setError(err.message);
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to connect to activity monitoring. Please refresh the page.');
        }
      });

      newSocket.on('activity-update', (event) => {
        const { type, data: updateData, shopId } = event;
        
        setData(prev => {
          const newData = { ...prev, lastUpdate: new Date() };
          
          switch (type) {
            case 'initial':
            case 'refresh':
              return {
                ...newData,
                stats: updateData.stats,
                shopActivities: updateData.shopActivities,
                activeSessions: updateData.activeSessions,
              };
            
            case 'login-activity':
              // Update recent logins
              if (prev.stats) {
                return {
                  ...newData,
                  stats: {
                    ...prev.stats,
                    recentLogins: [updateData, ...prev.stats.recentLogins.slice(0, 19)],
                  },
                };
              }
              break;
            
            case 'shop-activity':
              // Update specific shop activity
              if (shopId) {
                const updatedShops = prev.shopActivities.map(shop =>
                  shop.shopId === shopId ? { ...shop, ...updateData } : shop
                );
                return { ...newData, shopActivities: updatedShops };
              }
              break;
            
            case 'session-update':
              // Update active sessions
              const { sessionId, action, ...sessionData } = updateData;
              let updatedSessions = [...prev.activeSessions];
              
              if (action === 'add') {
                updatedSessions.push(sessionData);
              } else if (action === 'remove') {
                updatedSessions = updatedSessions.filter(s => s.sessionId !== sessionId);
              } else if (action === 'update') {
                updatedSessions = updatedSessions.map(s =>
                  s.sessionId === sessionId ? { ...s, ...sessionData } : s
                );
              }
              
              return { ...newData, activeSessions: updatedSessions };
          }
          
          return newData;
        });
      });

      newSocket.on('shop-activity-update', (event) => {
        const { shopId, data: updateData } = event;
        setData(prev => {
          const updatedShops = prev.shopActivities.map(shop =>
            shop.shopId === shopId ? { ...shop, ...updateData.shopActivity } : shop
          );
          return { ...prev, shopActivities: updatedShops };
        });
      });

      newSocket.on('subscribed', (event) => {
        console.log('Subscribed to:', event);
      });

      newSocket.on('data-refreshed', (event) => {
        console.log('Data refreshed:', event);
      });

      newSocket.on('error', (event) => {
        console.error('WebSocket error:', event);
        setError(event.message || 'An error occurred');
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to initialize activity monitoring');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
  }, [socket]);

  const subscribeToActivity = useCallback((shopId?: string) => {
    if (socket && socket.connected) {
      socket.emit('subscribe-activity', { shopId });
    }
  }, [socket]);

  const refreshData = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('refresh-data');
    }
  }, [socket]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-reconnect if disconnected
  useEffect(() => {
    if (!data.isConnected && !error && reconnectAttempts.current < maxReconnectAttempts) {
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 5000);
    }
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [data.isConnected, error, connect]);

  return {
    ...data,
    error,
    socket,
    subscribeToActivity,
    refreshData,
    disconnect,
    reconnect: connect,
  };
}
