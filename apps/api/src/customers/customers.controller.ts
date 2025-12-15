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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.customersService.create(user.shopId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: Record<string, any>,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
  ) {
    // Use paginated version if page param is provided
    if (page) {
      return this.customersService.findAllPaginated(
        user.shopId,
        parseInt(page, 10) || 1,
        parseInt(limit || '20', 10),
        search || undefined,
        segment || undefined,
      );
    }
    // Fallback to legacy method for backward compatibility
    return this.customersService.findAll(user.shopId);
  }

  @Get('search/query')
  async search(
    @Query('q') query: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.customersService.search(user.shopId, query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Get(':id/insights')
  async getInsights(@Param('id') id: string) {
    return this.customersService.getCustomerInsights(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }
}
