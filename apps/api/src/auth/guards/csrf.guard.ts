import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CookieService } from '../services/cookie.service';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * CSRF Protection Guard
 * Validates that the CSRF token in the header matches the one in the cookie
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly cookieService: CookieService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if CSRF should be skipped for this route
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only check CSRF for state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Validate CSRF token
    if (!this.cookieService.validateCsrfToken(request)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

/**
 * Decorator to skip CSRF check for specific routes
 * Use for webhooks, public APIs, etc.
 */
import { SetMetadata } from '@nestjs/common';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
