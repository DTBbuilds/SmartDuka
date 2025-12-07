import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaymentConfigService } from './services/payment-config.service';
import {
  CreatePaymentConfigDto,
  UpdatePaymentConfigDto,
  ListPaymentConfigsDto,
  RotateCredentialsDto,
  DeactivateConfigDto,
  DeleteConfigDto,
  PaymentConfigResponseDto,
} from './dto/payment-config.dto';
import { PaymentProvider, ConfigEnvironment } from './schemas/payment-config.schema';

/**
 * Payment Configuration Controller
 * 
 * Manages payment configurations (tills, paybills) for shops.
 * Supports:
 * - Multiple configurations per shop
 * - Branch-level overrides
 * - Multiple providers (M-Pesa, Airtel, etc.)
 * - Sandbox and production environments
 */
@Controller('payments/configs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentConfigController {
  private readonly logger = new Logger(PaymentConfigController.name);

  constructor(private readonly paymentConfigService: PaymentConfigService) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * List all payment configurations for the shop
   * GET /api/payments/configs
   */
  @Get()
  @Roles('admin', 'branch_admin', 'branch_manager')
  async listConfigs(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPaymentConfigsDto,
  ) {
    const configs = await this.paymentConfigService.listConfigs(user.shopId, {
      provider: query.provider,
      environment: query.environment,
      status: query.status,
      branchId: query.branchId,
      isActive: query.isActive,
    });

    return {
      success: true,
      data: configs.map(c => PaymentConfigResponseDto.fromDocument(c)),
      count: configs.length,
    };
  }

  /**
   * Get a specific payment configuration
   * GET /api/payments/configs/:id
   */
  @Get(':id')
  @Roles('admin', 'branch_admin', 'branch_manager')
  async getConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const config = await this.paymentConfigService.getConfig(user.shopId, id);

    return {
      success: true,
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Create a new payment configuration
   * POST /api/payments/configs
   */
  @Post()
  @Roles('admin')
  async createConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentConfigDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Creating payment config for shop ${user.shopId}`);

    const config = await this.paymentConfigService.createConfig(
      user.shopId,
      user.sub,
      dto,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration created. Please verify your credentials.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Update a payment configuration
   * PUT /api/payments/configs/:id
   */
  @Put(':id')
  @Roles('admin')
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentConfigDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Updating payment config ${id} for shop ${user.shopId}`);

    const config = await this.paymentConfigService.updateConfig(
      user.shopId,
      id,
      user.sub,
      dto,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration updated.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Delete a payment configuration
   * DELETE /api/payments/configs/:id
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deleteConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DeleteConfigDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Deleting payment config ${id} for shop ${user.shopId}`);

    await this.paymentConfigService.deleteConfig(
      user.shopId,
      id,
      user.sub,
      dto.reason,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration deleted.',
    };
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Activate a payment configuration
   * POST /api/payments/configs/:id/activate
   */
  @Post(':id/activate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async activateConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.logger.log(`Activating payment config ${id} for shop ${user.shopId}`);

    const config = await this.paymentConfigService.activateConfig(
      user.shopId,
      id,
      user.sub,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration activated.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Deactivate a payment configuration
   * POST /api/payments/configs/:id/deactivate
   */
  @Post(':id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deactivateConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DeactivateConfigDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Deactivating payment config ${id} for shop ${user.shopId}`);

    const config = await this.paymentConfigService.deactivateConfig(
      user.shopId,
      id,
      user.sub,
      dto.reason,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration deactivated.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Set a configuration as the default for its provider
   * POST /api/payments/configs/:id/set-default
   */
  @Post(':id/set-default')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async setDefaultConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.logger.log(`Setting payment config ${id} as default for shop ${user.shopId}`);

    const config = await this.paymentConfigService.setDefaultConfig(
      user.shopId,
      id,
      user.sub,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Payment configuration set as default.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  // ============================================
  // VERIFICATION
  // ============================================

  /**
   * Verify credentials for a payment configuration
   * POST /api/payments/configs/:id/verify
   */
  @Post(':id/verify')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async verifyConfig(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.logger.log(`Verifying payment config ${id} for shop ${user.shopId}`);

    // Get the config
    const config = await this.paymentConfigService.getConfig(user.shopId, id);

    // TODO: Implement verification logic using MpesaMultiTenantService
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Verification initiated. This feature is being implemented.',
      data: PaymentConfigResponseDto.fromDocument(config),
    };
  }

  /**
   * Get verification logs for a configuration
   * GET /api/payments/configs/:id/verification-logs
   */
  @Get(':id/verification-logs')
  @Roles('admin', 'branch_admin', 'branch_manager')
  async getVerificationLogs(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    // Verify the config belongs to this shop
    await this.paymentConfigService.getConfig(user.shopId, id);

    // TODO: Implement verification log retrieval
    return {
      success: true,
      data: [],
      message: 'Verification logs feature is being implemented.',
    };
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  /**
   * Get audit logs for all configs or a specific config
   * GET /api/payments/configs/audit-logs
   * GET /api/payments/configs/:id/audit-logs
   */
  @Get('audit-logs')
  @Roles('admin')
  async getShopAuditLogs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.paymentConfigService.getAuditLogs(
      user.shopId,
      undefined,
      limit || 50,
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }

  @Get(':id/audit-logs')
  @Roles('admin')
  async getConfigAuditLogs(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    // Verify the config belongs to this shop
    await this.paymentConfigService.getConfig(user.shopId, id);

    const logs = await this.paymentConfigService.getAuditLogs(
      user.shopId,
      id,
      limit || 50,
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }

  // ============================================
  // RUNTIME RESOLUTION
  // ============================================

  /**
   * Get the active configuration for a provider
   * Used by frontend to check if payments can be processed
   * GET /api/payments/configs/active
   */
  @Get('active/resolve')
  async getActiveConfig(
    @CurrentUser() user: JwtPayload,
    @Query('provider') provider: PaymentProvider,
    @Query('branchId') branchId?: string,
    @Query('environment') environment?: ConfigEnvironment,
  ) {
    try {
      const result = await this.paymentConfigService.getActiveTill(
        user.shopId,
        provider,
        branchId,
        environment,
      );

      return {
        success: true,
        data: {
          config: PaymentConfigResponseDto.fromDocument(result.config),
          source: result.source,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Check if a short code is available
   * GET /api/payments/configs/validate-shortcode
   */
  @Get('validate/shortcode')
  @Roles('admin')
  async validateShortCode(
    @CurrentUser() user: JwtPayload,
    @Query('shortCode') shortCode: string,
    @Query('provider') provider: PaymentProvider,
    @Query('environment') environment: ConfigEnvironment,
    @Query('branchId') branchId?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const result = await this.paymentConfigService.validateTillUniqueness(
      user.shopId,
      shortCode,
      provider,
      environment,
      branchId,
      excludeId,
    );

    return {
      success: true,
      isUnique: result.isUnique,
      message: result.isUnique
        ? 'Short code is available'
        : 'Short code is already in use',
    };
  }
}
