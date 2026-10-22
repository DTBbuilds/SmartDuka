import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TokenService } from '../token.service';

export type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  role:
    | 'admin'
    | 'cashier'
    | 'super_admin'
    | 'branch_admin'
    | 'branch_manager'
    | 'supervisor';
  shopId: string;
  sessionId?: string;
  jti?: string;
};

/**
 * Extract JWT from Authorization header or cookie
 * IMPORTANT: Authorization header takes priority over cookies to support
 * re-login scenarios where a new token is issued but old httpOnly cookies persist
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // FIRST try Authorization header - this is the primary method
  // This ensures that when a user logs in with a new account,
  // the new token takes precedence over stale httpOnly cookies
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to httpOnly cookie (for requests without explicit header)
  if (req.cookies && req.cookies['smartduka_access']) {
    return req.cookies['smartduka_access'];
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    // P1-13C: session-revocation enforcement, FAIL-CLOSED. After a
    // password reset (or any session termination), previously issued
    // access tokens must stop working immediately — not merely at their
    // 15-minute expiry. The dependency is MANDATORY (same module) and a
    // session-bound token is REJECTED if session validation cannot
    // execute — a token is never accepted merely because a dependency
    // is unavailable. Tokens without a sessionId (legacy flows) skip
    // the check per the documented compatibility policy.
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET') ?? 'dev_secret',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.sessionId) {
      if (!this.tokenService) {
        // Fail closed: never accept a session-bound token when session
        // validation cannot execute.
        throw new UnauthorizedException('Session validation unavailable');
      }
      let isActive: boolean;
      try {
        isActive = await this.tokenService.isSessionActive(payload.sessionId);
      } catch {
        // Fail closed on lookup errors too (DB outage must not open the gate).
        throw new UnauthorizedException('Session validation unavailable');
      }
      if (!isActive) {
        throw new UnauthorizedException('Session has been terminated');
      }
    }
    return payload;
  }
}
