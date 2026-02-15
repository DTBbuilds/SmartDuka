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
 * IMPORTANT: Token sources (in order of priority):
 * 1. Request body (refreshToken field) - PRIMARY to support re-login with different account
 * 2. Authorization header (Bearer token) - for API clients
 * 3. httpOnly cookie (smartduka_refresh) - fallback only
 * 
 * Body/header takes priority because httpOnly cookies cannot be cleared by JavaScript.
 * When a user logs in with a new account, the frontend sends the new refresh token
 * in the body/header, but the stale cookie from the previous session persists.
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(private readonly cookieService: CookieService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    let refreshToken: string | null = null;
    let tokenSource = 'none';
    
    // FIRST: Try request body (primary method to support re-login scenarios)
    // This ensures new login tokens take precedence over stale httpOnly cookies
    if (request.body?.refreshToken) {
      refreshToken = request.body.refreshToken;
      tokenSource = 'body';
    }
    
    // SECOND: Try Authorization header (for API clients)
    if (!refreshToken) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
        tokenSource = 'header';
      }
    }
    
    // LAST: Fallback to httpOnly cookie (only if body/header not provided)
    if (!refreshToken) {
      const cookieToken = this.cookieService.getRefreshToken(request);
      if (cookieToken) {
        refreshToken = cookieToken;
        tokenSource = 'cookie';
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
