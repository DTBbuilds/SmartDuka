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
    type: 'registration' | 'password_reset' | 'email_verification' | 'login',
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
    const digits = code.split('');
    const digitBoxes = digits.map(d =>
      `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;font-size:28px;font-weight:700;font-family:'Menlo','Monaco','Courier New',monospace;color:#111827;background-color:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:0;">${d}</td>`
    ).join('<td style="width:8px;"></td>');
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>SmartDuka Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;overflow:hidden;">Your SmartDuka verification code is ${code}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;border-top:3px solid #f97316;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="padding:28px 32px 0;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">SmartDuka</p>
</td></tr>
<!-- Content -->
<tr><td style="padding:24px 32px;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Verify your email</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;text-align:center;line-height:1.5;">
    Enter this code to finish registering <strong style="color:#111827;">${shopName}</strong> on SmartDuka.
  </p>
  <!-- OTP Code -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
  <tr>${digitBoxes}</tr>
  </table>
  <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;text-align:center;">Copy or type this code into the verification field</p>
  <!-- Expiry -->
  <p style="margin:0 0 24px;font-size:13px;color:#6b7280;text-align:center;">
    This code expires in <strong style="color:#111827;">${expiryMinutes} minutes</strong>
  </p>
  <!-- Security -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
  <tr><td style="padding:14px 16px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#374151;">Security notice</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
      Never share this code. SmartDuka will never call or message you asking for it. If you didn't request this, you can safely ignore this email.
    </p>
  </td></tr>
  </table>
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">SmartDuka &mdash; Smart POS for Kenyan businesses</p>
  <p style="margin:0;font-size:11px;color:#d1d5db;">&copy; ${year} SmartDuka. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Send OTP for login email verification (existing users who haven't verified email yet)
   */
  async sendLoginOtp(
    email: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; expiresIn?: number }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check cooldown
    const cooldownCheck = await this.canRequestOtp(normalizedEmail, 'login');
    if (!cooldownCheck.allowed) {
      throw new BadRequestException(
        `Please wait ${cooldownCheck.waitSeconds} seconds before requesting a new code.`,
      );
    }

    // Invalidate any existing unused OTPs for this email
    await this.otpModel.updateMany(
      { email: normalizedEmail, type: 'login', used: false },
      { used: true },
    );

    // Generate new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    const otp = new this.otpModel({
      email: normalizedEmail,
      code,
      type: 'login',
      expiresAt,
      ipAddress,
      userAgent,
      maxAttempts: this.MAX_OTP_ATTEMPTS,
    });
    await otp.save();

    // Send OTP via email
    const emailResult = await this.emailService.sendEmail({
      to: normalizedEmail,
      subject: `Your SmartDuka Login Verification Code: ${code}`,
      html: this.getLoginOtpEmailTemplate(code, userName, this.OTP_EXPIRY_MINUTES),
      text: `Your SmartDuka login verification code is: ${code}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.`,
      category: 'authentication',
      templateName: 'otp_login_verification',
      templateVariables: { code, userName, expiryMinutes: this.OTP_EXPIRY_MINUTES },
    });

    if (!emailResult.success) {
      this.logger.error(`Failed to send login OTP email to ${normalizedEmail}: ${emailResult.error}`);
    }

    this.logger.log(`Login OTP sent to ${normalizedEmail}`);

    return {
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Check your inbox and spam folder.`,
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Generate HTML email template for login OTP
   */
  private getLoginOtpEmailTemplate(code: string, userName: string, expiryMinutes: number): string {
    const digits = code.split('');
    const digitBoxes = digits.map(d =>
      `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;font-size:28px;font-weight:700;font-family:'Menlo','Monaco','Courier New',monospace;color:#111827;background-color:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:0;">${d}</td>`
    ).join('<td style="width:8px;"></td>');
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>SmartDuka Login Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;overflow:hidden;">Your SmartDuka login code is ${code}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;border-top:3px solid #f97316;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="padding:28px 32px 0;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">SmartDuka</p>
</td></tr>
<!-- Content -->
<tr><td style="padding:24px 32px;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Confirm your login</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;text-align:center;line-height:1.5;">
    Hi <strong style="color:#111827;">${userName}</strong>, enter this code to verify your identity and sign in.
  </p>
  <!-- OTP Code -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
  <tr>${digitBoxes}</tr>
  </table>
  <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;text-align:center;">Copy or type this code into the verification field</p>
  <!-- Expiry -->
  <p style="margin:0 0 24px;font-size:13px;color:#6b7280;text-align:center;">
    This code expires in <strong style="color:#111827;">${expiryMinutes} minutes</strong>
  </p>
  <!-- Security -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
  <tr><td style="padding:14px 16px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#374151;">Security notice</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
      This is a one-time verification for your email. Never share this code with anyone. If you didn't try to sign in, ignore this email and consider changing your password.
    </p>
  </td></tr>
  </table>
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">SmartDuka &mdash; Smart POS for Kenyan businesses</p>
  <p style="margin:0;font-size:11px;color:#d1d5db;">&copy; ${year} SmartDuka. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Resend OTP (with cooldown check)
   */
  async resendOtp(
    email: string,
    shopName: string,
    type: 'registration' | 'password_reset' | 'email_verification' | 'login',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; expiresIn?: number }> {
    if (type === 'registration') {
      return this.sendRegistrationOtp(email, shopName, ipAddress, userAgent);
    }

    if (type === 'login') {
      return this.sendLoginOtp(email, shopName, ipAddress, userAgent);
    }

    // For other types, implement similar logic
    throw new BadRequestException('Invalid OTP type');
  }
}
