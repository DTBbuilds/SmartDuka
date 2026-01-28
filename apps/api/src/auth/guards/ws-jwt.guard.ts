import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      
      // Get token from handshake auth or query params
      const token = 
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verify and decode the JWT token
      const payload = this.jwtService.verify(token);
      
      // Attach user info to the socket for use in handlers
      (client as any).user = payload;
      
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed: ${error.message}`);
      return false;
    }
  }
}
