import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  async createReturn(
    @Body() dto: CreateReturnDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.returnsService.createReturn(user.shopId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.returnsService.findAll(user.shopId);
  }

  @Get('pending')
  @Roles('admin')
  async getPendingReturns(
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.returnsService.getPendingReturns(user.shopId);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.returnsService.getReturnStats(user.shopId);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.returnsService.getReturnHistory(user.shopId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.returnsService.findById(id);
  }

  @Put(':id/approve')
  @Roles('admin')
  async approveReturn(
    @Param('id') id: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnsService.approveReturn(id, dto.approvedBy, dto.approvalNotes);
  }

  @Put(':id/reject')
  @Roles('admin')
  async rejectReturn(
    @Param('id') id: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnsService.rejectReturn(id, dto.approvedBy, dto.approvalNotes);
  }

  @Put(':id/complete')
  @Roles('admin')
  async completeReturn(@Param('id') id: string) {
    return this.returnsService.completeReturn(id);
  }
}
