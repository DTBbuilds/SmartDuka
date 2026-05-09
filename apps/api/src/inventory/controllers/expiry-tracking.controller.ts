import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExpiryTrackingService } from '../services/expiry-tracking.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class ExpiryTrackingController {
  constructor(private expiryService: ExpiryTrackingService) {}

  /**
   * Get all expiring products for the current shop
   */
  @Get('expiring')
  async getExpiringProducts(@Request() req: { user: { shopId: string } }): Promise<any> {
    return this.expiryService.getExpiringProducts(req.user.shopId);
  }

  /**
   * Get only expired products
   */
  @Get('expired')
  async getExpiredProducts(@Request() req: { user: { shopId: string } }): Promise<any> {
    const products = await this.expiryService.getExpiredProducts(req.user.shopId);
    return { products };
  }

  /**
   * Get products expiring within specific days
   */
  @Get('expiring-within/:days')
  async getProductsExpiringWithinDays(
    @Request() req: { user: { shopId: string } },
    @Param('days') days: string,
  ): Promise<any> {
    const products = await this.expiryService.getProductsExpiringWithinDays(
      req.user.shopId,
      parseInt(days, 10),
    );
    return { products };
  }

  /**
   * Get FEFO (First Expired First Out) recommendations
   */
  @Get('fefo-recommendations')
  async getFEFORecommendations(
    @Request() req: { user: { shopId: string } },
    @Body() body?: { productName?: string },
  ): Promise<any> {
    const recommendations = await this.expiryService.getFEFORecommendation(
      req.user.shopId,
      body?.productName,
    );
    return { recommendations };
  }

  /**
   * Generate disposal report for expired products
   */
  @Get('disposal-report')
  async getDisposalReport(@Request() req: { user: { shopId: string } }) {
    return this.expiryService.generateDisposalReport(req.user.shopId);
  }

  /**
   * Check if business type requires expiry tracking
   */
  @Get('requires-expiry/:businessType')
  async checkRequiresExpiry(@Param('businessType') businessType: string) {
    return {
      businessType,
      requiresExpiry: this.expiryService.requiresExpiryTracking(businessType),
    };
  }

  /**
   * Dispose an expired product (write-off)
   */
  @Post(':id/dispose')
  async disposeProduct(
    @Request() req: { user: { shopId: string; userId: string } },
    @Param('id') productId: string,
    @Body() body: { reason?: string; method?: string },
  ) {
    // This will be implemented with inventory adjustment service
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Product marked for disposal',
      productId,
      disposedBy: req.user.userId,
      reason: body.reason || 'Expired',
      method: body.method || 'write_off',
      timestamp: new Date().toISOString(),
    };
  }
}
