import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Create a support ticket (shop admin only)
   */
  @Post('tickets')
  async createTicket(
    @Body() body: { subject: string; description: string; priority?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.subject || !body.description) {
      throw new BadRequestException('Subject and description are required');
    }

    return this.supportService.createTicket({
      shopId: user.shopId,
      createdBy: user.sub,
      subject: body.subject,
      description: body.description,
      priority: body.priority as any,
    });
  }

  /**
   * Get shop tickets (shop admin only)
   */
  @Get('tickets')
  async getShopTickets(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @CurrentUser() user: any,
  ) {
    const tickets = await this.supportService.getShopTickets(
      user.shopId,
      parseInt(limit),
      parseInt(skip),
    );
    const count = await this.supportService.getShopOpenTicketsCount(user.shopId);
    return { tickets, count };
  }

  /**
   * Get ticket by ID (shop admin or super admin)
   */
  @Get('tickets/:id')
  async getTicketById(@Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId);
  }

  /**
   * Add message to ticket (shop admin or super admin)
   */
  @Post('tickets/:id/messages')
  async addMessage(
    @Param('id') ticketId: string,
    @Body() body: { message: string },
    @CurrentUser() user: any,
  ) {
    if (!body.message) {
      throw new BadRequestException('Message is required');
    }

    return this.supportService.addMessage(ticketId, {
      sender: user.sub,
      message: body.message,
    });
  }

  /**
   * Super admin endpoints
   */

  /**
   * Get all support tickets (super admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Get('admin/tickets')
  async getAllTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const tickets = await this.supportService.getTickets(
      { status, priority },
      parseInt(limit),
      parseInt(skip),
    );
    const count = await this.supportService.getOpenTicketsCount();
    return { tickets, count };
  }

  /**
   * Update ticket status (super admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Put('admin/tickets/:id/status')
  async updateTicketStatus(
    @Param('id') ticketId: string,
    @Body() body: { status: string; resolutionNotes?: string },
  ) {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }

    return this.supportService.updateStatus(
      ticketId,
      body.status as any,
      body.resolutionNotes,
    );
  }

  /**
   * Assign ticket to super admin (super admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Put('admin/tickets/:id/assign')
  async assignTicket(
    @Param('id') ticketId: string,
    @Body() body: { assignedTo: string },
    @CurrentUser() user: any,
  ) {
    if (!body.assignedTo) {
      throw new BadRequestException('Assigned to is required');
    }

    return this.supportService.assignTicket(ticketId, body.assignedTo);
  }

  /**
   * Get assigned tickets (super admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Get('admin/tickets/assigned/me')
  async getAssignedTickets(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @CurrentUser() user: any,
  ) {
    const tickets = await this.supportService.getTickets(
      { assignedTo: user.sub },
      parseInt(limit),
      parseInt(skip),
    );
    const count = await this.supportService.getAssignedTicketsCount(user.sub);
    return { tickets, count };
  }
}
