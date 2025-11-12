import { Body, Controller, Post, Get, Query, UseGuards, Res, Param } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { InitiateStkDto } from './dto/initiate-stk.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  // M-Pesa endpoints
  @UseGuards(JwtAuthGuard)
  @Post('stk-push')
  async initiateStkPush(@Body() dto: InitiateStkDto) {
    return this.paymentsService.initiateStkPush(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stk-status')
  async queryStkStatus(
    @Query('checkoutRequestId') checkoutRequestId: string,
    @Query('merchantRequestId') merchantRequestId: string,
  ) {
    return this.paymentsService.queryStkStatus(checkoutRequestId, merchantRequestId);
  }

  @Post('callback')
  async handleMpesaCallback(@Body() payload: any) {
    return this.paymentsService.handleCallback(payload);
  }

  // Payment transaction management endpoints
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('cashierId') cashierId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.paymentTransactionService.getTransactions(user.shopId, {
      method,
      status,
      cashierId,
      branchId,
      from,
      to,
      limit: limit ? parseInt(limit) : 100,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.paymentTransactionService.getStats(user.shopId, { from, to });
  }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  async exportTransactions(
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      const csvContent = await this.paymentTransactionService.exportTransactions(user.shopId, {
        from,
        to,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId/stats')
  async getCashierStats(
    @CurrentUser() user: JwtPayload,
    @Param('cashierId') cashierId: string,
  ) {
    return this.paymentTransactionService.getCashierStats(user.shopId, cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  async getOrderTransactions(@Param('orderId') orderId: string) {
    return this.paymentTransactionService.getTransactionsByOrderId(orderId);
  }
}
