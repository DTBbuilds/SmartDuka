import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import type { CreateSupplierDto, UpdateSupplierDto } from './suppliers.service';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    return this.suppliersService.create(user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@CurrentUser() user: Record<string, any>) {
    return this.suppliersService.findAll(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActive(@CurrentUser() user: Record<string, any>) {
    return this.suppliersService.getActive(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: Record<string, any>) {
    return this.suppliersService.findById(id, user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.suppliersService.update(id, user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: Record<string, any>) {
    const deleted = await this.suppliersService.delete(id, user.shopId);
    return { deleted };
  }
}
