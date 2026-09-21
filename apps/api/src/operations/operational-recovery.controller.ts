import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OperationalRecoveryService } from './operational-recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * P0-7C — minimal operator surface for stranded workflow claims.
 * Both endpoints call the SAME convergence internals as the automatic
 * sweep; there is no second recovery implementation.
 */
@Controller('operations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationalRecoveryController {
  constructor(private readonly recovery: OperationalRecoveryService) {}

  /**
   * Read-only stranded-claim visibility for the caller's shop.
   * GET /operations/stranded-claims
   */
  @Roles('admin', 'branch_admin')
  @Get('stranded-claims')
  async strandedClaims(@CurrentUser() user: any) {
    const claims = await this.recovery.listStrandedClaims(user.shopId);
    return { success: true, data: claims };
  }

  /**
   * Manual resume of a claimed workflow — bypasses the age gate but not
   * the claim semantics (the underlying atomic claims still arbitrate).
   * POST /operations/recover  { workflow: 'purchase'|'transfer', resourceId }
   */
  @Roles('admin')
  @Post('recover')
  async recover(
    @CurrentUser() user: any,
    @Body() body: { workflow?: string; resourceId?: string },
  ) {
    if (
      (body?.workflow !== 'purchase' && body?.workflow !== 'transfer') ||
      !body?.resourceId
    ) {
      throw new BadRequestException(
        'workflow must be "purchase" or "transfer" and resourceId is required',
      );
    }
    const results = await this.recovery.recoverResource(
      body.workflow,
      body.resourceId,
      user.shopId,
    );
    return { success: true, data: results };
  }
}
