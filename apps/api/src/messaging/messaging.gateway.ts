import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagingGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    this.logger.log('Messaging WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const userType = client.handshake.query.userType as string;
    const shopId = client.handshake.query.shopId as string;

    if (userId) {
      // Track user connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      // Join shop room if admin
      if (shopId) {
        client.join(`shop:${shopId}`);
      }

      // Join super admin room
      if (userType === 'super_admin') {
        client.join('super_admin');
      }

      this.logger.log(`Messaging client ${client.id} connected (user: ${userId}, type: ${userType})`);
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

    this.logger.log(`Messaging client ${client.id} disconnected`);
  }

  // Join a conversation room
  @SubscribeMessage('conversation:join')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} joined conversation ${data.conversationId}`);
    return { success: true };
  }

  // Leave a conversation room
  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} left conversation ${data.conversationId}`);
    return { success: true };
  }

  // Typing indicator
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; userName: string },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: data.userId,
      userName: data.userName,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: data.userId,
    });
  }

  // Broadcast a new message to conversation participants
  broadcastMessage(conversationId: string, message: any, sender: any) {
    this.server.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
      sender: {
        id: sender.userId,
        type: sender.role,
        name: sender.email?.split('@')[0] || 'User',
      },
    });

    // Also notify the shop if message is from super admin
    if (sender.role === 'super_admin' && message.shopId) {
      this.server.to(`shop:${message.shopId}`).emit('message:notification', {
        conversationId,
        preview: message.content?.substring(0, 100),
        from: 'SmartDuka Support',
      });
    }

    // Notify super admins if message is from shop admin
    if (sender.role === 'admin') {
      this.server.to('super_admin').emit('message:notification', {
        conversationId,
        preview: message.content?.substring(0, 100),
        from: sender.email?.split('@')[0] || 'Shop Admin',
        shopId: sender.shopId,
      });
    }
  }

  // Notify about new conversation
  notifyNewConversation(conversation: any) {
    this.server.to('super_admin').emit('conversation:new', {
      conversation,
    });
  }

  // Notify when messages are read
  notifyMessagesRead(conversationId: string, userId: string, userType: string) {
    this.server.to(`conversation:${conversationId}`).emit('messages:read', {
      conversationId,
      readBy: userId,
      readByType: userType,
      readAt: new Date(),
    });
  }

  // Send unread count update
  sendUnreadCountUpdate(userId: string, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('unread:update', { unreadCount });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }
}
