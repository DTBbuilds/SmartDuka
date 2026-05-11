import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceFingerprint, DeviceFingerprintDocument } from '../schemas/device-fingerprint.schema';
import * as crypto from 'crypto';

@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);
  
  // Device becomes trusted after 1 successful OTP-verified login
  // (User asked: OTP only for new users/devices — once verified, never again)
  private readonly TRUSTED_DEVICE_THRESHOLD = 1;
  // Trusted devices remain trusted for 60 days without activity
  private readonly TRUSTED_DEVICE_EXPIRY_DAYS = 60;

  constructor(
    @InjectModel(DeviceFingerprint.name)
    private readonly deviceFingerprintModel: Model<DeviceFingerprintDocument>,
  ) {}

  /**
   * Generate a device fingerprint from request data
   */
  generateFingerprint(userAgent?: string, ipAddress?: string): string {
    const components = [
      userAgent || '',
      ipAddress || '',
      // Add more components as needed
      // navigator.userAgentData?.brands, screen resolution, etc.
    ].filter(Boolean);
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Extract device information from user agent
   */
  parseDeviceInfo(userAgent?: string): {
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  } {
    if (!userAgent) {
      return {
        deviceName: 'Unknown Device',
        deviceType: 'desktop',
      };
    }

    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (ua.includes('mobile') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    const deviceName = `${browser} on ${os}${deviceType !== 'desktop' ? ` (${deviceType})` : ''}`;

    return {
      deviceName,
      deviceType,
      browser,
      os,
    };
  }

  /**
   * Check if device is trusted for a user
   */
  async isDeviceTrusted(
    userId: string,
    fingerprint: string,
  ): Promise<{ isTrusted: boolean; device?: DeviceFingerprint }> {
    const device = await this.deviceFingerprintModel.findOne({
      userId,
      fingerprint,
      isActive: true,
    });

    if (!device) {
      return { isTrusted: false };
    }

    // Check if trusted device has expired
    if (device.isTrusted && device.expiresAt && device.expiresAt < new Date()) {
      await this.deviceFingerprintModel.findByIdAndUpdate(device._id, {
        isTrusted: false,
        expiresAt: undefined,
      });
      return { isTrusted: false, device };
    }

    return { isTrusted: device.isTrusted, device };
  }

  /**
   * Record a login attempt for a device
   */
  async recordLoginAttempt(
    userId: string,
    fingerprint: string,
    ipAddress?: string,
    userAgent?: string,
    otpRequired: boolean = true,
  ): Promise<DeviceFingerprint> {
    const deviceInfo = this.parseDeviceInfo(userAgent);
    
    // Find existing device or create new one
    let device = await this.deviceFingerprintModel.findOne({
      userId,
      fingerprint,
    });

    if (device) {
      // Update existing device
      device.loginCount += 1;
      device.lastLoginAt = new Date();
      device.ipAddress = ipAddress;
      device.userAgent = userAgent;
      device.isActive = true;

      if (otpRequired) {
        device.otpRequiredCount += 1;
      }

      // Check if device should become trusted
      if (!device.isTrusted && device.loginCount >= this.TRUSTED_DEVICE_THRESHOLD) {
        device.isTrusted = true;
        device.trustedAt = new Date();
        device.expiresAt = new Date(Date.now() + this.TRUSTED_DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        this.logger.log(`Device ${device.fingerprint} for user ${userId} is now trusted`);
      }

      await device.save();
    } else {
      // Create new device record
      device = new this.deviceFingerprintModel({
        userId,
        fingerprint,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        userAgent,
        ipAddress,
        loginCount: 1,
        otpRequiredCount: otpRequired ? 1 : 0,
        lastLoginAt: new Date(),
        isTrusted: false,
      });

      await device.save();
      this.logger.log(`New device registered for user ${userId}: ${deviceInfo.deviceName}`);
    }

    return device;
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceFingerprint[]> {
    return this.deviceFingerprintModel
      .find({ userId, isActive: true })
      .sort({ lastLoginAt: -1 })
      .exec();
  }

  /**
   * Revoke trust from a device
   */
  async revokeDeviceTrust(userId: string, fingerprint: string): Promise<boolean> {
    const result = await this.deviceFingerprintModel.updateOne(
      { userId, fingerprint },
      { 
        isTrusted: false, 
        expiresAt: undefined,
        $unset: { trustedAt: 1 }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Deactivate a device completely
   */
  async deactivateDevice(userId: string, fingerprint: string): Promise<boolean> {
    const result = await this.deviceFingerprintModel.updateOne(
      { userId, fingerprint },
      { isActive: false, isTrusted: false }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Super-admin: list all devices across the platform with optional filters
   */
  async getAllDevices(filters?: { isTrusted?: boolean; userId?: string; search?: string }): Promise<DeviceFingerprint[]> {
    const query: any = { isActive: true };
    if (filters?.isTrusted !== undefined) query.isTrusted = filters.isTrusted;
    if (filters?.userId) query.userId = filters.userId;
    if (filters?.search) {
      query.$or = [
        { deviceName: { $regex: filters.search, $options: 'i' } },
        { browser: { $regex: filters.search, $options: 'i' } },
        { os: { $regex: filters.search, $options: 'i' } },
        { ipAddress: { $regex: filters.search, $options: 'i' } },
      ];
    }
    return this.deviceFingerprintModel
      .find(query)
      .populate('userId', 'email name role')
      .sort({ lastLoginAt: -1 })
      .limit(500)
      .exec();
  }

  /**
   * Super-admin: revoke trust by Mongo deviceId (no user scope)
   */
  async revokeDeviceTrustById(deviceId: string): Promise<boolean> {
    const result = await this.deviceFingerprintModel.updateOne(
      { _id: deviceId },
      { isTrusted: false, expiresAt: undefined, $unset: { trustedAt: 1 } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Super-admin: deactivate a device by Mongo deviceId
   */
  async deactivateDeviceById(deviceId: string): Promise<boolean> {
    const result = await this.deviceFingerprintModel.updateOne(
      { _id: deviceId },
      { isActive: false, isTrusted: false }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Super-admin: aggregate stats
   */
  async getDeviceStats(): Promise<{ total: number; trusted: number; active: number; learning: number }> {
    const [total, trusted, active] = await Promise.all([
      this.deviceFingerprintModel.countDocuments({}),
      this.deviceFingerprintModel.countDocuments({ isTrusted: true, isActive: true }),
      this.deviceFingerprintModel.countDocuments({ isActive: true }),
    ]);
    return { total, trusted, active, learning: active - trusted };
  }

  /**
   * Clean up old inactive devices
   */
  async cleanupOldDevices(): Promise<void> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await this.deviceFingerprintModel.deleteMany({
      lastLoginAt: { $lt: ninetyDaysAgo },
      isActive: false,
    });

    if (result.deletedCount > 0) {
      this.logger.log(`Cleaned up ${result.deletedCount} old inactive devices`);
    }
  }

  /**
   * Check if OTP should be required based on device and login history
   */
  async shouldRequireOtp(
    userId: string,
    fingerprint: string,
    loginMethod: 'password' | 'google' | 'pin',
  ): Promise<{ required: boolean; reason?: string }> {
    // Google OAuth users get more lenient treatment
    if (loginMethod === 'google') {
      const { isTrusted, device } = await this.isDeviceTrusted(userId, fingerprint);
      if (isTrusted && device) {
        return { required: false };
      }
    }

    // For new devices, always require OTP
    const existingDevice = await this.deviceFingerprintModel.findOne({
      userId,
      fingerprint,
      isActive: true,
    });

    if (!existingDevice) {
      return { required: true, reason: 'new_device' };
    }

    // For trusted devices, skip OTP
    if (existingDevice.isTrusted) {
      // Check if trust hasn't expired
      if (!existingDevice.expiresAt || existingDevice.expiresAt > new Date()) {
        return { required: false };
      } else {
        // Trust expired, require OTP again
        await this.deviceFingerprintModel.findByIdAndUpdate(existingDevice._id, {
          isTrusted: false,
          expiresAt: undefined,
        });
        return { required: true, reason: 'trust_expired' };
      }
    }

    // For devices with fewer than threshold logins, require OTP
    if (existingDevice.loginCount < this.TRUSTED_DEVICE_THRESHOLD) {
      return { 
        required: true, 
        reason: 'insufficient_logins'
      };
    }

    return { required: false };
  }
}
