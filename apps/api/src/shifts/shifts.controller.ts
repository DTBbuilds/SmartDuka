import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('clock-in')
  async clockIn(
    @Body()
    body: {
      shopId?: string;
      openingBalance: number;
    },
    @CurrentUser() user: any,
  ) {
    // Use shopId from JWT if available, otherwise from body
    const shopId = user.shopId || body.shopId;
    
    if (!shopId) {
      throw new ForbiddenException('No shop associated with your account');
    }

    // If body.shopId is provided, verify it matches user's shop
    if (body.shopId && user.shopId && body.shopId !== user.shopId) {
      throw new ForbiddenException('You are not allowed to clock in for this shop');
    }

    const shift = await this.shiftsService.clockIn(
      shopId,
      user.sub,
      user.name || user.email,
      body.openingBalance,
    );

    return shift;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Post('clock-out')
  async clockOut(
    @Body() body: { shiftId: string },
    @CurrentUser() user: any,
  ) {
    const shift = await this.shiftsService.clockOut(body.shiftId, user.shopId);
    return shift;
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentShift(@CurrentUser() user: any) {
    // Return null if user doesn't have required context
    // Skip role check here - any authenticated user can check their shift status
    if (!user.shopId || !user.sub) {
      return null;
    }
    // Only admin and cashier roles can have shifts
    if (user.role !== 'admin' && user.role !== 'cashier') {
      return null;
    }
    const shift = await this.shiftsService.getCurrentShift(user.shopId, user.sub);
    return shift || null;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get(':id')
  async getShift(
    @Param('id') shiftId: string,
    @CurrentUser() user: any,
  ) {
    const shift = await this.shiftsService.getShiftById(shiftId, user.shopId);
    return shift;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Put(':id/reconcile')
  async reconcileShift(
    @Param('id') shiftId: string,
    @Body()
    body: {
      actualCash: number;
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    const shift = await this.shiftsService.reconcileShift(
      shiftId,
      user.shopId,
      body.actualCash,
      user.sub,
      body.notes,
    );

    return shift;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('history/list')
  async getShiftHistory(
    @CurrentUser() user: any,
    @Query('limit') limit: string = '10',
    @Query('cashierId') cashierId?: string,
  ) {
    const shifts = await this.shiftsService.getShiftHistory(
      user.shopId,
      cashierId,
      parseInt(limit, 10),
    );
    return shifts;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get(':id/sales')
  async getShiftSales(
    @Param('id') shiftId: string,
    @CurrentUser() user: any,
  ) {
    const salesData = await this.shiftsService.getShiftSalesData(shiftId, user.shopId);
    return salesData;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('status/:status')
  async getShiftsByStatus(
    @Param('status') status: 'open' | 'closed' | 'reconciled',
    @CurrentUser() user: any,
  ) {
    const shifts = await this.shiftsService.getShiftsByStatus(user.shopId, status);
    return shifts;
  }

  /**
   * Record activity ping from cashier frontend
   * Called periodically to track active vs inactive time
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cashier')
  @Post(':id/activity-ping')
  async recordActivityPing(
    @Param('id') shiftId: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.recordActivityPing(
      shiftId,
      user.shopId,
      body.isActive,
    );
  }

  /**
   * Start a break period
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cashier')
  @Post(':id/break/start')
  async startBreak(
    @Param('id') shiftId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.recordBreak(shiftId, user.shopId, body.reason);
  }

  /**
   * End a break period
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cashier')
  @Post(':id/break/end')
  async endBreak(
    @Param('id') shiftId: string,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.endBreak(shiftId, user.shopId);
  }

  /**
   * Get detailed shift statistics with activity breakdown
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get(':id/stats')
  async getShiftStats(
    @Param('id') shiftId: string,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.getShiftStats(shiftId, user.shopId);
  }

  /**
   * Get cashier shift summary (for admin cashier management)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cashier/:cashierId/summary')
  async getCashierShiftSummary(
    @Param('cashierId') cashierId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftsService.getCashierShiftSummary(
      user.shopId,
      cashierId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
