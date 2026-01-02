import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockTransferService } from '../services/stock-transfer.service';
import type { CreateTransferDto, ReceiveItemDto } from '../services/stock-transfer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('stock-transfers')
@UseGuards(JwtAuthGuard)
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  /**
   * Create a new stock transfer request
   * POST /stock-transfers
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Post()
  async create(@Body() dto: CreateTransferDto, @CurrentUser() user: any) {
    const transfer = await this.stockTransferService.create(
      user.shopId,
      user.sub,
      dto,
    );
    return {
      success: true,
      message: 'Stock transfer request created',
      data: transfer,
    };
  }

  /**
   * Get all transfers for shop
   * GET /stock-transfers
   */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('fromBranchId') fromBranchId?: string,
    @Query('toBranchId') toBranchId?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.stockTransferService.findByShop(
      user.shopId,
      { status, fromBranchId, toBranchId, priority },
      { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 },
    );
    return {
      success: true,
      data: result.transfers,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    };
  }

  /**
   * Get transfers for a specific branch
   * GET /stock-transfers/branch/:branchId
   */
  @Get('branch/:branchId')
  async findByBranch(
    @Param('branchId') branchId: string,
    @Query('direction') direction: 'incoming' | 'outgoing' | 'all',
    @CurrentUser() user: any,
  ) {
    const transfers = await this.stockTransferService.findByBranch(
      user.shopId,
      branchId,
      direction || 'all',
    );
    return {
      success: true,
      data: transfers,
      count: transfers.length,
    };
  }

  /**
   * Get transfer statistics
   * GET /stock-transfers/stats
   */
  @Get('stats')
  async getStats(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    const stats = await this.stockTransferService.getStats(user.shopId, branchId);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get single transfer
   * GET /stock-transfers/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const transfer = await this.stockTransferService.findById(id, user.shopId);
    return {
      success: true,
      data: transfer,
    };
  }

  /**
   * Approve a transfer
   * POST /stock-transfers/:id/approve
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    const transfer = await this.stockTransferService.approve(
      id,
      user.shopId,
      user.sub,
      notes,
    );
    return {
      success: true,
      message: 'Transfer approved',
      data: transfer,
    };
  }

  /**
   * Reject a transfer
   * POST /stock-transfers/:id/reject
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    if (!reason) {
      return { success: false, message: 'Rejection reason is required' };
    }
    const transfer = await this.stockTransferService.reject(
      id,
      user.shopId,
      user.sub,
      reason,
    );
    return {
      success: true,
      message: 'Transfer rejected',
      data: transfer,
    };
  }

  /**
   * Ship a transfer (mark as in transit)
   * POST /stock-transfers/:id/ship
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Post(':id/ship')
  async ship(
    @Param('id') id: string,
    @Body() body: { trackingNumber?: string; carrier?: string },
    @CurrentUser() user: any,
  ) {
    const transfer = await this.stockTransferService.ship(
      id,
      user.shopId,
      user.sub,
      body,
    );
    return {
      success: true,
      message: 'Transfer shipped',
      data: transfer,
    };
  }

  /**
   * Receive a transfer
   * POST /stock-transfers/:id/receive
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager', 'cashier')
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() body: { items: ReceiveItemDto[]; notes?: string },
    @CurrentUser() user: any,
  ) {
    const transfer = await this.stockTransferService.receive(
      id,
      user.shopId,
      user.sub,
      body.items,
      body.notes,
    );
    return {
      success: true,
      message: transfer.status === 'received' ? 'Transfer fully received' : 'Transfer partially received',
      data: transfer,
    };
  }

  /**
   * Cancel a transfer
   * POST /stock-transfers/:id/cancel
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    if (!reason) {
      return { success: false, message: 'Cancellation reason is required' };
    }
    const transfer = await this.stockTransferService.cancel(
      id,
      user.shopId,
      user.sub,
      reason,
    );
    return {
      success: true,
      message: 'Transfer cancelled',
      data: transfer,
    };
  }
}
