import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private static _isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    const isDev = process.env.NODE_ENV !== 'production';
    const defaultCallbackUrl = isDev 
      ? 'http://localhost:5000/api/v1/auth/google/callback'
      : 'https://smartduka-91q6.onrender.com/api/v1/auth/google/callback';

    // Check if credentials are real (not placeholder/missing)
    const hasValidCredentials = !!(
      clientID && 
      clientSecret && 
      clientID !== 'not-configured' && 
      clientSecret !== 'not-configured' &&
      clientID !== 'your-google-client-id.apps.googleusercontent.com' &&
      clientSecret !== 'your-google-client-secret'
    );

    GoogleStrategy._isConfigured = hasValidCredentials;
    
    const options: StrategyOptions = {
      clientID: clientID || 'placeholder-will-be-blocked',
      clientSecret: clientSecret || 'placeholder-will-be-blocked',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || defaultCallbackUrl,
      scope: ['email', 'profile'],
    };
    super(options);

    if (!hasValidCredentials) {
      this.logger.warn(
        'Google OAuth is NOT configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file. ' +
        'See .env.example for setup instructions. Google login will be disabled until configured.',
      );
    } else {
      this.logger.log('Google OAuth is configured and ready.');
    }
  }

  /**
   * Check if Google OAuth credentials are properly configured.
   * Used by the controller to block requests before they reach Google.
   */
  static isConfigured(): boolean {
    return GoogleStrategy._isConfigured;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    const user: GoogleProfile = {
      googleId: id,
      email: emails?.[0]?.value || '',
      name: displayName || '',
      avatarUrl: photos?.[0]?.value,
    };

    done(null, user);
  }
}
