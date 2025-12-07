import { Controller, Get, Post, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: Record<string, any>,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.notificationsService.findByShop(user.shopId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: Record<string, any>) {
    const count = await this.notificationsService.getUnreadCount(user.shopId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.notificationsService.markAsRead(id, user.shopId);
  }

  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: Record<string, any>) {
    const count = await this.notificationsService.markAllAsRead(user.shopId);
    return { markedAsRead: count };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    const deleted = await this.notificationsService.delete(id, user.shopId);
    return { deleted };
  }
}
