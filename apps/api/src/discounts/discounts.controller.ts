import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @Roles('admin')
  async create(
    @Body() dto: CreateDiscountDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.create(user.shopId, dto);
  }

  @Get()
  async findAll(
    @Query('status') status: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.findAll(user.shopId, status);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.discountsService.findById(id);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.discountsService.delete(id);
  }

  @Post('apply')
  async applyDiscount(
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.applyDiscount(user.shopId, dto);
  }

  @Get('audit/log')
  @Roles('admin')
  async getAuditLog(
    @Query('discountId') discountId: string,
    @Query('appliedBy') appliedBy: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.getAuditLog(user.shopId, {
      discountId,
      appliedBy,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('audit/:id/approve')
  @Roles('admin')
  async approveDiscount(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.approveDiscount(id, user.userId);
  }

  @Post('audit/:id/reject')
  @Roles('admin')
  async rejectDiscount(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.discountsService.rejectDiscount(id, user.userId);
  }
}
