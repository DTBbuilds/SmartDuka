import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto/messaging.dto';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  // ============ SHOP ADMIN ENDPOINTS ============

  // Create a new conversation (shop admin)
  @Post('conversations')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createConversation(@Request() req: any, @Body() dto: CreateConversationDto) {
    const conversation = await this.messagingService.createConversation(
      req.user.shopId,
      req.user.userId,
      dto,
    );

    // Notify super admins of new conversation
    this.messagingGateway.notifyNewConversation(conversation);

    return conversation;
  }

  // Get admin's conversations
  @Get('conversations')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminConversations(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getAdminConversations(req.user.shopId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Send a message (shop admin)
  @Post('messages')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async sendAdminMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    const message = await this.messagingService.sendMessage(
      req.user.shopId,
      req.user.userId,
      'admin',
      dto,
    );

    // Broadcast message via WebSocket
    this.messagingGateway.broadcastMessage(dto.conversationId, message, req.user);

    return message;
  }

  // Get messages for a conversation (shop admin)
  @Get('conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminMessages(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      req.user.userId,
      'admin',
      req.user.shopId,
      { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 },
    );
  }

  // Mark messages as read (shop admin)
  @Post('conversations/:id/read')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async markAdminMessagesRead(@Request() req: any, @Param('id') conversationId: string) {
    const result = await this.messagingService.markAsRead(conversationId, req.user.userId, 'admin');
    
    // Notify via WebSocket
    this.messagingGateway.notifyMessagesRead(conversationId, req.user.userId, 'admin');
    
    return result;
  }

  // Get unread count (shop admin)
  @Get('unread-count')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminUnreadCount(@Request() req: any) {
    return this.messagingService.getUnreadCount(req.user.userId, 'admin', req.user.shopId);
  }

  // ============ SUPER ADMIN ENDPOINTS ============

  // Get all conversations (super admin)
  @Get('super-admin/conversations')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async getSuperAdminConversations(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getSuperAdminConversations({
      status,
      priority,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Send a message (super admin)
  @Post('super-admin/messages')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async sendSuperAdminMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    const message = await this.messagingService.sendMessage(
      '', // Super admin doesn't have shopId
      req.user.userId,
      'super_admin',
      dto,
    );

    // Broadcast message via WebSocket
    this.messagingGateway.broadcastMessage(dto.conversationId, message, req.user);

    return message;
  }

  // Get messages for a conversation (super admin)
  @Get('super-admin/conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async getSuperAdminMessages(
    @Param('id') conversationId: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      req.user.userId,
      'super_admin',
      undefined,
      { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 },
    );
  }

  // Mark messages as read (super admin)
  @Post('super-admin/conversations/:id/read')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async markSuperAdminMessagesRead(@Request() req: any, @Param('id') conversationId: string) {
    const result = await this.messagingService.markAsRead(conversationId, req.user.userId, 'super_admin');
    
    // Notify via WebSocket
    this.messagingGateway.notifyMessagesRead(conversationId, req.user.userId, 'super_admin');
    
    return result;
  }

  // Update conversation (super admin - assign, change status, etc.)
  @Put('super-admin/conversations/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async updateConversation(
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.messagingService.updateConversation(conversationId, dto);
  }

  // Get unread count (super admin)
  @Get('super-admin/unread-count')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async getSuperAdminUnreadCount(@Request() req: any) {
    return this.messagingService.getUnreadCount(req.user.userId, 'super_admin');
  }
}
