import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionControlsService } from './transaction-controls.service';
import { ShiftsService } from '../shifts/shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';

@Controller('transactions')
export class TransactionControlsController {
  constructor(
    private readonly transactionControlsService: TransactionControlsService,
    private readonly shiftsService: ShiftsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('void')
  async voidTransaction(
    @Body()
    body: {
      orderId: string;
      voidOperationId?: string;
      voidReason: string;
    },
    @CurrentUser() user: any,
  ) {
    // Actor + tenant always come from the authenticated token — body identity
    // fields are never trusted for authority.
    return this.transactionControlsService.voidTransaction(
      body.orderId,
      user.shopId,
      { voidOperationId: body.voidOperationId, voidReason: body.voidReason },
      user.sub,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('discount')
  async applyDiscount(
    @Body()
    body: {
      orderId: string;
      discountOperationId?: string;
      discountAmount: number;
      discountReason: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.transactionControlsService.applyDiscount(
      body.orderId,
      user.shopId,
      {
        discountOperationId: body.discountOperationId,
        discountAmount: body.discountAmount,
        discountReason: body.discountReason,
      },
      user.sub,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('refund')
  async processRefund(
    @Body()
    body: {
      orderId: string;
      refundOperationId?: string;
      refundAmount: number;
      refundReason: string;
      allocations?: { method: string; amount: number }[];
    },
    @CurrentUser() user: any,
  ) {
    return this.transactionControlsService.processRefund(
      body.orderId,
      user.shopId,
      {
        refundOperationId: body.refundOperationId,
        refundAmount: body.refundAmount,
        refundReason: body.refundReason,
        allocations: body.allocations,
      },
      user.sub,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('voided')
  async getVoidedTransactions(
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions =
      await this.transactionControlsService.getVoidedTransactions(
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
    const transactions =
      await this.transactionControlsService.getRefundedTransactions(
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
    // CASHIER-P0 F-11: cashiers may only view their own transaction record;
    // admins may view any cashier in the shop.
    if (user.role !== 'admin' && cashierId !== user.sub) {
      throw new ForbiddenException(
        'You can only view your own transaction record',
      );
    }
    const transactions =
      await this.transactionControlsService.getTransactionsByCashier(
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
    // CASHIER-P0 F-11: cashiers may only view transactions of their OWN
    // shift; admins may view any shift in the shop.
    if (user.role !== 'admin') {
      const shift = await this.shiftsService.getShiftById(shiftId, user.shopId);
      if (!shift || shift.cashierId?.toString() !== user.sub) {
        throw new ForbiddenException(
          'You can only view transactions for your own shift',
        );
      }
    }
    const transactions =
      await this.transactionControlsService.getShiftTransactions(
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
    const stats = await this.transactionControlsService.getTransactionStats(
      user.shopId,
    );
    return stats;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('stats/cashier/:cashierId')
  async getCashierStats(
    @Param('cashierId') cashierId: string,
    @CurrentUser() user: any,
  ) {
    const stats = await this.transactionControlsService.getCashierStats(
      user.shopId,
      cashierId,
    );
    return stats;
  }
}
