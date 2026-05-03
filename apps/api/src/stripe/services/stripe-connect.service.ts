import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';

/**
 * Stripe Connect Service (Standard accounts, OAuth flow)
 *
 * Shops link their own Stripe account to SmartDuka via Stripe's OAuth.
 * After linking we only store the connected `accountId` — the shop's secret key
 * NEVER leaves Stripe. All charges for that shop are made by calling the Stripe
 * API on behalf of that connected account (using the `stripeAccount` request header),
 * so funds settle directly into the shop's own Stripe balance.
 *
 * Card sales must be blocked when:
 *   - No accountId (never connected, or disconnected)
 *   - chargesEnabled === false (requirements outstanding or account restricted)
 *
 * Required environment:
 *   - STRIPE_SECRET_KEY           (platform account secret, used for OAuth token exchange + account.retrieve)
 *   - STRIPE_CONNECT_CLIENT_ID    (ca_xxx — from Stripe Dashboard → Connect settings)
 *   - STRIPE_CONNECT_REDIRECT_URI (public URL to our /stripe/connect/callback endpoint)
 *   - STRIPE_CONNECT_STATE_SECRET (HMAC secret used to sign the OAuth `state` param)
 */
@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
  ) {}

  // ------------------------------------------------------------------
  // CONFIG / HELPERS
  // ------------------------------------------------------------------

  private getClientId(): string {
    const id = this.configService.get<string>('STRIPE_CONNECT_CLIENT_ID', '');
    if (!id) {
      throw new InternalServerErrorException(
        'Stripe Connect is not configured on the platform (missing STRIPE_CONNECT_CLIENT_ID).',
      );
    }
    return id;
  }

  private getRedirectUri(): string {
    const uri = this.configService.get<string>('STRIPE_CONNECT_REDIRECT_URI', '');
    if (!uri) {
      throw new InternalServerErrorException(
        'Stripe Connect redirect URI not configured (STRIPE_CONNECT_REDIRECT_URI).',
      );
    }
    return uri;
  }

  private getStateSecret(): string {
    // Fall back to JWT_SECRET so setups that already have a server secret work out of the box.
    const secret =
      this.configService.get<string>('STRIPE_CONNECT_STATE_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      '';
    if (!secret) {
      throw new InternalServerErrorException(
        'No state-signing secret available (set STRIPE_CONNECT_STATE_SECRET or JWT_SECRET).',
      );
    }
    return secret;
  }

  private getEnvironment(): 'live' | 'test' {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    return key.startsWith('sk_live_') ? 'live' : 'test';
  }

  // ------------------------------------------------------------------
  // STATE TOKEN (CSRF protection)
  // ------------------------------------------------------------------

  /**
   * Build a signed state token that binds the OAuth flow to one shop + user.
   * Format: base64url(JSON({ shopId, userId, nonce, exp })) + '.' + hmacSHA256
   * Expires in 15 minutes to limit replay window.
   */
  private signState(shopId: string, userId: string): string {
    const payload = {
      shopId,
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Date.now() + 15 * 60 * 1000,
    };
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.getStateSecret())
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  private verifyState(state: string): { shopId: string; userId: string } {
    if (!state || typeof state !== 'string' || !state.includes('.')) {
      throw new BadRequestException('Invalid OAuth state token');
    }
    const [body, sig] = state.split('.');
    const expected = crypto
      .createHmac('sha256', this.getStateSecret())
      .update(body)
      .digest('base64url');

    // Timing-safe comparison
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new BadRequestException('OAuth state signature mismatch');
    }

    let payload: { shopId: string; userId: string; exp: number };
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Malformed OAuth state payload');
    }

    if (!payload.exp || Date.now() > payload.exp) {
      throw new BadRequestException('OAuth state expired — please try connecting again');
    }
    if (!payload.shopId || !payload.userId) {
      throw new BadRequestException('OAuth state missing required fields');
    }
    return { shopId: payload.shopId, userId: payload.userId };
  }

  // ------------------------------------------------------------------
  // OAUTH FLOW
  // ------------------------------------------------------------------

  /**
   * Build Stripe OAuth authorize URL for a shop to initiate connection.
   * Frontend should redirect the shop owner's browser to this URL.
   */
  buildAuthorizeUrl(params: { shopId: string; userId: string; email?: string }): string {
    // Refuse to start if Stripe client isn't initialised on the platform side
    if (!this.stripeService.isStripeConfigured()) {
      throw new InternalServerErrorException(
        'Platform Stripe is not configured. Set STRIPE_SECRET_KEY in environment.',
      );
    }

    const state = this.signState(params.shopId, params.userId);
    const url = new URL('https://connect.stripe.com/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.getClientId());
    url.searchParams.set('scope', 'read_write');
    url.searchParams.set('redirect_uri', this.getRedirectUri());
    url.searchParams.set('state', state);
    // Prefill email so onboarding is quicker (optional; Stripe ignores if unknown)
    if (params.email) {
      url.searchParams.set('stripe_user[email]', params.email);
    }
    return url.toString();
  }

  /**
   * Exchange the authorization code for the shop's connected account ID.
   * Persists the link to shop.stripeConnect and triggers a capability sync.
   */
  async handleOAuthCallback(code: string, state: string): Promise<ShopDocument> {
    if (!code) {
      throw new BadRequestException('Missing authorization code from Stripe');
    }
    const { shopId, userId } = this.verifyState(state);

    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Exchange via Stripe's OAuth token endpoint.
    // Use the platform Stripe client — NOT the connected account.
    const stripe = this.stripeService.getClient();
    let tokenResponse: Stripe.OAuthToken;
    try {
      // Stripe SDK exposes oauth under `stripe.oauth` when using the Connect plugin.
      // Fall back to direct HTTPS call for maximum compatibility across SDK versions.
      tokenResponse = await this.exchangeCode(stripe, code);
    } catch (err: any) {
      this.logger.error(`OAuth code exchange failed: ${err?.message}`);
      throw new BadRequestException(
        `Could not complete Stripe connection: ${err?.message || 'unknown error'}`,
      );
    }

    const accountId = tokenResponse.stripe_user_id;
    if (!accountId) {
      throw new BadRequestException('Stripe did not return a connected account ID');
    }

    // Ensure the same Stripe account is not already linked to a different shop
    const conflict = await this.shopModel
      .findOne({ 'stripeConnect.accountId': accountId, _id: { $ne: shop._id } })
      .select('_id name')
      .lean()
      .exec();
    if (conflict) {
      throw new BadRequestException(
        `This Stripe account is already linked to another SmartDuka shop. Disconnect there first.`,
      );
    }

    // Persist the minimal link
    shop.stripeConnect = {
      ...(shop.stripeConnect || {}),
      accountId,
      accountType: 'standard',
      environment: this.getEnvironment(),
      connectedAt: new Date(),
      disconnectedAt: undefined,
      connectedByUserId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    };
    await shop.save();

    // Pull the full capability picture so the UI can show accurate status immediately
    try {
      await this.syncAccountStatus(shop._id.toString());
    } catch (err: any) {
      this.logger.warn(`Initial account sync failed for shop ${shopId}: ${err?.message}`);
    }

    this.logger.log(`Shop ${shopId} connected to Stripe account ${accountId}`);
    return this.shopModel.findById(shopId).exec() as unknown as ShopDocument;
  }

  /**
   * Perform the OAuth code → token exchange.
   * Isolated so we can swap implementations (SDK `oauth.token` vs raw HTTPS) without touching callers.
   */
  private async exchangeCode(stripe: Stripe, code: string): Promise<Stripe.OAuthToken> {
    // Preferred: SDK helper (supported in modern stripe-node)
    const oauth = (stripe as any).oauth;
    if (oauth && typeof oauth.token === 'function') {
      return (await oauth.token({ grant_type: 'authorization_code', code })) as Stripe.OAuthToken;
    }

    // Fallback: hand-rolled POST to https://connect.stripe.com/oauth/token
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    const params = new URLSearchParams();
    params.append('client_secret', secretKey);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = (await response.json()) as any;
    if (!response.ok) {
      const msg = data?.error_description || data?.error || `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return data as Stripe.OAuthToken;
  }

  // ------------------------------------------------------------------
  // ACCOUNT SYNC
  // ------------------------------------------------------------------

  /**
   * Pull the latest account object from Stripe and mirror capability flags on the shop.
   * Should be called after onboarding, when returning from Stripe, and on `account.updated` webhooks.
   */
  async syncAccountStatus(shopId: string): Promise<ShopDocument> {
    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) throw new NotFoundException('Shop not found');

    const accountId = shop.stripeConnect?.accountId;
    if (!accountId) {
      throw new BadRequestException('Shop is not connected to Stripe');
    }

    const stripe = this.stripeService.getClient();
    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieve(accountId);
    } catch (err: any) {
      // account_invalid usually means the shop deauthorized us on Stripe's side.
      if (err?.code === 'account_invalid' || err?.statusCode === 403) {
        this.logger.warn(`Account ${accountId} is no longer accessible — treating as disconnected`);
        shop.stripeConnect = {
          ...(shop.stripeConnect || {}),
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          disabledReason: 'account_invalid',
          lastSyncedAt: new Date(),
        };
        await shop.save();
        return shop;
      }
      throw err;
    }

    shop.stripeConnect = {
      ...(shop.stripeConnect || {}),
      accountId: account.id,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
      currentlyDueRequirements: account.requirements?.currently_due || [],
      pastDueRequirements: account.requirements?.past_due || [],
      disabledReason: account.requirements?.disabled_reason || undefined,
      country: account.country || undefined,
      defaultCurrency: account.default_currency || undefined,
      displayName:
        (account.business_profile?.name as string | undefined) ||
        (account.settings?.dashboard?.display_name as string | undefined) ||
        undefined,
      email: account.email || undefined,
      lastSyncedAt: new Date(),
    };
    await shop.save();
    return shop;
  }

  /**
   * Fast-path: update capability flags on a shop from an incoming webhook `Account` object,
   * without making an extra API round-trip.
   */
  async applyAccountUpdate(account: Stripe.Account): Promise<void> {
    const shop = await this.shopModel.findOne({ 'stripeConnect.accountId': account.id }).exec();
    if (!shop) {
      this.logger.warn(`Received account.updated for unknown account ${account.id}`);
      return;
    }
    shop.stripeConnect = {
      ...(shop.stripeConnect || {}),
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
      currentlyDueRequirements: account.requirements?.currently_due || [],
      pastDueRequirements: account.requirements?.past_due || [],
      disabledReason: account.requirements?.disabled_reason || undefined,
      lastSyncedAt: new Date(),
    };
    await shop.save();
  }

  /**
   * Handle deauthorization — either from our disconnect endpoint or from a Stripe dashboard deauthorize.
   * We clear accountId so card payments are blocked on the next attempt.
   */
  async applyDeauthorization(accountId: string): Promise<void> {
    const shop = await this.shopModel.findOne({ 'stripeConnect.accountId': accountId }).exec();
    if (!shop) {
      this.logger.warn(`Received deauthorize for unknown account ${accountId}`);
      return;
    }
    shop.stripeConnect = {
      ...(shop.stripeConnect || {}),
      accountId: undefined,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      disconnectedAt: new Date(),
      lastSyncedAt: new Date(),
    };
    await shop.save();
    this.logger.log(`Shop ${shop._id} disconnected from Stripe account ${accountId}`);
  }

  // ------------------------------------------------------------------
  // PUBLIC QUERIES (used by POS guard + UI)
  // ------------------------------------------------------------------

  /**
   * Lightweight readiness check for card sales.
   * Returns true iff the shop has a connected account that Stripe has enabled for charges.
   */
  async isShopCardReady(shopId: string): Promise<boolean> {
    const shop = await this.shopModel
      .findById(shopId)
      .select('stripeConnect.accountId stripeConnect.chargesEnabled')
      .lean()
      .exec();
    return !!(shop?.stripeConnect?.accountId && shop.stripeConnect.chargesEnabled);
  }

  /**
   * Returns the Stripe connected account ID for a shop, or throws a descriptive error
   * suitable for surfacing to the POS frontend.
   */
  async requireConnectedAccountId(shopId: string): Promise<string> {
    const shop = await this.shopModel
      .findById(shopId)
      .select('stripeConnect')
      .lean()
      .exec();

    const cfg = shop?.stripeConnect;
    if (!cfg?.accountId) {
      throw new BadRequestException(
        'Card payments are disabled: this shop has not connected a Stripe account yet. Go to Settings → Payments → Connect Stripe.',
      );
    }
    if (!cfg.chargesEnabled) {
      const due = cfg.currentlyDueRequirements?.length
        ? ` Outstanding requirements: ${cfg.currentlyDueRequirements.join(', ')}.`
        : '';
      throw new BadRequestException(
        `Card payments are disabled: your connected Stripe account cannot accept charges yet.${due} Complete onboarding in Stripe and try again.`,
      );
    }
    return cfg.accountId;
  }

  /**
   * Get the full public status for a shop (safe to return to the shop owner).
   */
  async getStatus(shopId: string): Promise<{
    isConnected: boolean;
    isCardReady: boolean;
    accountId?: string;
    environment?: 'live' | 'test';
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    currentlyDueRequirements?: string[];
    pastDueRequirements?: string[];
    disabledReason?: string;
    country?: string;
    defaultCurrency?: string;
    displayName?: string;
    email?: string;
    connectedAt?: Date;
    disconnectedAt?: Date;
    lastSyncedAt?: Date;
  }> {
    const shop = await this.shopModel
      .findById(shopId)
      .select('stripeConnect')
      .lean()
      .exec();
    const cfg = shop?.stripeConnect || {};
    return {
      isConnected: !!cfg.accountId,
      isCardReady: !!(cfg.accountId && cfg.chargesEnabled),
      accountId: cfg.accountId,
      environment: cfg.environment,
      chargesEnabled: cfg.chargesEnabled,
      payoutsEnabled: cfg.payoutsEnabled,
      detailsSubmitted: cfg.detailsSubmitted,
      currentlyDueRequirements: cfg.currentlyDueRequirements,
      pastDueRequirements: cfg.pastDueRequirements,
      disabledReason: cfg.disabledReason,
      country: cfg.country,
      defaultCurrency: cfg.defaultCurrency,
      displayName: cfg.displayName,
      email: cfg.email,
      connectedAt: cfg.connectedAt,
      disconnectedAt: cfg.disconnectedAt,
      lastSyncedAt: cfg.lastSyncedAt,
    };
  }

  // ------------------------------------------------------------------
  // LOGIN LINK / DISCONNECT
  // ------------------------------------------------------------------

  /**
   * For Standard accounts the shop owner can log in to their own Stripe dashboard
   * directly — we just return the well-known dashboard URL.
   * For Express accounts we'd mint an Account Login Link via the API.
   */
  async getDashboardUrl(shopId: string): Promise<string> {
    const shop = await this.shopModel
      .findById(shopId)
      .select('stripeConnect')
      .lean()
      .exec();
    const cfg = shop?.stripeConnect;
    if (!cfg?.accountId) {
      throw new BadRequestException('Shop is not connected to Stripe');
    }
    if (cfg.accountType === 'express') {
      const stripe = this.stripeService.getClient();
      const link = await stripe.accounts.createLoginLink(cfg.accountId);
      return link.url;
    }
    return 'https://dashboard.stripe.com/';
  }

  /**
   * Revoke the OAuth grant and clear the shop's connection.
   * Stripe's deauthorize endpoint makes this bidirectional — any future calls
   * against the shop's account with our platform credentials will fail.
   */
  async disconnect(shopId: string): Promise<void> {
    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) throw new NotFoundException('Shop not found');

    const accountId = shop.stripeConnect?.accountId;
    if (!accountId) {
      // Nothing to do — treat as idempotent success
      return;
    }

    const stripe = this.stripeService.getClient();
    try {
      const oauth = (stripe as any).oauth;
      if (oauth && typeof oauth.deauthorize === 'function') {
        await oauth.deauthorize({
          client_id: this.getClientId(),
          stripe_user_id: accountId,
        });
      } else {
        // Fallback raw call
        const params = new URLSearchParams();
        params.append('client_id', this.getClientId());
        params.append('stripe_user_id', accountId);
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
        const response = await fetch('https://connect.stripe.com/oauth/deauthorize', {
          method: 'POST',
          body: params.toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${secretKey}`,
          },
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Deauthorize failed: HTTP ${response.status} ${text}`);
        }
      }
    } catch (err: any) {
      // If Stripe says we're already deauthorized, treat as success
      const msg = (err?.message || '').toLowerCase();
      if (!msg.includes('not connected') && !msg.includes('invalid_grant')) {
        this.logger.error(`Deauthorize API call failed for ${accountId}: ${err?.message}`);
        throw new BadRequestException(
          `Could not disconnect Stripe account: ${err?.message || 'unknown error'}`,
        );
      }
    }

    await this.applyDeauthorization(accountId);
  }
}
