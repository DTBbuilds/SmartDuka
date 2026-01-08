import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionEnforcementService, SubscriptionAccessResult, SubscriptionWarning } from './subscription-enforcement.service';
import { SkipSubscriptionCheck } from '../auth/guards/subscription-status.guard';

/**
 * Controller for subscription enforcement endpoints
 * These endpoints are used by the frontend to check subscription status
 * and display appropriate warnings/blocking UI
 */
@Controller('subscriptions/enforcement')
@UseGuards(JwtAuthGuard)
export class SubscriptionEnforcementController {
  constructor(
    private readonly enforcementService: SubscriptionEnforcementService,
  ) {}

  /**
   * Check current subscription access level
   * Used by frontend to determine if shop operations should be blocked
   */
  @Get('access')
  @SkipSubscriptionCheck()
  async checkAccess(@Request() req: any): Promise<SubscriptionAccessResult> {
    const shopId = req.user?.shopId;
    
    if (!shopId) {
      return {
        accessLevel: 'full' as any,
        status: null,
        message: 'No shop context',
        daysRemaining: 0,
        canMakePayment: false,
      };
    }

    return this.enforcementService.checkAccess(shopId);
  }

  /**
   * Get subscription warnings for display in UI
   * Returns warnings based on subscription status and expiry
   */
  @Get('warnings')
  @SkipSubscriptionCheck()
  async getWarnings(@Request() req: any): Promise<{ warnings: SubscriptionWarning[] }> {
    const shopId = req.user?.shopId;
    
    if (!shopId) {
      return { warnings: [] };
    }

    const warnings = await this.enforcementService.getWarnings(shopId);
    return { warnings };
  }

  /**
   * Check if a specific operation is allowed
   * Used for fine-grained access control
   */
  @Get('can-operate')
  @SkipSubscriptionCheck()
  async canOperate(
    @Request() req: any,
  ): Promise<{ 
    canRead: boolean; 
    canWrite: boolean; 
    canUsePOS: boolean;
    canViewReports: boolean;
    message?: string;
  }> {
    const shopId = req.user?.shopId;
    
    if (!shopId) {
      return {
        canRead: true,
        canWrite: true,
        canUsePOS: true,
        canViewReports: true,
      };
    }

    const [read, write, pos, reports] = await Promise.all([
      this.enforcementService.isOperationAllowed(shopId, 'read'),
      this.enforcementService.isOperationAllowed(shopId, 'write'),
      this.enforcementService.isOperationAllowed(shopId, 'pos'),
      this.enforcementService.isOperationAllowed(shopId, 'reports'),
    ]);

    return {
      canRead: read.allowed,
      canWrite: write.allowed,
      canUsePOS: pos.allowed,
      canViewReports: reports.allowed,
      message: write.reason || pos.reason,
    };
  }
}
