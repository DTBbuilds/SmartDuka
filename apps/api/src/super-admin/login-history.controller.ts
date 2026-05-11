import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoginHistoryService } from './services/login-history.service';

@ApiTags('Super Admin - Login History')
@Controller('super-admin/login-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@ApiBearerAuth()
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get login history with filters' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by email (partial match)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (admin, manager, cashier)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (success, failed, otp_required)' })
  @ApiQuery({ name: 'loginMethod', required: false, description: 'Filter by method (password, google)' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO format)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip (default: 0)' })
  async getLoginHistory(
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('loginMethod') loginMethod?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.loginHistoryService.getLoginHistory(
      {
        userId,
        email,
        role,
        status,
        loginMethod,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
      {
        limit,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get login statistics for the last 30 days' })
  async getLoginStats() {
    return this.loginHistoryService.getLoginStats(30);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent login attempts' })
  async getRecentLogins(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.loginHistoryService.getRecentLogins(limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get login history for a specific user' })
  async getUserLoginHistory(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.loginHistoryService.getUserLoginHistory(userId, limit);
  }
}
