import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: any) {
    // PHASE 3: Pass branchId from user context
    return this.salesService.checkout(user.shopId, user.sub, user.branchId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('orders')
  listOrders(@Query() query: OrdersQueryDto, @CurrentUser() user: any) {
    return this.salesService.listOrders(user.shopId, query.limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('orders/:id')
  findOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesService.findOrderById(user.shopId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('daily-sales/:date')
  dailySales(@Param('date') dateStr: string, @CurrentUser() user: any) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return this.salesService.getDailySales(user.shopId, date);
  }

  // PHASE 3: Branch-specific endpoints
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/orders')
  listOrdersByBranch(
    @Param('branchId') branchId: string,
    @Query() query: OrdersQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.salesService.listOrdersByBranch(user.shopId, branchId, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/daily-sales/:date')
  dailySalesByBranch(
    @Param('branchId') branchId: string,
    @Param('date') dateStr: string,
    @CurrentUser() user: any,
  ) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return this.salesService.getDailySalesByBranch(user.shopId, branchId, date);
  }
}
