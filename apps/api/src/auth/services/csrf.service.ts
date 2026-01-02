import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * CSRF Token Service
 * Generates and validates CSRF tokens for protection against cross-site request forgery
 */
@Injectable()
export class CsrfService {
  /**
   * Generate a cryptographically secure CSRF token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a token tied to a session (more secure)
   * Uses HMAC to bind the token to the session
   */
  generateSessionBoundToken(sessionId: string, secret: string): string {
    const timestamp = Date.now().toString();
    const data = `${sessionId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    // Token format: timestamp.signature
    return `${timestamp}.${signature}`;
  }

  /**
   * Validate a session-bound CSRF token
   */
  validateSessionBoundToken(
    token: string,
    sessionId: string,
    secret: string,
    maxAgeMs: number = 30 * 60 * 1000, // 30 minutes default
  ): boolean {
    try {
      const [timestamp, signature] = token.split('.');
      
      if (!timestamp || !signature) {
        return false;
      }

      // Check token age
      const tokenTime = parseInt(timestamp, 10);
      if (isNaN(tokenTime) || Date.now() - tokenTime > maxAgeMs) {
        return false;
      }

      // Verify signature
      const data = `${sessionId}:${timestamp}`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
