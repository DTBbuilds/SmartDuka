import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ActivityMonitorService } from '../services/activity-monitor.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/super-admin-activity',
})
export class ActivityGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ActivityGateway');
  private connectedSuperAdmins = new Map<string, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly activityMonitorService: ActivityMonitorService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // Verify JWT token from handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided for client ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      
      // Only allow super admins
      if (payload.role !== 'super_admin') {
        this.logger.warn(`Connection rejected: User ${payload.sub} is not a super admin`);
        client.disconnect();
        return;
      }

      // Store connected super admin
      this.connectedSuperAdmins.set(client.id, client);
      
      // Send initial activity data
      const stats = await this.activityMonitorService.getActivityStats();
      const shopActivities = await this.activityMonitorService.getAllShopActivities();
      const activeSessions = await this.activityMonitorService.getActiveSessions();

      client.emit('activity-update', {
        type: 'initial',
        data: {
          stats,
          shopActivities,
          activeSessions,
        },
      });

      this.logger.log(`Super admin connected: ${payload.sub} (${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedSuperAdmins.delete(client.id);
    this.logger.log(`Super admin disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-activity')
  async handleSubscribeActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shopId?: string },
  ) {
    try {
      // Send specific shop activity if requested
      if (data.shopId) {
        const shopActivity = await this.activityMonitorService.getShopActivity(data.shopId);
        const shopSessions = await this.activityMonitorService.getActiveSessionsForShop(data.shopId);
        
        client.emit('shop-activity-update', {
          shopId: data.shopId,
          data: {
            shopActivity,
            sessions: shopSessions,
          },
        });
      }

      client.emit('subscribed', { type: 'activity', shopId: data.shopId });
    } catch (error) {
      this.logger.error('Error handling subscribe-activity:', error);
      client.emit('error', { message: 'Failed to subscribe to activity updates' });
    }
  }

  @SubscribeMessage('refresh-data')
  async handleRefreshData(@ConnectedSocket() client: Socket) {
    try {
      await this.activityMonitorService.refreshActiveSessions();
      await this.activityMonitorService.refreshShopActivities();
      
      const stats = await this.activityMonitorService.getActivityStats();
      const shopActivities = await this.activityMonitorService.getAllShopActivities();
      const activeSessions = await this.activityMonitorService.getActiveSessions();

      // Broadcast to all connected super admins
      this.broadcastActivityUpdate({
        type: 'refresh',
        data: {
          stats,
          shopActivities,
          activeSessions,
        },
      });

      client.emit('data-refreshed', { timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error('Error refreshing data:', error);
      client.emit('error', { message: 'Failed to refresh data' });
    }
  }

  // Methods to be called by other services to broadcast updates
  async broadcastLoginActivity(loginData: any) {
    this.broadcastActivityUpdate({
      type: 'login-activity',
      data: loginData,
    });
  }

  async broadcastShopActivityUpdate(shopId: string, activityData: any) {
    this.broadcastActivityUpdate({
      type: 'shop-activity',
      shopId,
      data: activityData,
    });
  }

  async broadcastSessionUpdate(sessionData: any) {
    this.broadcastActivityUpdate({
      type: 'session-update',
      data: sessionData,
    });
  }

  private broadcastActivityUpdate(event: any) {
    // Send to all connected super admins
    this.connectedSuperAdmins.forEach((client) => {
      client.emit('activity-update', event);
    });
  }

  // Get connected super admins count
  getConnectedAdminsCount(): number {
    return this.connectedSuperAdmins.size;
  }
}
