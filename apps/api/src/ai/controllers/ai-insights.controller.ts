/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { AiInsightsService, InsightFilters } from '../services/ai-insights.service';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';

@Controller('ai/insights')
@UseGuards(JwtAuthGuard)
export class AiInsightsController {
  constructor(
    private readonly insightsService: AiInsightsService,
    private readonly orchestratorService: AiOrchestratorService,
  ) {}

  @Get()
  async getInsights(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: InsightFilters = {
      type: type as any,
      status: status as any,
      priority,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.insightsService.getInsights(user.shopId, filters);
  }

  @Get('unread-counts')
  async getUnreadCounts(@CurrentUser() user: JwtPayload) {
    return this.insightsService.getUnreadCounts(user.shopId);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.insightsService.getStats(user.shopId);
  }

  @Get(':id')
  async getInsight(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.insightsService.getInsightById(user.shopId, id);
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.insightsService.markAsRead(user.shopId, id);
  }

  @Patch(':id/dismiss')
  async dismiss(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.insightsService.dismiss(user.shopId, id, user.sub);
  }

  @Post(':id/feedback')
  async submitFeedback(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { rating: string; comment?: string },
  ) {
    await this.insightsService.submitFeedback(user.shopId, id, user.sub, body.rating, body.comment);
    return { success: true };
  }

  @Post('analyze')
  async triggerAnalysis(@CurrentUser() user: JwtPayload) {
    return this.orchestratorService.triggerManualAnalysis(user.shopId);
  }
}
