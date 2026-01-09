import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { CookieService } from '../services/cookie.service';

/**
 * Refresh Token Guard
 * Validates that a refresh token is present in the request
 * Does NOT validate the token itself - that's done in the service
 * 
 * Token sources (in order of priority):
 * 1. httpOnly cookie (smartduka_refresh) - primary method for web
 * 2. Request body (refreshToken field) - for mobile/API clients
 * 3. Authorization header (Bearer token) - fallback for API clients
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(private readonly cookieService: CookieService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Try to get refresh token from cookie first (primary method for web)
    let refreshToken = this.cookieService.getRefreshToken(request);
    let tokenSource = 'cookie';
    
    // Fallback to request body (for mobile/API clients)
    if (!refreshToken && request.body?.refreshToken) {
      refreshToken = request.body.refreshToken;
      tokenSource = 'body';
    }
    
    // Fallback to Authorization header (for API clients)
    if (!refreshToken) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
        tokenSource = 'header';
      }
    }

    if (!refreshToken) {
      // Log details for debugging (without sensitive data)
      const hasCookies = !!request.cookies && Object.keys(request.cookies).length > 0;
      const hasBody = !!request.body && Object.keys(request.body).length > 0;
      const origin = request.headers.origin || 'unknown';
      
      this.logger.warn(
        `No refresh token provided - cookies: ${hasCookies}, body: ${hasBody}, origin: ${origin}`
      );
      
      throw new UnauthorizedException('No refresh token provided');
    }

    // Attach refresh token and source to request for use in controller
    request.refreshToken = refreshToken;
    request.refreshTokenSource = tokenSource;
    
    this.logger.debug(`Refresh token found via ${tokenSource}`);
    return true;
  }
}
