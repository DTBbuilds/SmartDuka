import { Body, Controller, Get, Post, Put, Delete, Param, UseGuards } from '@nestjs/common';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor() {}

  @Post()
  @Roles('admin')
  async createLocation(
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Implementation will use LocationService
    return { message: 'Location created', data: dto };
  }

  @Get()
  @Roles('admin')
  async listLocations(@CurrentUser() user: Record<string, any>) {
    // Implementation will use LocationService
    return { message: 'Locations retrieved' };
  }

  @Get(':id')
  @Roles('admin')
  async getLocation(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Implementation will use LocationService
    return { message: 'Location retrieved', id };
  }

  @Put(':id')
  @Roles('admin')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Implementation will use LocationService
    return { message: 'Location updated', id, data: dto };
  }

  @Delete(':id')
  @Roles('admin')
  async deleteLocation(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Implementation will use LocationService
    return { message: 'Location deleted', id };
  }

  @Get(':id/stats')
  @Roles('admin')
  async getLocationStats(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Implementation will use LocationService
    return { message: 'Location stats retrieved', id };
  }
}
