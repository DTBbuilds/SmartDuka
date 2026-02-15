import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from '../schemas/otp.schema';
import { EmailService } from '../../notifications/email.service';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly OTP_COOLDOWN_MINUTES = 1; // Minimum time between OTP requests

  constructor(
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    // Generate cryptographically secure random 6-digit code
    const randomBytes = crypto.randomBytes(3);
    const code = (parseInt(randomBytes.toString('hex'), 16) % 900000 + 100000).toString();
    return code;
  }

  /**
   * Check if user can request a new OTP (cooldown check)
   */
  private async canRequestOtp(email: string, type: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
    const recentOtp = await this.otpModel.findOne({
      email: email.toLowerCase().trim(),
      type,
      used: false,
      createdAt: { $gte: new Date(Date.now() - this.OTP_COOLDOWN_MINUTES * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (recentOtp) {
      const waitMs = this.OTP_COOLDOWN_MINUTES * 60 * 1000 - (Date.now() - (recentOtp as any).createdAt.getTime());
      return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) };
    }

    return { allowed: true };
  }

  /**
   * Send OTP for registration verification
   */
  async sendRegistrationOtp(
    email: string,
    shopName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; expiresIn?: number }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check cooldown
    const cooldownCheck = await this.canRequestOtp(normalizedEmail, 'registration');
    if (!cooldownCheck.allowed) {
      throw new BadRequestException(
        `Please wait ${cooldownCheck.waitSeconds} seconds before requesting a new code.`,
      );
    }

    // Invalidate any existing unused OTPs for this email
    await this.otpModel.updateMany(
      { email: normalizedEmail, type: 'registration', used: false },
      { used: true },
    );

    // Generate new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    const otp = new this.otpModel({
      email: normalizedEmail,
      code,
      type: 'registration',
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: this.MAX_OTP_ATTEMPTS,
    });
    await otp.save();

    // Send OTP via email
    const emailResult = await this.emailService.sendEmail({
      to: normalizedEmail,
      subject: `Your SmartDuka Verification Code: ${code}`,
      html: this.getOtpEmailTemplate(code, shopName, this.OTP_EXPIRY_MINUTES),
      text: `Your SmartDuka verification code is: ${code}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.`,
      category: 'authentication',
      templateName: 'otp_verification',
      templateVariables: { code, shopName, expiryMinutes: this.OTP_EXPIRY_MINUTES },
    });

    if (!emailResult.success) {
      this.logger.error(`Failed to send OTP email to ${normalizedEmail}: ${emailResult.error}`);
      // Don't reveal email sending failures to prevent enumeration
      // Still return success to not leak information
    }

    this.logger.log(`OTP sent to ${normalizedEmail} for registration`);

    return {
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Check your inbox and spam folder.`,
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    email: string,
    code: string,
    type: 'registration' | 'password_reset' | 'email_verification',
  ): Promise<{ valid: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Find the most recent unused OTP for this email and type
    const otp = await this.otpModel.findOne({
      email: normalizedEmail,
      type,
      used: false,
    }).sort({ createdAt: -1 });

    if (!otp) {
      throw new UnauthorizedException('No verification code found. Please request a new code.');
    }

    // Check if OTP is expired
    if (otp.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification code has expired. Please request a new code.');
    }

    // Check if max attempts exceeded
    if (otp.attempts >= otp.maxAttempts) {
      await this.otpModel.findByIdAndUpdate(otp._id, { used: true });
      throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
    }

    // Increment attempt counter
    await this.otpModel.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });

    // Verify the code
    if (otp.code !== normalizedCode) {
      const remainingAttempts = otp.maxAttempts - otp.attempts - 1;
      throw new UnauthorizedException(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      );
    }

    // Mark OTP as used
    await this.otpModel.findByIdAndUpdate(otp._id, {
      used: true,
      verifiedAt: new Date(),
    });

    this.logger.log(`OTP verified successfully for ${normalizedEmail}`);

    return {
      valid: true,
      message: 'Verification successful.',
    };
  }

  /**
   * Check if email has been verified recently (within last 30 minutes)
   * Used to allow registration to proceed after OTP verification
   */
  async isEmailRecentlyVerified(email: string, type: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const verifiedOtp = await this.otpModel.findOne({
      email: normalizedEmail,
      type,
      used: true,
      verifiedAt: { $gte: thirtyMinutesAgo },
    });

    return !!verifiedOtp;
  }

  /**
   * Generate HTML email template for OTP
   */
  private getOtpEmailTemplate(code: string, shopName: string, expiryMinutes: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f5; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; text-align: center; }
    .otp-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 25px; margin: 25px 0; }
    .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1d4ed8; font-family: 'Monaco', 'Courier New', monospace; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8fafc; }
    .expiry { color: #dc2626; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🛒 SmartDuka</h1>
      </div>
      <div class="content">
        <h2 style="margin-top: 0;">Verify Your Email</h2>
        <p>You're registering <strong>${shopName}</strong> on SmartDuka.</p>
        <p>Enter this verification code to complete your registration:</p>
        
        <div class="otp-box">
          <div class="otp-code">${code}</div>
        </div>
        
        <p class="expiry">⏱️ This code expires in ${expiryMinutes} minutes</p>
        
        <div class="warning">
          <strong>🔒 Security Notice:</strong>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Never share this code with anyone</li>
            <li>SmartDuka will never ask for this code via phone</li>
            <li>If you didn't request this, ignore this email</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from SmartDuka.</p>
        <p>© ${new Date().getFullYear()} SmartDuka. Built for Kenyan businesses.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Resend OTP (with cooldown check)
   */
  async resendOtp(
    email: string,
    shopName: string,
    type: 'registration' | 'password_reset' | 'email_verification',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; expiresIn?: number }> {
    if (type === 'registration') {
      return this.sendRegistrationOtp(email, shopName, ipAddress, userAgent);
    }

    // For other types, implement similar logic
    throw new BadRequestException('Invalid OTP type');
  }
}
