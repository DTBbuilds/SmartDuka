import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
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
      shopId: string;
      openingBalance: number;
    },
    @CurrentUser() user: any,
  ) {
    if (user.shopId !== body.shopId) {
      throw new Error('Unauthorized');
    }

    const shift = await this.shiftsService.clockIn(
      body.shopId,
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Get('current')
  async getCurrentShift(@CurrentUser() user: any) {
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
  @Roles('admin')
  @Get('status/:status')
  async getShiftsByStatus(
    @Param('status') status: 'open' | 'closed' | 'reconciled',
    @CurrentUser() user: any,
  ) {
    const shifts = await this.shiftsService.getShiftsByStatus(user.shopId, status);
    return shifts;
  }
}
