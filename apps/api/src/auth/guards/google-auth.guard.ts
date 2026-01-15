import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  /**
   * Override canActivate to handle OAuth errors gracefully
   * When user denies access, Google returns error=access_denied
   * We redirect to login with a friendly message instead of throwing 401
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Check for OAuth error in query params (e.g., user denied access)
    const error = request.query?.error;
    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
      
      // Redirect to login with user-friendly error message
      response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
      return false;
    }
    
    // No error, proceed with normal OAuth flow
    return super.canActivate(context) as Promise<boolean>;
  }

  /**
   * Override handleRequest to provide better error messages
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // If we get here, something went wrong with the OAuth flow
      // This shouldn't happen often since we handle errors in canActivate
      throw err || new Error('Google authentication failed. Please try again.');
    }
    return user;
  }
}
