import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'https://smartduka-eta.vercel.app',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const shopId = client.handshake.query.shopId as string;

    if (userId && shopId) {
      // Track user connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);

      // Join shop room for broadcasts
      client.join(`shop:${shopId}`);
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected (user: ${userId}, shop: ${shopId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId && this.userSockets.has(userId)) {
      const userSet = this.userSockets.get(userId);
      userSet?.delete(client.id);
      if (userSet?.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Order events
  @SubscribeMessage('order:created')
  handleOrderCreated(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('order:created', data);
    this.logger.log(`Order created event broadcast to shop ${shopId}`);
  }

  @SubscribeMessage('order:updated')
  handleOrderUpdated(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('order:updated', data);
    this.logger.log(`Order updated event broadcast to shop ${shopId}`);
  }

  // Inventory events
  @SubscribeMessage('inventory:updated')
  handleInventoryUpdated(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('inventory:updated', data);
    this.logger.log(`Inventory updated event broadcast to shop ${shopId}`);
  }

  @SubscribeMessage('stock:low')
  handleLowStock(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('stock:low', data);
    this.logger.log(`Low stock alert broadcast to shop ${shopId}`);
  }

  // Payment events
  @SubscribeMessage('payment:received')
  handlePaymentReceived(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('payment:received', data);
    this.logger.log(`Payment received event broadcast to shop ${shopId}`);
  }

  @SubscribeMessage('payment:failed')
  handlePaymentFailed(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('payment:failed', data);
    this.logger.log(`Payment failed event broadcast to shop ${shopId}`);
  }

  // Supplier events
  @SubscribeMessage('supplier:updated')
  handleSupplierUpdated(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('supplier:updated', data);
  }

  // Purchase order events
  @SubscribeMessage('purchase:created')
  handlePurchaseCreated(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('purchase:created', data);
  }

  @SubscribeMessage('purchase:received')
  handlePurchaseReceived(client: Socket, data: any) {
    const shopId = client.handshake.query.shopId as string;
    this.server.to(`shop:${shopId}`).emit('purchase:received', data);
  }

  // Broadcast methods for server-side events
  broadcastOrderCreated(shopId: string, order: any) {
    this.server.to(`shop:${shopId}`).emit('order:created', order);
  }

  broadcastOrderUpdated(shopId: string, order: any) {
    this.server.to(`shop:${shopId}`).emit('order:updated', order);
  }

  broadcastInventoryUpdated(shopId: string, product: any) {
    this.server.to(`shop:${shopId}`).emit('inventory:updated', product);
  }

  broadcastLowStock(shopId: string, product: any) {
    this.server.to(`shop:${shopId}`).emit('stock:low', product);
  }

  broadcastPaymentReceived(shopId: string, payment: any) {
    this.server.to(`shop:${shopId}`).emit('payment:received', payment);
  }

  broadcastPaymentFailed(shopId: string, payment: any) {
    this.server.to(`shop:${shopId}`).emit('payment:failed', payment);
  }

  broadcastSupplierUpdated(shopId: string, supplier: any) {
    this.server.to(`shop:${shopId}`).emit('supplier:updated', supplier);
  }

  broadcastPurchaseCreated(shopId: string, purchase: any) {
    this.server.to(`shop:${shopId}`).emit('purchase:created', purchase);
  }

  broadcastPurchaseReceived(shopId: string, purchase: any) {
    this.server.to(`shop:${shopId}`).emit('purchase:received', purchase);
  }

  // Get connected users count
  getConnectedUsersCount(shopId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`shop:${shopId}`);
    return room ? room.size : 0;
  }
}
