import { Controller, Get, Put, Delete, Post, Query, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Get pending shops
   */
  @Get('shops/pending')
  async getPendingShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getPendingShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getPendingShopsCount();
    return { shops, count };
  }

  /**
   * Get verified shops
   */
  @Get('shops/verified')
  async getVerifiedShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getVerifiedShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getVerifiedShopsCount();
    return { shops, count };
  }

  /**
   * Get active shops
   */
  @Get('shops/active')
  async getActiveShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getActiveShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getActiveShopsCount();
    return { shops, count };
  }

  /**
   * Get suspended shops
   */
  @Get('shops/suspended')
  async getSuspendedShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getSuspendedShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getSuspendedShopsCount();
    return { shops, count };
  }

  /**
   * Get flagged shops
   */
  @Get('shops/flagged')
  async getFlaggedShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getFlaggedShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getFlaggedShopsCount();
    return { shops, count };
  }

  /**
   * Get all shops (must be before :id route)
   */
  @Get('shops')
  async getAllShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @Query('status') status?: string,
  ) {
    const shops = await this.superAdminService.getAllShops(parseInt(limit), parseInt(skip), status);
    const count = await this.superAdminService.getAllShopsCount(status);
    return { shops, count };
  }

  /**
   * Get shop details
   */
  @Get('shops/:id')
  async getShopDetails(@Param('id') shopId: string) {
    return this.superAdminService.getShopDetails(shopId);
  }

  /**
   * Get shop statistics
   */
  @Get('shops/:id/stats')
  async getShopStats(@Param('id') shopId: string) {
    return this.superAdminService.getShopStats(shopId);
  }

  /**
   * Get shop audit log
   */
  @Get('shops/:id/audit-log')
  async getShopAuditLog(
    @Param('id') shopId: string,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    return this.superAdminService.getShopAuditLog(shopId, parseInt(limit), parseInt(skip));
  }

  /**
   * Get verification history
   */
  @Get('shops/:id/verification-history')
  async getVerificationHistory(@Param('id') shopId: string) {
    return this.superAdminService.getVerificationHistory(shopId);
  }

  /**
   * Verify a shop
   */
  @Put('shops/:id/verify')
  async verifyShop(
    @Param('id') shopId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.superAdminService.verifyShop(shopId, user.sub, body.notes);
  }

  /**
   * Reject a shop
   */
  @Put('shops/:id/reject')
  async rejectShop(
    @Param('id') shopId: string,
    @Body() body: { reason: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.reason) {
      throw new BadRequestException('Rejection reason is required');
    }
    return this.superAdminService.rejectShop(shopId, user.sub, body.reason, body.notes);
  }

  /**
   * Suspend a shop
   */
  @Put('shops/:id/suspend')
  async suspendShop(
    @Param('id') shopId: string,
    @Body() body: { reason: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.reason) {
      throw new BadRequestException('Suspension reason is required');
    }
    return this.superAdminService.suspendShop(shopId, user.sub, body.reason, body.notes);
  }

  /**
   * Reactivate a shop
   */
  @Put('shops/:id/reactivate')
  async reactivateShop(
    @Param('id') shopId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.superAdminService.reactivateShop(shopId, user.sub, body.notes);
  }

  /**
   * Flag a shop for review
   */
  @Put('shops/:id/flag')
  async flagShop(
    @Param('id') shopId: string,
    @Body() body: { reason: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.reason) {
      throw new BadRequestException('Flag reason is required');
    }
    return this.superAdminService.flagShop(shopId, user.sub, body.reason, body.notes);
  }

  /**
   * Unflag a shop
   */
  @Put('shops/:id/unflag')
  async unflagShop(
    @Param('id') shopId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.superAdminService.unflagShop(shopId, user.sub, body.notes);
  }

  /**
   * Get dashboard stats
   */
  @Get('dashboard/stats')
  async getDashboardStats() {
    const pending = await this.superAdminService.getPendingShopsCount();
    const verified = await this.superAdminService.getVerifiedShopsCount();
    const active = await this.superAdminService.getActiveShopsCount();
    const suspended = await this.superAdminService.getSuspendedShopsCount();
    const flagged = await this.superAdminService.getFlaggedShopsCount();
    const deleted = await this.superAdminService.getDeletedShopsCount();

    return {
      pending,
      verified,
      active,
      suspended,
      flagged,
      deleted,
      total: pending + verified + active + suspended,
    };
  }

  /**
   * Soft delete a shop
   * This marks the shop as deleted without removing data from the database
   */
  @Delete('shops/:id')
  async deleteShop(
    @Param('id') shopId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('Deletion reason is required');
    }
    return this.superAdminService.softDeleteShop(shopId, user.sub, body.reason);
  }

  /**
   * Restore a soft-deleted shop
   */
  @Post('shops/:id/restore')
  async restoreShop(
    @Param('id') shopId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.superAdminService.restoreShop(shopId, user.sub, body.notes);
  }

  /**
   * Get deleted shops
   */
  @Get('shops-deleted')
  async getDeletedShops(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const shops = await this.superAdminService.getDeletedShops(parseInt(limit), parseInt(skip));
    const count = await this.superAdminService.getDeletedShopsCount();
    return { shops, count };
  }

  /**
   * Process expired subscriptions
   * Updates status and sends reminder emails to all expired/suspended shops
   */
  @Post('subscriptions/process-expired')
  async processExpiredSubscriptions(@CurrentUser() user: any) {
    return this.superAdminService.processExpiredSubscriptions(user.sub);
  }

  /**
   * Get subscription statistics
   */
  @Get('subscriptions/stats')
  async getSubscriptionStats() {
    return this.superAdminService.getSubscriptionStats();
  }
}
