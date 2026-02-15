import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { CreateAdjustmentDto } from './adjustments.service';
import { AdjustmentsService } from './adjustments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('stock/adjustments')
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    return this.adjustmentsService.create(user.shopId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@CurrentUser() user: Record<string, any>) {
    return this.adjustmentsService.findAll(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.adjustmentsService.findByProduct(productId, user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reason/:reason')
  async findByReason(
    @Param('reason') reason: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.adjustmentsService.findByReason(reason, user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@CurrentUser() user: Record<string, any>) {
    return this.adjustmentsService.getAdjustmentSummary(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recent')
  async getRecent(
    @Query('days') days: string = '7',
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.adjustmentsService.getRecentAdjustments(user.shopId, parseInt(days, 10));
  }
}
