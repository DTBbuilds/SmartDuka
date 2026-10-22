import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthExchangeService } from '../services/oauth-exchange.service';
import { GoogleStrategy } from '../strategies/google.strategy';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  // RELEASE-INTEGRATION1: transaction-bound state validation happens
  // HERE, before the code exchange — the app has no express-session, so
  // passport-oauth2 skips its own state validation silently. The
  // validated purpose is passed to the handler via the request.
  constructor(private readonly oauthExchangeService: OAuthExchangeService) {
    super();
  }

  /**
   * Override canActivate to:
   * 1. Block requests when Google OAuth is not configured (prevents invalid_client error)
   * 2. Handle OAuth errors gracefully (user denied access, etc.)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.smartduka.org';
    
    // CRITICAL: Check if Google OAuth is configured BEFORE redirecting to Google
    // This prevents the "OAuth client was not found" / "invalid_client" error
    if (!GoogleStrategy.isConfigured()) {
      this.logger.warn('Google login attempted but GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured.');
      const errorMessage = 'Google login is not configured yet. Please set up Google OAuth credentials in your .env file, or contact your administrator.';
      response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
      return false;
    }

    // Check for OAuth error in query params (e.g., user denied access)
    const error = request.query?.error;
    if (error) {
      let errorMessage = 'Google sign-in was cancelled or failed.';
      
      if (error === 'access_denied') {
        errorMessage = 'You cancelled the Google sign-in. Please try again when ready.';
      } else if (error === 'invalid_request') {
        errorMessage = 'Invalid Google sign-in request. Please try again.';
      } else if (error === 'unauthorized_client') {
        errorMessage = 'Google sign-in is not properly configured. Please contact support.';
      } else if (error === 'server_error') {
        errorMessage = 'Google servers are temporarily unavailable. Please try again later.';
      }
      
      response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
      return false;
    }
    
    // RELEASE-INTEGRATION1: MANDATORY transaction-bound state validation
    // (before the code exchange). Missing, forged, replayed, expired or
    // mismatched states are rejected — the flow classification is read
    // from the server store, never from client metadata.
    const state = request.query?.state;
    const stateCheck = await this.oauthExchangeService.validateState(
      typeof state === 'string' ? state : '',
    );
    if (!stateCheck.valid) {
      response.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Invalid or expired authentication session. Please sign in again.')}`,
      );
      return false;
    }
    request.oauthStatePurpose = stateCheck.purpose;

    // Credentials are configured and no error - proceed with normal OAuth flow
    try {
      return await (super.canActivate(context) as Promise<boolean>);
    } catch (err: any) {
      // Catch any Passport errors (e.g., invalid credentials at Google's end)
      this.logger.error(`Google OAuth error: ${err?.message}`);
      const errorMessage = 'Google sign-in failed. The OAuth credentials may be invalid. Please check your Google Cloud Console configuration.';
      response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
      return false;
    }
  }

  /**
   * Override handleRequest to provide better error messages
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new Error('Google authentication failed. Please try again.');
    }
    return user;
  }
}
