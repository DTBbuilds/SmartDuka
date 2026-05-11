import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeviceFingerprintService } from '../auth/services/device-fingerprint.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Super Admin - Devices')
@Controller('super-admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@ApiBearerAuth()
export class SuperAdminDevicesController {
  constructor(private readonly deviceFingerprintService: DeviceFingerprintService) {}

  @Get('stats')
  @ApiOperation({ summary: 'System-wide device stats' })
  async getStats() {
    return this.deviceFingerprintService.getDeviceStats();
  }

  @Get()
  @ApiOperation({ summary: 'List all devices across the platform' })
  @ApiQuery({ name: 'isTrusted', required: false, type: Boolean })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listAllDevices(
    @Query('isTrusted') isTrusted?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (isTrusted !== undefined) filters.isTrusted = isTrusted === 'true';
    if (userId) filters.userId = userId;
    if (search) filters.search = search;

    const devices = await this.deviceFingerprintService.getAllDevices(filters);
    return {
      success: true,
      total: devices.length,
      devices,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all devices for a specific user' })
  async getUserDevices(@Param('userId') userId: string) {
    const devices = await this.deviceFingerprintService.getUserDevices(userId);
    return {
      success: true,
      total: devices.length,
      trusted: devices.filter(d => d.isTrusted).length,
      devices,
    };
  }

  @Post('revoke')
  @ApiOperation({ summary: 'Revoke trust from a device by deviceId' })
  async revokeDeviceTrust(@Body() body: { deviceId: string }) {
    if (!body?.deviceId) {
      return { success: false, message: 'deviceId required' };
    }
    const success = await this.deviceFingerprintService.revokeDeviceTrustById(body.deviceId);
    return {
      success,
      message: success ? 'Device trust revoked' : 'Device not found or already revoked',
    };
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate a device by deviceId' })
  async deactivateDevice(@Body() body: { deviceId: string }) {
    if (!body?.deviceId) {
      return { success: false, message: 'deviceId required' };
    }
    const success = await this.deviceFingerprintService.deactivateDeviceById(body.deviceId);
    return {
      success,
      message: success ? 'Device deactivated' : 'Device not found',
    };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Run cleanup of old inactive devices' })
  async cleanup() {
    await this.deviceFingerprintService.cleanupOldDevices();
    return { success: true, message: 'Old devices cleaned up' };
  }
}
