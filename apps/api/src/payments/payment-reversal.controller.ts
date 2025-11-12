import { Body, Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { PaymentReversalService } from './payment-reversal.service';
import { ReversePaymentDto, GetReversalHistoryDto } from './dto/payment-reversal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments/reversal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentReversalController {
  constructor(private readonly reversalService: PaymentReversalService) {}

  @Post()
  @Roles('admin')
  async reversePayment(
    @Body() dto: ReversePaymentDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reversalService.reversePayment(
      user.shopId,
      dto.orderId,
      dto.paymentId,
      dto.reason,
      user.sub,
      dto.notes,
    );
  }

  @Get('history')
  @Roles('admin')
  async getHistory(
    @Query() query: GetReversalHistoryDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.reversalService.getReversalHistory(user.shopId, startDate, endDate);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@CurrentUser() user: Record<string, any>) {
    return this.reversalService.getReversalStats(user.shopId);
  }
}
