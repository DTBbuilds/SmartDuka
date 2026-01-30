import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WhatsAppService } from './services/whatsapp.service';
import { WhatsAppProviderService } from './services/whatsapp-provider.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  UpdateWhatsAppConfigDto,
  VerifyPhoneDto,
  ConfirmVerificationDto,
  MetaWebhookDto,
} from './dto';

// Type for Meta webhook value structure
type MetaWebhookValue = {
  statuses?: Array<{ id: string; status: string; timestamp: string; errors?: Array<{ title?: string }> }>;
  messages?: Array<{ from?: string; type?: string; text?: { body?: string } }>;
};

/**
 * WhatsApp Controller
 * 
 * Handles WhatsApp configuration, verification, and webhooks.
 */
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly providerService: WhatsAppProviderService,
  ) {}

  // ==================== CONFIGURATION ====================

  /**
   * Get WhatsApp configuration for current shop
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getConfig(@CurrentUser() user: JwtPayload) {
    const config = await this.whatsAppService.getConfig(user.shopId);
    return {
      success: true,
      data: config ? {
        adminPhone: config.adminPhone,
        isOptedIn: config.isOptedIn,
        isVerified: config.isVerified,
        reportSchedule: config.reportSchedule,
        alertPreferences: config.alertPreferences,
        deliveryChannel: config.deliveryChannel,
        quietHours: config.quietHours,
        maxMessagesPerDay: config.maxMessagesPerDay,
        totalMessagesSent: config.totalMessagesSent,
        totalMessagesDelivered: config.totalMessagesDelivered,
      } : null,
    };
  }

  /**
   * Update WhatsApp configuration
   */
  @Patch('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateWhatsAppConfigDto,
  ) {
    const config = await this.whatsAppService.upsertConfig(user.shopId, dto as any);
    return {
      success: true,
      data: config,
    };
  }

  // ==================== PHONE VERIFICATION ====================

  /**
   * Send verification OTP to phone number
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyPhoneDto,
  ) {
    // Get shop name for the OTP message
    const shopName = 'Your Shop'; // TODO: Fetch from shop service
    
    const result = await this.whatsAppService.sendVerificationOtp(
      user.shopId,
      dto.phoneNumber,
      shopName,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      message: 'Verification code sent to WhatsApp',
    };
  }

  /**
   * Confirm verification OTP
   */
  @Post('confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async confirmVerification(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmVerificationDto,
  ) {
    const result = await this.whatsAppService.confirmVerification(user.shopId, dto.otp);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      message: 'WhatsApp number verified successfully',
    };
  }

  /**
   * Opt out of WhatsApp messages
   */
  @Post('opt-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async optOut(@CurrentUser() user: JwtPayload) {
    await this.whatsAppService.optOut(user.shopId);
    return {
      success: true,
      message: 'Opted out of WhatsApp messages',
    };
  }

  // ==================== MESSAGE HISTORY ====================

  /**
   * Get message history
   */
  @Get('messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const messages = await this.whatsAppService.getMessageHistory(user.shopId, {
      category,
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
    });

    return {
      success: true,
      data: messages,
    };
  }

  /**
   * Get message statistics
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    const stats = await this.whatsAppService.getMessageStats(
      user.shopId,
      days ? parseInt(days, 10) : 30,
    );

    return {
      success: true,
      data: stats,
    };
  }

  // ==================== TEST MESSAGE ====================

  /**
   * Send a test message (admin only)
   */
  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async sendTestMessage(@CurrentUser() user: JwtPayload) {
    const config = await this.whatsAppService.getConfig(user.shopId);

    if (!config?.isVerified || !config?.adminPhone) {
      return {
        success: false,
        error: 'WhatsApp not configured or verified',
      };
    }

    const testMessage = `✅ *SmartDuka Test Message*

This is a test message from SmartDuka.
Your WhatsApp integration is working correctly!

📅 ${new Date().toLocaleString('en-KE')}

━━━━━━━━━━━━━━━━━━
_SmartDuka POS_`;

    await this.whatsAppService.queueMessage(
      user.shopId,
      config.adminPhone,
      testMessage,
      'test',
    );

    return {
      success: true,
      message: 'Test message queued for delivery',
    };
  }

  // ==================== PROVIDER STATUS ====================

  /**
   * Get provider status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getProviderStatus() {
    return {
      success: true,
      data: {
        available: this.providerService.isAvailable(),
        provider: this.providerService.getProviderName(),
      },
    };
  }

  // ==================== WEBHOOKS ====================

  /**
   * Meta WhatsApp webhook verification (GET)
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const metaProvider = this.providerService.getMetaProvider();
    const result = metaProvider.verifyWebhookChallenge(mode, token, challenge);

    if (result) {
      return result;
    }

    return 'Verification failed';
  }

  /**
   * Meta WhatsApp webhook (POST)
   * Receives message status updates and incoming messages
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: MetaWebhookDto,
  ) {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature && req.rawBody) {
      const isValid = this.providerService.verifyWebhookSignature(
        req.rawBody.toString(),
        signature,
        'meta',
      );
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { success: false };
      }
    }

    // Process webhook
    try {
      await this.processMetaWebhook(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook processing error: ${message}`);
    }

    return { success: true };
  }

  private async processMetaWebhook(body: MetaWebhookDto): Promise<void> {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value as MetaWebhookValue;

        // Handle status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            const statusType = status.status as 'delivered' | 'read' | 'failed';
            await this.whatsAppService.updateMessageStatus(
              status.id,
              statusType,
              new Date(parseInt(status.timestamp) * 1000),
              status.errors?.[0]?.title,
            );
          }
        }

        // Handle incoming messages (e.g., STOP to unsubscribe)
        if (value.messages) {
          for (const msg of value.messages) {
            if (msg.type === 'text' && msg.text?.body) {
              const text = msg.text.body.toUpperCase().trim();
              if (text === 'STOP' || text === 'UNSUBSCRIBE') {
                this.logger.log(`Opt-out request from ${msg.from}`);
                // TODO: Find shop by phone and opt out
              }
            }
          }
        }
      }
    }
  }
}
