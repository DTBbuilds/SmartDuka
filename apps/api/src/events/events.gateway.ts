import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface SubscriptionEvent {
  shopId: string;
  invoiceId?: string;
  subscriptionId?: string;
  status: 'payment_verified' | 'subscription_activated' | 'payment_failed';
  data?: any;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  shopId?: string;
  iat?: number;
  exp?: number;
}

/**
 * WebSocket Gateway for real-time subscription and payment updates
 * 
 * Channels:
 * - shop:{shopId} - For shop-specific events (user subscription page)
 * - admin - For super admin dashboard events
 */
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://smartduka.vercel.app',
      'https://www.smartduka.org',
      'https://smartduka.org',
      'https://www.smartduka.org',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  namespace: '/events',
  transports: ['polling', 'websocket'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients: Map<string, { socket: Socket; userId: string; shopId?: string; role: string }> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Client subscribes to their shop's events or admin events
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shopId?: string; channel: 'shop' | 'admin'; token?: string }
  ) {
    // Simple JWT verification for WebSocket
    let user: JwtPayload | null = null;
    const token = data.token || client.handshake.auth?.token || client.handshake.query?.token;
    
    if (token) {
      try {
        user = this.jwtService.verify(token) as JwtPayload;
      } catch (error) {
        client.emit('error', { message: 'Invalid token' });
        return;
      }
    }
    
    if (!user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    // Store client info
    this.connectedClients.set(client.id, {
      socket: client,
      userId: user.sub,
      shopId: user.shopId,
      role: user.role,
    });

    if (data.channel === 'shop' && user.shopId) {
      // Subscribe to shop-specific events
      const room = `shop:${user.shopId}`;
      client.join(room);
      this.logger.log(`User ${user.email} subscribed to ${room}`);
      client.emit('subscribed', { channel: data.channel, room });
    } else if (data.channel === 'admin' && user.role === 'super_admin') {
      // Subscribe to admin events
      client.join('admin');
      this.logger.log(`Super admin ${user.email} subscribed to admin events`);
      client.emit('subscribed', { channel: data.channel, room: 'admin' });
    } else {
      client.emit('error', { message: 'Invalid subscription request' });
    }
  }

  /**
   * Broadcast payment verification event
   */
  emitPaymentVerified(event: SubscriptionEvent) {
    this.logger.log(`📡 Broadcasting payment verified for shop ${event.shopId}`);
    
    // Emit to shop-specific room (for user who paid)
    this.server.to(`shop:${event.shopId}`).emit('payment:verified', {
      type: 'payment_verified',
      shopId: event.shopId,
      invoiceId: event.invoiceId,
      status: event.status,
      timestamp: new Date().toISOString(),
      ...event.data,
    });

    // Emit to admin room (for super admin dashboard)
    this.server.to('admin').emit('admin:payment_verified', {
      type: 'admin_payment_verified',
      shopId: event.shopId,
      invoiceId: event.invoiceId,
      status: event.status,
      timestamp: new Date().toISOString(),
      ...event.data,
    });
  }

  /**
   * Broadcast subscription status change
   */
  emitSubscriptionUpdated(event: SubscriptionEvent) {
    this.logger.log(`📡 Broadcasting subscription updated for shop ${event.shopId}`);
    
    // Emit to shop-specific room
    this.server.to(`shop:${event.shopId}`).emit('subscription:updated', {
      type: 'subscription_updated',
      shopId: event.shopId,
      subscriptionId: event.subscriptionId,
      status: event.status,
      timestamp: new Date().toISOString(),
      ...event.data,
    });

    // Emit to admin room
    this.server.to('admin').emit('admin:subscription_updated', {
      type: 'admin_subscription_updated',
      shopId: event.shopId,
      subscriptionId: event.subscriptionId,
      status: event.status,
      timestamp: new Date().toISOString(),
      ...event.data,
    });
  }

  /**
   * Get connected clients count for monitoring
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get clients in specific room
   */
  getClientsInRoom(room: string): number {
    return this.server.sockets.adapter.rooms.get(room)?.size || 0;
  }
}
