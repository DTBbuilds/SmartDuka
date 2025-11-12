import { Body, Controller, Get, Post, Put, Param, UseGuards, Query } from '@nestjs/common';
import { StockTransferService } from './stock-transfer.service';
import { RequestStockTransferDto, ApproveStockTransferDto, RejectStockTransferDto, GetTransferHistoryDto } from './dto/stock-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory/stock-transfer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockTransferController {
  constructor(private readonly transferService: StockTransferService) {}

  @Post()
  @Roles('admin')
  async requestTransfer(
    @Body() dto: RequestStockTransferDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.transferService.requestTransfer(
      user.shopId,
      dto.fromLocationId,
      dto.toLocationId,
      dto.productId,
      dto.quantity,
      dto.reason,
      user.sub,
      dto.notes,
    );
  }

  @Put(':id/approve')
  @Roles('admin')
  async approveTransfer(
    @Param('id') id: string,
    @Body() dto: ApproveStockTransferDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.transferService.approveTransfer(id, user.sub);
  }

  @Put(':id/complete')
  @Roles('admin')
  async completeTransfer(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.transferService.completeTransfer(id);
  }

  @Put(':id/reject')
  @Roles('admin')
  async rejectTransfer(
    @Param('id') id: string,
    @Body() dto: RejectStockTransferDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.transferService.rejectTransfer(id, dto.reason);
  }

  @Get('history')
  @Roles('admin')
  async getHistory(
    @Query() query: GetTransferHistoryDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.transferService.getTransferHistory(user.shopId, query.locationId, query.status);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@CurrentUser() user: Record<string, any>) {
    return this.transferService.getTransferStats(user.shopId);
  }
}
