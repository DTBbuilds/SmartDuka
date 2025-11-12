import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { CreatePaymentReconciliationDto, GetReconciliationHistoryDto } from './dto/payment-reconciliation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentReconciliationController {
  constructor(private readonly reconciliationService: PaymentReconciliationService) {}

  @Post()
  @Roles('admin')
  async createReconciliation(
    @Body() dto: CreatePaymentReconciliationDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reconciliationService.reconcilePayments(
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
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
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
}
