import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionControlsService } from './transaction-controls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transactions')
export class TransactionControlsController {
  constructor(private readonly transactionControlsService: TransactionControlsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('void')
  async voidTransaction(
    @Body()
    body: {
      orderId: string;
      voidReason: string;
    },
    @CurrentUser() user: any,
  ) {
    const order = await this.transactionControlsService.voidTransaction(
      body.orderId,
      user.shopId,
      body.voidReason,
      user.sub,
      true,
    );
    return order;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('discount')
  async applyDiscount(
    @Body()
    body: {
      orderId: string;
      discountAmount: number;
      discountReason: string;
    },
    @CurrentUser() user: any,
  ) {
    const order = await this.transactionControlsService.applyDiscount(
      body.orderId,
      user.shopId,
      body.discountAmount,
      body.discountReason,
      user.sub,
      true,
    );
    return order;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('refund')
  async processRefund(
    @Body()
    body: {
      orderId: string;
      refundAmount: number;
      refundReason: string;
    },
    @CurrentUser() user: any,
  ) {
    const order = await this.transactionControlsService.processRefund(
      body.orderId,
      user.shopId,
      body.refundAmount,
      body.refundReason,
      user.sub,
      true,
    );
    return order;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('voided')
  async getVoidedTransactions(
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.transactionControlsService.getVoidedTransactions(
      user.shopId,
      parseInt(limit, 10),
    );
    return transactions;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('refunded')
  async getRefundedTransactions(
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.transactionControlsService.getRefundedTransactions(
      user.shopId,
      parseInt(limit, 10),
    );
    return transactions;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('cashier/:cashierId')
  async getTransactionsByCashier(
    @Param('cashierId') cashierId: string,
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.transactionControlsService.getTransactionsByCashier(
      user.shopId,
      cashierId,
      parseInt(limit, 10),
    );
    return transactions;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('shift/:shiftId')
  async getShiftTransactions(
    @Param('shiftId') shiftId: string,
    @Query('limit') limit: string = '100',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.transactionControlsService.getShiftTransactions(
      user.shopId,
      shiftId,
      parseInt(limit, 10),
    );
    return transactions;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('stats/shop')
  async getTransactionStats(@CurrentUser() user: any) {
    const stats = await this.transactionControlsService.getTransactionStats(user.shopId);
    return stats;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('stats/cashier/:cashierId')
  async getCashierStats(
    @Param('cashierId') cashierId: string,
    @CurrentUser() user: any,
  ) {
    const stats = await this.transactionControlsService.getCashierStats(user.shopId, cashierId);
    return stats;
  }
}
