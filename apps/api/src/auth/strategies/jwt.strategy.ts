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
 * Extract JWT from cookie or Authorization header
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // First try httpOnly cookie
  if (req.cookies && req.cookies['smartduka_access']) {
    return req.cookies['smartduka_access'];
  }
  
  // Fallback to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
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
