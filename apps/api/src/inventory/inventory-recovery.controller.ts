import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InventoryRecoveryService } from './inventory-recovery.service';
import {
  RecoveryNoteDto,
  ResolveRecoveryCaseDto,
} from './dto/resolve-recovery-case.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Operator surface for SDV2-006 ambiguous-state resolution.
 *
 * Tenant scope always comes from the authenticated JWT (user.shopId) - never
 * from client-supplied identifiers. Read endpoints follow the audit-viewing
 * convention (admin, branch_admin); mutations follow the inventory-write
 * convention (admin only).
 */
@Controller('inventory/recovery')
export class InventoryRecoveryController {
  constructor(private readonly recoveryService: InventoryRecoveryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('cases')
  listCases(@CurrentUser() user: any) {
    return this.recoveryService.listCases(user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('metrics')
  getMetrics(@CurrentUser() user: any) {
    return this.recoveryService.getMetrics(user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('cases/resolve')
  resolveCase(@Body() dto: ResolveRecoveryCaseDto, @CurrentUser() user: any) {
    return this.recoveryService.resolveCase(user.shopId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post('cases/:claimId/notes')
  addNote(
    @Param('claimId') claimId: string,
    @Body() dto: RecoveryNoteDto,
    @CurrentUser() user: any,
  ) {
    return this.recoveryService.addNote(user.shopId, user.sub, claimId, dto.text);
  }
}
