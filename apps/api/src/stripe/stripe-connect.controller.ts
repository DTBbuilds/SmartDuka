import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StripeConnectService } from './services/stripe-connect.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

/**
 * Stripe Connect Controller
 *
 * Endpoints used by shop owners to link their own Stripe account to SmartDuka via OAuth.
 * After linking, card payments are processed as direct charges on the connected account
 * so money settles into the shop's own Stripe balance. The platform never holds the
 * shop's secret key.
 *
 * Flow:
 *   1. Frontend calls GET  /stripe/connect/oauth-url        -> redirect user to Stripe
 *   2. Stripe redirects to GET /stripe/connect/callback     -> we link + redirect to settings
 *   3. Frontend polls    GET /stripe/connect/status         -> shows Connected / Action Required / Not Connected
 *   4. Admin can         POST /stripe/connect/refresh       -> force re-sync from Stripe
 *   5. Admin can         GET  /stripe/connect/dashboard-link -> jump into their own Stripe dashboard
 *   6. Admin can         DEL  /stripe/connect/disconnect    -> revoke the OAuth grant
 */
@ApiTags('Stripe Connect')
@Controller('stripe/connect')
export class StripeConnectController {
  private readonly logger = new Logger(StripeConnectController.name);

  constructor(
    private readonly connectService: StripeConnectService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate OAuth authorize URL for the current shop.
   * Frontend redirects the browser to `url`.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('oauth-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Connect OAuth authorize URL for this shop' })
  async getOAuthUrl(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; url: string }> {
    if (!user?.shopId) {
      throw new BadRequestException('No shop context — please log in again.');
    }
    const url = this.connectService.buildAuthorizeUrl({
      shopId: user.shopId,
      userId: (user as any).sub || (user as any).userId || '',
      email: user.email,
    });
    return { success: true, url };
  }

  /**
   * Public OAuth callback endpoint hit by Stripe after the shop owner authorizes.
   * We don't put the JwtAuthGuard here because the redirect is to a browser without
   * our Authorization header — authenticity is verified via the HMAC-signed `state` param.
   *
   * On success we redirect the browser back to the settings page with a status query
   * parameter so the frontend can show a toast.
   */
  @Get('callback')
  @ApiOperation({ summary: 'Stripe OAuth redirect target (public, state-signed)' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    const webBase =
      this.configService.get<string>('WEB_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const settingsUrl = `${webBase.replace(/\/$/, '')}/settings?tab=stripe`;

    if (error) {
      this.logger.warn(`Stripe OAuth returned error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${settingsUrl}&stripe_connect=error&reason=${encodeURIComponent(error)}`,
      );
    }

    try {
      await this.connectService.handleOAuthCallback(code, state);
      return res.redirect(`${settingsUrl}&stripe_connect=success`);
    } catch (err: any) {
      this.logger.error(`OAuth callback failed: ${err?.message}`);
      return res.redirect(
        `${settingsUrl}&stripe_connect=error&reason=${encodeURIComponent(err?.message || 'unknown')}`,
      );
    }
  }

  /**
   * Current Stripe connection status for this shop (safe to return to the shop owner).
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current Stripe Connect status for this shop' })
  async getStatus(@CurrentUser() user: JwtPayload) {
    if (!user?.shopId) {
      return { success: true, isConnected: false, isCardReady: false };
    }
    const status = await this.connectService.getStatus(user.shopId);
    return { success: true, ...status };
  }

  /**
   * Force a re-sync from Stripe — useful after the owner finishes onboarding
   * and wants the UI to immediately reflect new capability flags.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-sync Stripe Connect account status for this shop' })
  async refresh(@CurrentUser() user: JwtPayload) {
    if (!user?.shopId) throw new BadRequestException('No shop context');
    await this.connectService.syncAccountStatus(user.shopId);
    const status = await this.connectService.getStatus(user.shopId);
    return { success: true, ...status };
  }

  /**
   * Return a URL the shop owner can open to reach their Stripe dashboard.
   * For Standard accounts this is just https://dashboard.stripe.com; for Express
   * accounts we mint a short-lived Account Login Link.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('dashboard-link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get URL to the shop owner\u0027s Stripe dashboard' })
  async dashboardLink(@CurrentUser() user: JwtPayload) {
    if (!user?.shopId) throw new BadRequestException('No shop context');
    const url = await this.connectService.getDashboardUrl(user.shopId);
    return { success: true, url };
  }

  /**
   * Revoke the OAuth grant and clear this shop's connection.
   * Disables card payments immediately until the shop reconnects.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('disconnect')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect this shop from Stripe' })
  async disconnect(@CurrentUser() user: JwtPayload) {
    if (!user?.shopId) throw new BadRequestException('No shop context');
    await this.connectService.disconnect(user.shopId);
    return { success: true, message: 'Stripe disconnected' };
  }
}
