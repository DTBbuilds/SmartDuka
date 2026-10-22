import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OtpService } from './services/otp.service';
import {
  RegisterShopDto,
  RegisterShopGoogleDto,
} from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtCookieAuthGuard, Public } from './guards/jwt-cookie-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { OAuthExchangeService } from './services/oauth-exchange.service';
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
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
    private readonly oauthExchangeService: OAuthExchangeService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('register-shop')
  @SkipCsrf()
  async registerShop(
    @Body() dto: RegisterShopDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const result: any = await this.authService.loginWithTokens(
      dto,
      ipAddress,
      userAgent,
    );

    // If email verification is required, return OTP requirement (no tokens)
    if (result.requiresEmailVerification) {
      return {
        requiresEmailVerification: true,
        email: result.email,
        userName: result.userName,
        shopName: result.shopName,
        user: null,
        shop: null,
        tokens: null,
      };
    }

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
    const result = await this.authService.loginWithPinAndTokens(
      body.pin,
      body.shopId,
      ipAddress,
      userAgent,
    );

    // If email verification is required, return OTP requirement (no tokens)
    if (result.requiresEmailVerification) {
      return {
        requiresEmailVerification: true,
        email: result.email,
        userName: result.userName,
        shopName: result.shopName,
        user: null,
        shop: null,
        tokens: null,
      };
    }

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
  async setPin(@Body() body: { pin: string }, @CurrentUser() user: any) {
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
    @Body()
    body: {
      deviceId?: string;
      deviceFingerprint?: string;
      refreshToken?: string;
    },
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

  // Google OAuth status - allows frontend to check if Google login is available
  @Get('google/status')
  @SkipCsrf()
  async googleAuthStatus() {
    return {
      configured: GoogleStrategy.isConfigured(),
      message: GoogleStrategy.isConfigured()
        ? 'Google OAuth is configured and ready'
        : 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
    };
  }

  // Google OAuth endpoints
  /**
   * RELEASE-INTEGRATION1: the admin Google flow now uses
   * transaction-bound state validation. The app has NO express-session,
   * so passport-oauth2 silently skipped its state generation AND
   * validation — the admin flow previously accepted ANY (or a missing)
   * state. The manual URL build + server-stored random state closes
   * that CSRF gap; the callback validates the state from the store
   * before processing.
   */
  @Get('google')
  async googleAuth(@Res() res: Response) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.smartduka.org';
    if (!GoogleStrategy.isConfigured()) {
      res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Google login is not configured yet. Please set up Google OAuth credentials or contact your administrator.')}`,
      );
      return;
    }
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const isDev = process.env.NODE_ENV !== 'production';
    const defaultCallbackUrl = isDev
      ? 'http://localhost:5000/api/v1/auth/google/callback'
      : 'https://smartduka-91q6.onrender.com/api/v1/auth/google/callback';
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      defaultCallbackUrl;
    const state = await this.oauthExchangeService.issueState('admin_login');
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

  /**
   * Google OAuth for cashiers - redirects to Google with cashier state
   * This allows the callback to know this is a cashier signup flow
   */
  @Get('google/cashier')
  async googleAuthCashier(@Res() res: Response) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.smartduka.org';

    // CRITICAL: Check if Google OAuth is configured before redirecting to Google
    if (!GoogleStrategy.isConfigured()) {
      res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Google login is not configured yet. Please set up Google OAuth credentials or contact your administrator.')}`,
      );
      return;
    }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';

    const isDev = process.env.NODE_ENV !== 'production';
    const defaultCallbackUrl = isDev
      ? 'http://localhost:5000/api/v1/auth/google/callback'
      : 'https://smartduka-91q6.onrender.com/api/v1/auth/google/callback';
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      defaultCallbackUrl;

    // OAUTH-SEC2: transaction-bound state — a cryptographically random
    // value stored server-side with the flow purpose (replaces the
    // predictable {"role":"cashier"} state). The callback classifies the
    // flow from the STORED purpose, never from client metadata.
    const state = await this.oauthExchangeService.issueState('cashier_login');
    const googleAuthUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    res.redirect(googleAuthUrl.toString());
  }

  /**
   * OAUTH-SEC1: exchange a one-time OAuth ticket for its payload
   * (token pair or Google profile). Atomic single-use; ~90s expiry.
   */
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('oauth/exchange')
  async oauthExchange(@Body() body: { ticket?: string }, @Req() req: any) {
    const browserNonce = req.cookies?.['oauth_bind'];
    const payload = await this.oauthExchangeService.redeemTicket(
      body?.ticket,
      undefined,
      browserNonce,
    );
    return payload;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.smartduka.org';

    // OAUTH-SEC1: the redirect URL must not be cached or leaked via
    // referrers (it carries the one-time ticket).
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // RELEASE-INTEGRATION1: the state was already validated (fail-closed)
    // by GoogleAuthGuard BEFORE the code exchange; the purpose arrives
    // from the server store via the request — never from client metadata.
    const isCashierSignup = req.oauthStatePurpose === 'cashier_login';

    try {
      const result = await this.authService.googleLoginWithTokens(
        req.user,
        ipAddress,
        userAgent,
      );

      if (result.isNewUser) {
        // SECURITY: For cashier signup, they MUST have a PIN from their admin
        // Redirect to PIN verification page where they must prove they're a registered cashier
        if (isCashierSignup) {
          // OAUTH-SEC1: profile handoff via one-time ticket (no profile
          // JSON in the URL).
          const { ticket: cashierTicket, bindNonce: cashierNonce } =
            await this.oauthExchangeService.issueTicket(
              { googleProfile: result.googleProfile },
              'cashier_signup',
            );
          res.cookie('oauth_bind', cashierNonce, {
            httpOnly: true, secure: true, sameSite: 'none', maxAge: 120_000,
          });
          res.redirect(
            `${frontendUrl}/auth/cashier-google-signup?google_ticket=${cashierTicket}`,
          );
        } else {
          // For admin/shop registration - redirect to shop registration page
          // This is intentional: admins can register new shops with Google
          const { ticket: regTicket, bindNonce: regNonce } =
            await this.oauthExchangeService.issueTicket(
              { googleProfile: result.googleProfile },
              'shop_registration',
            );
          res.cookie('oauth_bind', regNonce, {
            httpOnly: true, secure: true, sameSite: 'none', maxAge: 120_000,
          });
          res.redirect(`${frontendUrl}/register-shop?google_ticket=${regTicket}`);
        }
      } else {
        // Existing user - verify they have the correct role if this is a cashier flow
        if (isCashierSignup && result.user?.role !== 'cashier') {
          // User exists but is not a cashier - reject with clear message
          const errorMsg =
            'This Google account is linked to an admin account, not a cashier account. Please use the Admin login instead.';
          res.redirect(
            `${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`,
          );
          return;
        }

        // Existing user with valid role - check if OTP verification is required
        if (result.requiresEmailVerification) {
          // OAUTH-SEC2: the OTP handoff carries NO personal information
          // in the URL — the user/shop details live server-side behind
          // a purpose-bound one-time ticket.
          const { ticket: otpTicket, bindNonce: otpNonce } =
            await this.oauthExchangeService.issueTicket(
              {
                email: result.email,
                userName: result.userName,
                shopName: result.shopName,
                isGoogleLogin: true,
              },
              'otp_verification',
            );
          res.cookie('oauth_bind', otpNonce, {
            httpOnly: true, secure: true, sameSite: 'none', maxAge: 120_000,
          });
          res.redirect(`${frontendUrl}/login?otp=true&otp_ticket=${otpTicket}`);
        } else if (result.tokens) {
          // OAUTH-SEC1: no credentials in redirect URLs. The token pair
          // is stored server-side against a ~90s single-use ticket; the
          // frontend exchanges it via POST /auth/oauth/exchange.
          const { ticket, bindNonce } =
            await this.oauthExchangeService.issueTicket(
              {
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                csrfToken: result.tokens.csrfToken,
                user: result.user,
                shop: result.shop,
              },
              'admin_login',
            );
          // OAUTH-SEC2: browser transaction binding cookie (the exchange
          // must come from the same browser that received this redirect).
          res.cookie('oauth_bind', bindNonce, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 120_000,
          });
          res.redirect(`${frontendUrl}/auth/callback?success=true&ticket=${ticket}`);
        } else {
          res.redirect(
            `${frontendUrl}/login?error=${encodeURIComponent('Failed to generate authentication tokens')}`,
          );
        }
      }
    } catch (error: any) {
      res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Google login failed')}`,
      );
    }
  }

  @Post('register-shop-google')
  async registerShopWithGoogle(
    @Body() dto: RegisterShopGoogleDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.registerShopWithGoogle(
      dto.googleProfile,
      dto.shop,
      ipAddress,
      userAgent,
    );
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
    @Body()
    body: {
      googleProfile: {
        googleId: string;
        email: string;
        name: string;
        avatarUrl?: string;
      };
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
  @Throttle({ medium: { limit: 3, ttl: 60000 } }) // P1-13B: abuse protection on reset requests (named throttler)
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.requestPasswordReset(
      body.email,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Reset password using token
   */
  @Throttle({ medium: { limit: 5, ttl: 60000 } }) // P1-13B: brute-force protection on token redemption (named throttler)
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
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
      sessions: sessions.map((s) => ({
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
    await this.tokenService.terminateSession(
      sessionId,
      'User requested termination',
    );
    return { message: 'Session terminated successfully' };
  }

  /**
   * Logout from all devices (revoke all tokens)
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: any) {
    const count = await this.tokenService.revokeAllUserTokens(
      user.sub,
      'User logged out from all devices',
    );
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
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
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
  async logoutAllDevices(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const count = await this.tokenService.revokeAllUserTokens(
      user.sub,
      'User logged out from all devices',
    );

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

  // ==================== OTP Verification ====================

  /**
   * Send OTP for registration verification
   * Rate limited: 3 requests per minute per IP
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-otp')
  @SkipCsrf()
  async sendOtp(
    @Body() body: { email: string; shopName: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.otpService.sendRegistrationOtp(
      body.email,
      body.shopName,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Verify OTP code
   * Rate limited: 5 attempts per minute per IP
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-otp')
  @SkipCsrf()
  async verifyOtp(
    @Body()
    body: {
      email: string;
      code: string;
      type?: 'registration' | 'password_reset' | 'email_verification' | 'login';
    },
  ) {
    return this.otpService.verifyOtp(
      body.email,
      body.code,
      body.type || 'registration',
    );
  }

  /**
   * Verify login OTP and get tokens
   * Called when existing user needs to verify email on login
   * Rate limited: 5 attempts per minute per IP
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-login-otp')
  @SkipCsrf()
  async verifyLoginOtp(
    @Body() body: { email: string; code: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const result = await this.authService.verifyLoginOtpAndGetTokens(
      body.email,
      body.code,
      ipAddress,
      userAgent,
    );

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
      tokens: {
        accessToken: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken,
        expiresIn: result.tokens?.expiresIn,
        csrfToken: result.tokens?.csrfToken,
      },
    };
  }

  /**
   * Resend login OTP (for existing users verifying email on login)
   * Rate limited: 2 requests per minute per IP
   */
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('resend-login-otp')
  @SkipCsrf()
  async resendLoginOtp(
    @Body() body: { email: string; userName?: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.otpService.sendLoginOtp(
      body.email,
      body.userName || body.email,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Resend OTP code
   * Rate limited: 2 requests per minute per IP
   */
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('resend-otp')
  @SkipCsrf()
  async resendOtp(
    @Body()
    body: {
      email: string;
      shopName: string;
      type?: 'registration' | 'password_reset' | 'email_verification' | 'login';
    },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.otpService.resendOtp(
      body.email,
      body.shopName,
      body.type || 'registration',
      ipAddress,
      userAgent,
    );
  }

  /**
   * Check if email has been verified (for registration flow)
   */
  @Post('check-email-verified')
  @SkipCsrf()
  async checkEmailVerified(@Body() body: { email: string }) {
    const isVerified = await this.otpService.isEmailRecentlyVerified(
      body.email,
      'registration',
    );
    return { verified: isVerified };
  }
}
