import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  role: 'admin' | 'cashier' | 'super_admin' | 'branch_admin' | 'branch_manager' | 'supervisor';
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
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET') ?? 'dev_secret',
    });
  }

  async validate(payload: JwtPayload) {
    return payload;
  }
}
