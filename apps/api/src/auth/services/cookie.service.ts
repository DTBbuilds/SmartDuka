import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';

/**
 * Secure Cookie Service
 * Handles httpOnly cookie management for tokens
 */
@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;

  // Cookie names
  static readonly ACCESS_TOKEN_COOKIE = 'smartduka_access';
  static readonly REFRESH_TOKEN_COOKIE = 'smartduka_refresh';
  static readonly CSRF_TOKEN_COOKIE = 'smartduka_csrf';

  // Cookie expiry times
  private readonly ACCESS_TOKEN_MAX_AGE = 30 * 60 * 1000; // 30 minutes
  private readonly REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
    this.cookieDomain = this.isProduction 
      ? configService.get('COOKIE_DOMAIN') 
      : undefined;
  }

  /**
   * Set access token as httpOnly cookie
   */
  setAccessTokenCookie(res: Response, token: string): void {
    res.cookie(CookieService.ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: this.ACCESS_TOKEN_MAX_AGE,
      path: '/',
      domain: this.cookieDomain,
    });
  }

  /**
   * Set refresh token as httpOnly cookie
   * More restrictive path - only accessible by refresh endpoint
   */
  setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(CookieService.REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict', // Stricter for refresh token
      maxAge: this.REFRESH_TOKEN_MAX_AGE,
      path: '/api/v1/auth', // Only accessible by auth endpoints
      domain: this.cookieDomain,
    });
  }

  /**
   * Set CSRF token cookie (readable by JavaScript for inclusion in headers)
   */
  setCsrfTokenCookie(res: Response, token: string): void {
    res.cookie(CookieService.CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: this.ACCESS_TOKEN_MAX_AGE,
      path: '/',
      domain: this.cookieDomain,
    });
  }

  /**
   * Set all auth cookies at once
   */
  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    csrfToken: string,
  ): void {
    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);
    this.setCsrfTokenCookie(res, csrfToken);
  }

  /**
   * Clear all auth cookies
   */
  clearAuthCookies(res: Response): void {
    const clearOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax' as const,
      path: '/',
      domain: this.cookieDomain,
    };

    res.clearCookie(CookieService.ACCESS_TOKEN_COOKIE, clearOptions);
    res.clearCookie(CookieService.REFRESH_TOKEN_COOKIE, {
      ...clearOptions,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
    res.clearCookie(CookieService.CSRF_TOKEN_COOKIE, {
      ...clearOptions,
      httpOnly: false,
    });
  }

  /**
   * Get access token from cookie
   */
  getAccessToken(req: Request): string | undefined {
    return req.cookies?.[CookieService.ACCESS_TOKEN_COOKIE];
  }

  /**
   * Get refresh token from cookie
   */
  getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[CookieService.REFRESH_TOKEN_COOKIE];
  }

  /**
   * Get CSRF token from cookie
   */
  getCsrfToken(req: Request): string | undefined {
    return req.cookies?.[CookieService.CSRF_TOKEN_COOKIE];
  }

  /**
   * Validate CSRF token from header matches cookie
   */
  validateCsrfToken(req: Request): boolean {
    const cookieToken = this.getCsrfToken(req);
    const headerToken = req.headers['x-csrf-token'] as string;
    
    if (!cookieToken || !headerToken) {
      return false;
    }
    
    return cookieToken === headerToken;
  }
}
