import { Body, Controller, Get, Post, Put, Param, UseGuards, Query } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { CreateDailyReconciliationDto, GetReconciliationHistoryDto, InvestigateVarianceDto, ApproveReconciliationDto } from './dto/reconciliation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('financial/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post()
  @Roles('admin')
  async createReconciliation(
    @Body() dto: CreateDailyReconciliationDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reconciliationService.createDailyReconciliation(
      user.shopId,
      new Date(),
      dto.actualCash,
      user.sub,
      dto.reconciliationNotes,
    );
  }

  @Get('history')
  @Roles('admin')
  async getHistory(
    @Query() query: GetReconciliationHistoryDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.reconciliationService.getReconciliationHistory(user.shopId, startDate, endDate);
  }

  @Get('variance-report')
  @Roles('admin')
  async getVarianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }
    return this.reconciliationService.getVarianceReport(
      user.shopId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Put(':id/investigate')
  @Roles('admin')
  async investigateVariance(
    @Param('id') id: string,
    @Body() dto: InvestigateVarianceDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reconciliationService.investigateVariance(id, dto.varianceType, dto.investigationNotes);
  }

  @Put(':id/approve')
  @Roles('admin')
  async approveReconciliation(
    @Param('id') id: string,
    @Body() dto: ApproveReconciliationDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reconciliationService.approveReconciliation(id, user.sub);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@CurrentUser() user: Record<string, any>) {
    return this.reconciliationService.getReconciliationStats(user.shopId);
  }
}
