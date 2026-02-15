import { Body, Controller, Get, Post, Put, Param, UseGuards, Query } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post('program')
  @Roles('admin')
  async createProgram(
    @Body() dto: CreateLoyaltyProgramDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.createProgram(user.shopId, dto);
  }

  @Get('program')
  async getProgram(@CurrentUser() user: Record<string, any>) {
    return this.loyaltyService.getProgram(user.shopId);
  }

  @Put('program/:id')
  @Roles('admin')
  async updateProgram(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLoyaltyProgramDto>,
  ) {
    return this.loyaltyService.updateProgram(id, dto);
  }

  @Post('enroll/:customerId')
  @Roles('admin')
  async enrollCustomer(
    @Param('customerId') customerId: string,
    @Query('programId') programId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.enrollCustomer(user.shopId, customerId, programId);
  }

  @Post('earn/:customerId')
  @Roles('admin', 'cashier')
  async earnPoints(
    @Param('customerId') customerId: string,
    @Body() dto: { amount: number; reason?: string },
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.earnPoints(user.shopId, customerId, dto.amount, dto.reason);
  }

  @Post('redeem/:customerId')
  @Roles('admin', 'cashier')
  async redeemPoints(
    @Param('customerId') customerId: string,
    @Body() dto: { points: number },
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.redeemPoints(user.shopId, customerId, dto.points);
  }

  @Post('birthday-bonus/:customerId')
  async claimBirthdayBonus(
    @Param('customerId') customerId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.claimBirthdayBonus(user.shopId, customerId);
  }

  @Post('referral-bonus')
  async claimReferralBonus(
    @Body() dto: { referralCode: string },
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.claimReferralBonus(user.shopId, dto.referralCode);
  }

  @Get('account/:customerId')
  async getAccount(
    @Param('customerId') customerId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.getAccount(user.shopId, customerId);
  }

  @Get('accounts/customer/:customerId')
  async getAccountByCustomer(
    @Param('customerId') customerId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.getAccount(user.shopId, customerId);
  }

  @Post('auto-enroll/:customerId')
  @Roles('admin', 'cashier')
  async autoEnroll(
    @Param('customerId') customerId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.autoEnrollCustomer(user.shopId, customerId);
  }

  @Get('points-preview')
  @Roles('admin', 'cashier')
  async getPointsPreview(
    @Query('customerId') customerId: string,
    @Query('amount') amount: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.getPointsPreview(
      user.shopId,
      customerId,
      parseFloat(amount) || 0,
    );
  }

  @Get('recent-customers')
  @Roles('admin', 'cashier')
  async getRecentCustomers(
    @Query('limit') limit: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.getRecentLoyaltyCustomers(user.shopId, parseInt(limit) || 5);
  }

  @Get('top-customers')
  @Roles('admin')
  async getTopCustomers(
    @Query('limit') limit: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.loyaltyService.getTopCustomers(user.shopId, parseInt(limit) || 10);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@CurrentUser() user: Record<string, any>) {
    return this.loyaltyService.getLoyaltyStats(user.shopId);
  }
}
