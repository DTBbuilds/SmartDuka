import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { PasswordResetToken, PasswordResetTokenDocument } from './schemas/password-reset-token.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { CsrfService } from './services/csrf.service';

export interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  role: string;
  shopId?: string;
  branchId?: string;
  cashierId?: string;
  jti?: string;
  sessionId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  sessionId: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  
  // Token expiry times - Industry MVP best practices
  // Access tokens: Short-lived (15 min) - limits exposure if compromised
  // Refresh tokens: Medium-lived (7 days) - balance between security and UX
  // Absolute session limit: 30 days - forces re-authentication periodically
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes (industry standard)
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days (not 30 - too long)
  private readonly ABSOLUTE_SESSION_EXPIRY_DAYS = 30; // Max session lifetime
  private readonly MAX_REFRESH_ROTATIONS = 100; // Prevent infinite rotation attacks
  private readonly PASSWORD_RESET_EXPIRY_HOURS = 1; // 1 hour

  private readonly csrfService: CsrfService;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordResetToken.name) private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {
    this.csrfService = new CsrfService();
  }

  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a unique JWT ID (jti)
   */
  generateJti(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash a token for secure storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Verify a token against its hash
   */
  async verifyTokenHash(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    payload: TokenPayload,
    deviceInfo?: {
      deviceId?: string;
      deviceFingerprint?: string;
      userAgent?: string;
      ipAddress?: string;
      clientType?: string;
    },
  ): Promise<TokenPair> {
    const jti = this.generateJti();
    const sessionId = this.generateSecureToken(16);
    
    // Generate access token with short expiry
    const accessToken = this.jwtService.sign(
      { ...payload, jti, sessionId },
      { expiresIn: this.ACCESS_TOKEN_EXPIRY },
    );

    // Generate refresh token
    const refreshToken = this.generateSecureToken(64);
    const refreshTokenHash = await this.hashToken(refreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store refresh token in database
    const storedRefreshToken = await this.refreshTokenModel.create({
      userId: new Types.ObjectId(payload.sub),
      shopId: payload.shopId ? new Types.ObjectId(payload.shopId) : undefined,
      token: refreshToken.substring(0, 16), // Store partial for lookup
      tokenHash: refreshTokenHash,
      expiresAt,
      deviceId: deviceInfo?.deviceId,
      deviceFingerprint: deviceInfo?.deviceFingerprint,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
      clientType: deviceInfo?.clientType || 'web',
    });

    // Create session record
    await this.sessionModel.create({
      userId: new Types.ObjectId(payload.sub),
      shopId: payload.shopId ? new Types.ObjectId(payload.shopId) : undefined,
      sessionId,
      accessTokenJti: jti,
      refreshTokenId: storedRefreshToken._id,
      lastActivityAt: new Date(),
      expiresAt,
      deviceId: deviceInfo?.deviceId,
      deviceFingerprint: deviceInfo?.deviceFingerprint,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
      clientType: deviceInfo?.clientType || 'web',
    });

    // Generate CSRF token
    const csrfToken = this.csrfService.generateToken();

    this.logger.log(`Token pair generated for user ${payload.email} (session: ${sessionId})`);

    return {
      accessToken,
      refreshToken,
      csrfToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      sessionId,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    deviceInfo?: {
      deviceId?: string;
      deviceFingerprint?: string;
      ipAddress?: string;
    },
  ): Promise<TokenPair> {
    // Find refresh token by partial match
    const tokenPrefix = refreshToken.substring(0, 16);
    const storedToken = await this.refreshTokenModel.findOne({
      token: tokenPrefix,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify full token hash
    const isValid = await this.verifyTokenHash(refreshToken, storedToken.tokenHash);
    if (!isValid) {
      // Potential token theft - revoke all tokens for this user
      await this.revokeAllUserTokens(storedToken.userId.toString(), 'Potential token theft detected');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check device fingerprint if provided
    if (deviceInfo?.deviceFingerprint && storedToken.deviceFingerprint) {
      if (deviceInfo.deviceFingerprint !== storedToken.deviceFingerprint) {
        this.logger.warn(`Device fingerprint mismatch for user ${storedToken.userId}`);
        // Don't fail, but log for security monitoring
      }
    }

    // Check rotation count to prevent infinite rotation attacks
    if (storedToken.rotationCount >= this.MAX_REFRESH_ROTATIONS) {
      this.logger.warn(`Max refresh rotations reached for user ${storedToken.userId}`);
      await this.revokeAllUserTokens(storedToken.userId.toString(), 'Max refresh rotations exceeded');
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    // Revoke old refresh token (token rotation)
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    storedToken.revokedReason = 'Token rotation';
    await storedToken.save();

    // Get user info from old token to create new payload
    const session = await this.sessionModel.findOne({
      refreshTokenId: storedToken._id,
      isActive: true,
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Decode the old access token to get payload (we need user info)
    // For now, we'll need to fetch user from database
    // This would be passed from the auth service in real implementation
    
    // Generate new token pair with rotation
    const newRefreshToken = this.generateSecureToken(64);
    const newRefreshTokenHash = await this.hashToken(newRefreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    const newStoredRefreshToken = await this.refreshTokenModel.create({
      userId: storedToken.userId,
      shopId: storedToken.shopId,
      token: newRefreshToken.substring(0, 16),
      tokenHash: newRefreshTokenHash,
      expiresAt,
      deviceId: deviceInfo?.deviceId || storedToken.deviceId,
      deviceFingerprint: deviceInfo?.deviceFingerprint || storedToken.deviceFingerprint,
      ipAddress: deviceInfo?.ipAddress,
      clientType: storedToken.clientType,
      rotationCount: storedToken.rotationCount + 1,
    });

    // Update old token with replacement reference
    storedToken.replacedByToken = newStoredRefreshToken._id as Types.ObjectId;
    await storedToken.save();

    // Update session
    session.refreshTokenId = newStoredRefreshToken._id as Types.ObjectId;
    session.lastActivityAt = new Date();
    await session.save();

    // Generate new CSRF token
    const csrfToken = this.csrfService.generateToken();

    // Return partial result - caller needs to provide user payload
    return {
      accessToken: '', // Will be set by auth service
      refreshToken: newRefreshToken,
      csrfToken,
      expiresIn: 30 * 60,
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      sessionId: session.sessionId,
    };
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    // Invalidate any existing reset tokens for this user
    await this.passwordResetTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );

    const token = this.generateSecureToken(32);
    const tokenHash = await this.hashToken(token);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.PASSWORD_RESET_EXPIRY_HOURS);

    await this.passwordResetTokenModel.create({
      userId: new Types.ObjectId(userId),
      token: token.substring(0, 16), // Store partial for lookup
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Password reset token generated for user ${userId}`);
    return token;
  }

  /**
   * Verify and consume password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<string> {
    const tokenPrefix = token.substring(0, 16);
    const storedToken = await this.passwordResetTokenModel.findOne({
      token: tokenPrefix,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const isValid = await this.verifyTokenHash(token, storedToken.tokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Mark as used
    storedToken.isUsed = true;
    storedToken.usedAt = new Date();
    await storedToken.save();

    return storedToken.userId.toString();
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(token: string, reason?: string): Promise<void> {
    const tokenPrefix = token.substring(0, 16);
    await this.refreshTokenModel.updateOne(
      { token: tokenPrefix },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<number> {
    const result = await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );

    // Terminate all sessions
    await this.sessionModel.updateMany(
      { userId: new Types.ObjectId(userId), isActive: true },
      { isActive: false, terminatedAt: new Date(), terminatedReason: reason },
    );

    this.logger.log(`Revoked ${result.modifiedCount} tokens for user ${userId}`);
    return result.modifiedCount;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    }).sort({ lastActivityAt: -1 });
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string, reason?: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (session) {
      session.isActive = false;
      session.terminatedAt = new Date();
      session.terminatedReason = reason;
      await session.save();

      // Revoke associated refresh token
      if (session.refreshTokenId) {
        await this.refreshTokenModel.updateOne(
          { _id: session.refreshTokenId },
          { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
        );
      }
    }
  }

  /**
   * Validate session is still active
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.sessionModel.findOne({
      sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    return !!session;
  }

  /**
   * Get session by ID with user info
   */
  async getSessionById(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOne({
      sessionId,
      isActive: true,
    });
  }

  /**
   * Get user info from session (looks up user details)
   */
  async getUserInfoFromSession(sessionId: string): Promise<{
    userId: string;
    shopId?: string;
  } | null> {
    const session = await this.sessionModel.findOne({
      sessionId,
      isActive: true,
    });
    
    if (!session) return null;
    
    return {
      userId: session.userId.toString(),
      shopId: session.shopId?.toString(),
    };
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      { lastActivityAt: new Date() },
    );
  }

  /**
   * Cleanup expired tokens (called by cron job)
   */
  async cleanupExpiredTokens(): Promise<{ refreshTokens: number; resetTokens: number; sessions: number }> {
    const now = new Date();
    
    const refreshResult = await this.refreshTokenModel.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isRevoked: true, revokedAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    });

    const resetResult = await this.passwordResetTokenModel.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isUsed: true },
      ],
    });

    const sessionResult = await this.sessionModel.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isActive: false, terminatedAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    });

    this.logger.log(`Cleanup: ${refreshResult.deletedCount} refresh tokens, ${resetResult.deletedCount} reset tokens, ${sessionResult.deletedCount} sessions`);

    return {
      refreshTokens: refreshResult.deletedCount,
      resetTokens: resetResult.deletedCount,
      sessions: sessionResult.deletedCount,
    };
  }
}
