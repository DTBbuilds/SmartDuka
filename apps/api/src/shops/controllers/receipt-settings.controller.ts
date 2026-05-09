import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceiptSettingsService } from '../services/receipt-settings.service';
import { UpdateReceiptSettingsDto } from '../dto/receipt-settings.dto';

@Controller('receipt-settings')
@UseGuards(JwtAuthGuard)
export class ReceiptSettingsController {
  constructor(private receiptSettingsService: ReceiptSettingsService) {}

  /**
   * Get receipt settings for current user's shop
   */
  @Get()
  async getSettings(@Request() req: { user: { shopId: string } }) {
    return this.receiptSettingsService.getSettings(req.user.shopId);
  }

  /**
   * Update receipt settings
   */
  @Put()
  async updateSettings(
    @Request() req: { user: { shopId: string; userId: string } },
    @Body() updateDto: UpdateReceiptSettingsDto,
  ) {
    return this.receiptSettingsService.updateSettings(
      req.user.shopId,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * Apply a preset template
   */
  @Post('presets/:presetId/apply')
  async applyPreset(
    @Request() req: { user: { shopId: string; userId: string } },
    @Param('presetId') presetId: string,
  ) {
    return this.receiptSettingsService.applyPreset(
      req.user.shopId,
      presetId,
      req.user.userId,
    );
  }

  /**
   * Get available presets
   */
  @Get('presets')
  getPresets() {
    return this.receiptSettingsService.getPresets();
  }

  /**
   * Reset to defaults
   */
  @Post('reset')
  async resetToDefaults(@Request() req: { user: { shopId: string } }) {
    return this.receiptSettingsService.resetToDefaults(req.user.shopId);
  }

  /**
   * Upload logo URL
   */
  @Post('logo')
  async uploadLogo(
    @Request() req: { user: { shopId: string; userId: string } },
    @Body() body: { logoUrl: string },
  ) {
    if (!body.logoUrl) {
      throw new BadRequestException('logoUrl is required');
    }
    return this.receiptSettingsService.updateLogo(req.user.shopId, body.logoUrl, req.user.userId);
  }

  /**
   * Remove logo
   */
  @Post('logo/remove')
  async removeLogo(@Request() req: { user: { shopId: string; userId: string } }) {
    return this.receiptSettingsService.removeLogo(req.user.shopId, req.user.userId);
  }
}
