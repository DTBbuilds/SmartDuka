import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CookieService } from '../services/cookie.service';
import { TokenService } from '../token.service';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Enhanced JWT Auth Guard
 * Supports both:
 * 1. httpOnly cookies (preferred, more secure)
 * 2. Authorization header (for API clients, mobile apps)
 * 
 * Also validates session is still active in database
 */
@Injectable()
export class JwtCookieAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtCookieAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cookieService: CookieService,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Try to get token from cookie first, then header
    let token = this.cookieService.getAccessToken(request);
    
    if (!token) {
      // Fallback to Authorization header
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Validate session is still active (if sessionId exists)
      if (payload.sessionId) {
        const isActive = await this.tokenService.isSessionActive(payload.sessionId);
        if (!isActive) {
          this.logger.warn(`Session ${payload.sessionId} is no longer active`);
          throw new UnauthorizedException('Session has been terminated');
        }
        
        // Update session activity
        await this.tokenService.updateSessionActivity(payload.sessionId);
      }

      // Attach user to request
      request.user = payload;
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      
      this.logger.error('JWT validation error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Decorator to mark routes as public (no auth required)
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
