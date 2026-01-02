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
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(private readonly cookieService: CookieService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Try to get refresh token from cookie first
    let refreshToken = this.cookieService.getRefreshToken(request);
    
    // Fallback to request body (for mobile/API clients)
    if (!refreshToken && request.body?.refreshToken) {
      refreshToken = request.body.refreshToken;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    // Attach refresh token to request for use in controller
    request.refreshToken = refreshToken;
    return true;
  }
}
