import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../auth/guards/subscription-status.guard';
import { SubscriptionAuditService } from './subscription-audit.service';

/**
 * Subscription Audit Controller
 * 
 * Super admin endpoints for auditing and fixing subscription data
 */
@Controller('subscriptions/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@SkipSubscriptionCheck()
export class SubscriptionAuditController {
  private readonly logger = new Logger(SubscriptionAuditController.name);

  constructor(private readonly auditService: SubscriptionAuditService) {}

  /**
   * Run full subscription audit (dry run by default)
   * GET /subscriptions/audit
   * Query params:
   *   - dryRun: boolean (default: true) - If false, actually fix issues
   */
  @Get()
  async runAudit(@Query('dryRun') dryRunParam?: string) {
    const dryRun = dryRunParam !== 'false';
    this.logger.log(`Running subscription audit (dryRun: ${dryRun})`);
    
    const results = await this.auditService.runFullAudit(dryRun);
    
    return {
      success: true,
      message: dryRun 
        ? 'Audit complete (dry run - no changes made)' 
        : `Audit complete - ${results.summary.issuesFixed} issues fixed`,
      results,
    };
  }

  /**
   * Get subscription statistics
   * GET /subscriptions/audit/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.auditService.getSubscriptionStats();
    return {
      success: true,
      stats,
    };
  }

  /**
   * Audit only daily subscriptions
   * GET /subscriptions/audit/daily
   */
  @Get('daily')
  async auditDailySubscriptions(@Query('dryRun') dryRunParam?: string) {
    const dryRun = dryRunParam !== 'false';
    const results = await this.auditService.auditDailySubscriptions(dryRun);
    
    return {
      success: true,
      message: dryRun 
        ? `Found ${results.issues.length} daily subscription issues (dry run)` 
        : `Fixed ${results.fixed} of ${results.issues.length} daily subscription issues`,
      issues: results.issues,
      fixed: results.fixed,
    };
  }

  /**
   * Audit expired trials
   * GET /subscriptions/audit/trials
   */
  @Get('trials')
  async auditExpiredTrials(@Query('dryRun') dryRunParam?: string) {
    const dryRun = dryRunParam !== 'false';
    const results = await this.auditService.auditExpiredTrials(dryRun);
    
    return {
      success: true,
      message: dryRun 
        ? `Found ${results.issues.length} expired trials (dry run)` 
        : `Fixed ${results.fixed} of ${results.issues.length} expired trials`,
      issues: results.issues,
      fixed: results.fixed,
    };
  }

  /**
   * Audit expired active subscriptions
   * GET /subscriptions/audit/expired
   */
  @Get('expired')
  async auditExpiredActive(@Query('dryRun') dryRunParam?: string) {
    const dryRun = dryRunParam !== 'false';
    const results = await this.auditService.auditExpiredActiveSubscriptions(dryRun);
    
    return {
      success: true,
      message: dryRun 
        ? `Found ${results.issues.length} expired active subscriptions (dry run)` 
        : `Fixed ${results.fixed} of ${results.issues.length} expired active subscriptions`,
      issues: results.issues,
      fixed: results.fixed,
    };
  }

  /**
   * Fix all subscription issues (actually apply fixes)
   * POST /subscriptions/audit/fix-all
   */
  @Post('fix-all')
  async fixAllIssues() {
    this.logger.warn('Running subscription audit with LIVE FIX mode');
    
    const results = await this.auditService.runFullAudit(false);
    
    return {
      success: true,
      message: `Fixed ${results.summary.issuesFixed} of ${results.summary.issuesFound} issues`,
      results,
    };
  }
}
