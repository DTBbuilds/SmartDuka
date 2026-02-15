import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SuperAdminCommunicationsService } from './services/super-admin-communications.service';
import { SendManualEmailDto, CreateManualInvoiceDto } from './dto/communications.dto';
import { EmailService } from '../notifications/email.service';

/**
 * Super Admin Communications Controller
 * 
 * Endpoints for manual email sending and invoice generation:
 * - Send manual emails to shop owners
 * - Create manual invoices
 * - Resend invoice emails
 */
@Controller('super-admin/communications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminCommunicationsController {
  private readonly logger = new Logger(SuperAdminCommunicationsController.name);

  constructor(
    private readonly communicationsService: SuperAdminCommunicationsService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================
  // MANUAL EMAIL
  // ============================================

  /**
   * Get shops for email recipient selection
   */
  @Get('shops')
  async getShopsForEmail() {
    this.logger.log('Fetching shops for email recipient selection');
    return this.communicationsService.getShopsForEmail();
  }

  /**
   * Get shops missing email addresses
   */
  @Get('shops/missing-email')
  async getShopsMissingEmail() {
    this.logger.log('Fetching shops missing email addresses');
    return this.communicationsService.getShopsMissingEmail();
  }

  /**
   * Send manual email to shop owners
   */
  @Post('email/send')
  async sendManualEmail(
    @Body() dto: SendManualEmailDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Super admin ${user.email} sending manual email`);

    if (!dto.subject || !dto.htmlContent) {
      throw new BadRequestException('Subject and content are required');
    }

    if (dto.recipientType === 'shop' && (!dto.shopIds || dto.shopIds.length === 0)) {
      throw new BadRequestException('At least one shop must be selected');
    }

    if (dto.recipientType === 'custom' && (!dto.customEmails || dto.customEmails.length === 0)) {
      throw new BadRequestException('At least one email address is required');
    }

    return this.communicationsService.sendManualEmail(dto, user.sub, user.email);
  }

  /**
   * Preview email (returns formatted HTML)
   */
  @Post('email/preview')
  async previewEmail(@Body() body: { htmlContent: string }) {
    // Return HTML content wrapped in SmartDuka branded layout
    return {
      html: this.emailService.wrapInLayout(body.htmlContent),
    };
  }

  // ============================================
  // MANUAL INVOICES
  // ============================================

  /**
   * Get all invoices with shop details
   */
  @Get('invoices')
  async getInvoices(
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    this.logger.log('Fetching invoices with details');
    return this.communicationsService.getInvoicesWithDetails({
      status,
      shopId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Create a manual invoice
   */
  @Post('invoices')
  async createManualInvoice(
    @Body() dto: CreateManualInvoiceDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Super admin ${user.email} creating manual invoice`);

    if (!dto.shopId) {
      throw new BadRequestException('Shop ID is required');
    }

    if (!dto.description) {
      throw new BadRequestException('Description is required');
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Valid amount is required');
    }

    if (!dto.dueDate) {
      throw new BadRequestException('Due date is required');
    }

    return this.communicationsService.createManualInvoice(dto, user.sub, user.email);
  }

  /**
   * Resend invoice email
   */
  @Post('invoices/:id/send-email')
  async resendInvoiceEmail(
    @Param('id') invoiceId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Super admin ${user.email} resending invoice email for ${invoiceId}`);
    return this.communicationsService.resendInvoiceEmail(invoiceId, user.sub, user.email);
  }
}
