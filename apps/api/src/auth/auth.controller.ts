import { Controller, Post, Body, Get, UseGuards, Req, Res, Query, Delete, Param } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtCookieAuthGuard, Public } from './guards/jwt-cookie-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PinRateLimitGuard } from './guards/pin-rate-limit.guard';
import { SkipCsrf } from './guards/csrf.guard';
import { SkipSubscriptionCheck } from './guards/subscription-status.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { CookieService } from './services/cookie.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
@SkipSubscriptionCheck() // All auth routes should bypass subscription check
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('register-shop')
  @SkipCsrf()
  async registerShop(@Body() dto: RegisterShopDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerShopWithTokens(dto);
    
    // Set secure httpOnly cookies
    if (result.tokens) {
      this.cookieService.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.csrfToken,
      );
    }
    
    // Return response without sensitive tokens in body (cookies handle it)
    return {
      shop: result.shop,
      user: result.user,
      // Include tokens for mobile/API clients that can't use cookies
      // Also include refreshToken for cross-origin localStorage fallback
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken, // For localStorage fallback
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  @Post('login')
  @SkipCsrf()
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const result = await this.authService.loginWithTokens(dto, ipAddress, userAgent);
    
    // Set secure httpOnly cookies
    if (result.tokens) {
      this.cookieService.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.csrfToken,
      );
    }
    
    return {
      user: result.user,
      shop: result.shop,
      // Include refreshToken for cross-origin localStorage fallback
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken, // For localStorage fallback
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  @UseGuards(PinRateLimitGuard)
  @Post('login-pin')
  @SkipCsrf()
  async loginWithPin(
    @Body() body: { pin: string; shopId: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const result = await this.authService.loginWithPinAndTokens(body.pin, body.shopId, ipAddress, userAgent);
    
    if (result.tokens) {
      this.cookieService.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.csrfToken,
      );
    }
    
    return {
      user: result.user,
      shop: result.shop,
      // Include refreshToken for cross-origin localStorage fallback
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken, // For localStorage fallback
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-pin')
  async setPin(
    @Body() body: { pin: string },
    @CurrentUser() user: any,
  ) {
    await this.authService.setPin(user.sub, body.pin);
    return { message: 'PIN set successfully' };
  }

  /**
   * Refresh token endpoint
   * Uses refresh token (from cookie or body) to issue new token pair
   * Does NOT require valid access token - that's the whole point!
   */
  @UseGuards(RefreshTokenGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refreshes per minute max
  @Post('refresh')
  @SkipCsrf() // Refresh doesn't need CSRF - it uses refresh token
  async refreshToken(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { deviceId?: string; deviceFingerprint?: string; refreshToken?: string },
  ) {
    const refreshToken = req.refreshToken || body.refreshToken;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await this.authService.refreshTokenWithRotation(
      refreshToken,
      {
        deviceId: body.deviceId,
        deviceFingerprint: body.deviceFingerprint,
        ipAddress,
      },
    );
    
    if (result.tokens) {
      this.cookieService.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.csrfToken,
      );
    }
    
    return {
      user: result.user,
      shop: result.shop,
      // Include refreshToken for cross-origin localStorage fallback
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken, // For localStorage fallback
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any, @Req() req: any) {
    // Extract the access token from cookie or header to return to frontend
    // This allows the frontend to store it in localStorage for client-side use
    let accessToken: string | null = null;
    
    if (req.cookies && req.cookies['smartduka_access']) {
      accessToken = req.cookies['smartduka_access'];
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      accessToken = req.headers.authorization.substring(7);
    }
    
    // Get CSRF token from cookie
    const csrfToken = req.cookies?.['smartduka_csrf'] || null;
    
    return {
      ...user,
      // Include tokens for frontend storage (needed after OAuth callback)
      accessToken,
      csrfToken,
    };
  }

  // Google OAuth endpoints
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Res() res: Response) {
    // Check if Google OAuth is configured
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'not-configured') {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google login is not configured')}`);
      return;
    }
    // The guard handles the redirect to Google
  }

  /**
   * Google OAuth for cashiers - redirects to Google with cashier state
   * This allows the callback to know this is a cashier signup flow
   */
  @Get('google/cashier')
  async googleAuthCashier(@Res() res: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'not-configured') {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google login is not configured')}`);
      return;
    }
    
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const isDev = process.env.NODE_ENV !== 'production';
    const defaultCallbackUrl = isDev 
      ? 'http://localhost:5000/api/v1/auth/google/callback'
      : 'https://smarduka.onrender.com/api/v1/auth/google/callback';
    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL') || defaultCallbackUrl;
    
    // Build Google OAuth URL with state parameter
    const state = encodeURIComponent(JSON.stringify({ role: 'cashier' }));
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    
    res.redirect(googleAuthUrl.toString());
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response, @Query('state') state?: string) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    // Parse state to check if this is a cashier signup flow
    let isCashierSignup = false;
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        isCashierSignup = stateData.role === 'cashier';
      } catch {
        // Invalid state, ignore
      }
    }
    
    try {
      const result = await this.authService.googleLoginWithTokens(req.user, ipAddress, userAgent);
      
      if (result.isNewUser) {
        // New user - check if they want to sign up as cashier or register a shop
        const profileData = encodeURIComponent(JSON.stringify(result.googleProfile));
        
        if (isCashierSignup) {
          // Cashier signup - redirect to PIN verification page
          res.redirect(`${frontendUrl}/auth/cashier-google-signup?google=${profileData}`);
        } else {
          // Shop registration - redirect to shop registration page
          res.redirect(`${frontendUrl}/register-shop?google=${profileData}`);
        }
      } else {
        // Existing user - pass tokens via URL for cross-origin support
        // This is necessary because frontend (Vercel) and backend (Render) are on different domains
        // Cookies won't work cross-origin without SameSite=None which has browser compatibility issues
        // The token is short-lived (30min) and immediately stored client-side, then cleared from URL
        // Include refresh token for localStorage fallback in cross-origin scenarios
        if (result.tokens) {
          const tokenParam = `token=${encodeURIComponent(result.tokens.accessToken)}&csrf=${encodeURIComponent(result.tokens.csrfToken)}&refresh=${encodeURIComponent(result.tokens.refreshToken)}`;
          res.redirect(`${frontendUrl}/auth/callback?success=true&${tokenParam}`);
        } else {
          res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Failed to generate authentication tokens')}`);
        }
      }
    } catch (error: any) {
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Google login failed')}`);
    }
  }

  @Post('register-shop-google')
  async registerShopWithGoogle(
    @Body() body: {
      googleProfile: { googleId: string; email: string; name: string; avatarUrl?: string; phone?: string };
      shop: { shopName: string; businessType: string; county: string; city: string; address?: string; kraPin?: string; description?: string; phone?: string };
    },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.registerShopWithGoogle(body.googleProfile, body.shop, ipAddress, userAgent);
  }

  /**
   * Link Google account to existing cashier using PIN verification
   * POST /auth/link-google-cashier
   * 
   * Flow:
   * 1. Cashier clicks "Sign up with Google" on login page
   * 2. Google OAuth returns profile to frontend
   * 3. Frontend shows PIN entry form
   * 4. Cashier enters their admin-provided PIN
   * 5. Backend validates PIN, links Google account to cashier
   * 6. Cashier can now login with Google (no PIN needed)
   */
  @UseGuards(PinRateLimitGuard)
  @Post('link-google-cashier')
  @SkipCsrf()
  async linkGoogleToCashier(
    @Body() body: {
      googleProfile: { googleId: string; email: string; name: string; avatarUrl?: string };
      pin: string;
      shopId: string;
    },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const result = await this.authService.linkGoogleToCashier(
      body.googleProfile,
      body.pin,
      body.shopId,
      ipAddress,
      userAgent,
    );
    
    if (result.tokens) {
      this.cookieService.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.csrfToken,
      );
    }
    
    return {
      user: result.user,
      shop: result.shop,
      // Include refreshToken for cross-origin localStorage fallback
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken, // For localStorage fallback
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  // ==================== Password Reset ====================

  /**
   * Request password reset - sends email with reset link
   */
  @Post('forgot-password')
  async forgotPassword(
    @Body() body: { email: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.requestPasswordReset(body.email, ipAddress, userAgent);
  }

  /**
   * Reset password using token
   */
  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ==================== Session Management ====================

  /**
   * Get all active sessions for current user
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.tokenService.getUserSessions(user.sub);
    return {
      sessions: sessions.map(s => ({
        id: s.sessionId,
        deviceId: s.deviceId,
        deviceName: s.deviceName,
        browser: s.browser,
        os: s.os,
        location: s.location,
        clientType: s.clientType,
        lastActivityAt: s.lastActivityAt,
        createdAt: (s as any).createdAt,
        isCurrent: s.accessTokenJti === user.jti,
      })),
    };
  }

  /**
   * Terminate a specific session
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    await this.tokenService.terminateSession(sessionId, 'User requested termination');
    return { message: 'Session terminated successfully' };
  }

  /**
   * Logout from all devices (revoke all tokens)
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: any) {
    const count = await this.tokenService.revokeAllUserTokens(user.sub, 'User logged out from all devices');
    return { 
      message: 'Logged out from all devices',
      sessionsTerminated: count,
    };
  }

  /**
   * Logout current session
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    if (user.sessionId) {
      await this.tokenService.terminateSession(user.sessionId, 'User logout');
    }
    
    // Clear all auth cookies
    this.cookieService.clearAuthCookies(res);
    
    return { message: 'Logged out successfully' };
  }

  /**
   * Clear session cookies (public endpoint - no auth required)
   * Used by frontend before storing new tokens to clear stale httpOnly cookies
   * that cannot be cleared by JavaScript
   */
  @Post('clear-cookies')
  @SkipCsrf()
  async clearCookies(@Res({ passthrough: true }) res: Response) {
    this.cookieService.clearAuthCookies(res);
    return { message: 'Cookies cleared' };
  }

  /**
   * Logout from all devices and clear cookies
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAllDevices(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const count = await this.tokenService.revokeAllUserTokens(user.sub, 'User logged out from all devices');
    
    // Clear all auth cookies
    this.cookieService.clearAuthCookies(res);
    
    return { 
      message: 'Logged out from all devices',
      sessionsTerminated: count,
    };
  }

  /**
   * Get new CSRF token (for SPA that needs to refresh CSRF)
   */
  @UseGuards(JwtAuthGuard)
  @Get('csrf-token')
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = require('crypto').randomBytes(32).toString('hex');
    this.cookieService.setCsrfTokenCookie(res, csrfToken);
    return { csrfToken };
  }
}
