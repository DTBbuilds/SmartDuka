import { Body, Controller, Get, Param, Post, Query, UseGuards, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SalesService } from './sales.service';
import { ReceiptService } from './services/receipt.service';
import { InvoiceService } from './services/invoice.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { CreateReceiptDto } from './dto/receipt.dto';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly receiptService: ReceiptService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.salesService.getShopStats(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('today')
  async getTodaySales(@CurrentUser() user: any) {
    return this.salesService.getDailySales(user.shopId, new Date());
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier-stats')
  async getCashierStats(@CurrentUser() user: any) {
    return this.salesService.getCashierStats(user.shopId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cashier-stats/:cashierId')
  async getCashierStatsById(
    @Param('cashierId') cashierId: string,
    @CurrentUser() user: any,
  ) {
    return this.salesService.getCashierStats(user.shopId, cashierId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('all-cashier-stats')
  async getAllCashierStats(@CurrentUser() user: any) {
    return this.salesService.getAllCashierStats(user.shopId);
  }

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
  @Get('orders/analytics')
  async getOrdersAnalytics(@CurrentUser() user: any) {
    if (!user?.shopId) {
      console.error('[OrdersAnalytics] No shopId in user token:', user);
      throw new BadRequestException('Shop ID not found in authentication token. Please log in again.');
    }
    return this.salesService.getOrdersAnalytics(user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('profit/analytics')
  async getProfitAnalytics(
    @Query('range') range: string = 'month',
    @CurrentUser() user: any,
  ) {
    if (!user?.shopId) {
      throw new BadRequestException('Shop ID not found in authentication token.');
    }
    return this.salesService.getProfitAnalytics(user.shopId, range);
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
      throw new BadRequestException('Invalid date format. Please use YYYY-MM-DD format');
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
      throw new BadRequestException('Invalid date format. Please use YYYY-MM-DD format');
    }
    return this.salesService.getDailySalesByBranch(user.shopId, branchId, date);
  }

  // Analytics endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('analytics')
  async getSalesAnalytics(
    @Query('range') range: string = 'month',
    @CurrentUser() user: any,
  ) {
    return this.salesService.getSalesAnalytics(user.shopId, range);
  }

  // ==================== RECEIPT ENDPOINTS ====================

  @UseGuards(JwtAuthGuard)
  @Post('receipts')
  async createReceipt(@Body() dto: CreateReceiptDto, @CurrentUser() user: any) {
    return this.receiptService.createFromOrder(user.shopId, user.branchId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('receipts')
  async getReceipts(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('paymentMethod') paymentMethod: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptService.getReceipts(user.shopId, {
      from,
      to,
      paymentMethod,
      status,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('receipts/stats')
  async getReceiptStats(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptService.getStats(user.shopId, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('receipts/:id')
  async getReceipt(@Param('id') id: string, @CurrentUser() user: any) {
    return this.receiptService.getById(user.shopId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('receipts/order/:orderId')
  async getReceiptByOrder(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.receiptService.getByOrderId(user.shopId, orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('receipts/:id/text')
  async getReceiptText(
    @Param('id') id: string,
    @Query('width') width: string,
    @CurrentUser() user: any,
  ) {
    const receipt = await this.receiptService.getById(user.shopId, id);
    const w = width === '42' ? 42 : 32;
    return { text: this.receiptService.generateReceiptText(receipt, w) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('receipts/:id/reprint')
  async trackReprint(@Param('id') id: string, @CurrentUser() user: any) {
    return this.receiptService.trackReprint(user.shopId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('receipts/:id/void')
  async voidReceipt(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.receiptService.voidReceipt(user.shopId, id, user.sub, reason);
  }

  // ==================== INVOICE ENDPOINTS ====================

  @UseGuards(JwtAuthGuard)
  @Post('invoices')
  async createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    if (dto.orderId) {
      return this.invoiceService.createFromOrder(user.shopId, user.branchId, dto);
    }
    return this.invoiceService.create(user.shopId, user.branchId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices')
  async getInvoices(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('status') status: string,
    @Query('paymentStatus') paymentStatus: string,
    @Query('type') type: string,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @CurrentUser() user: any,
  ) {
    return this.invoiceService.getInvoices(user.shopId, {
      from,
      to,
      status,
      paymentStatus,
      type,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/stats')
  async getInvoiceStats(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
  ) {
    return this.invoiceService.getStats(user.shopId, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/overdue')
  async getOverdueInvoices(@CurrentUser() user: any) {
    return this.invoiceService.getOverdueInvoices(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    return this.invoiceService.getById(user.shopId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/:id/html')
  async getInvoiceHTML(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const invoice = await this.invoiceService.getById(user.shopId, id);
    const html = this.invoiceService.generateInvoiceHTML(invoice);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoices/:id/send')
  async sendInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    return this.invoiceService.sendInvoice(user.shopId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoices/:id/payment')
  async recordInvoicePayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.invoiceService.recordPayment(user.shopId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('invoices/:id/cancel')
  async cancelInvoice(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.invoiceService.cancelInvoice(user.shopId, id, reason);
  }
}
