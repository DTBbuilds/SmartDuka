import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  OAuthExchangeTicket,
  OAuthExchangeTicketDocument,
  OAuthState,
  OAuthStateDocument,
} from '../schemas/oauth-exchange-ticket.schema';

/**
 * OAUTH-SEC1 — one-time OAuth exchange ticket service.
 *
 * The Google callback stores the token pair (or the registration
 * profile) server-side and redirects with only a short-lived random
 * ticket. Redemption is atomic (CAS consume): expired, replayed,
 * invalid and concurrent attempts are rejected. Ticket material is
 * stored HASHED — a DB read does not reveal usable tickets.
 */
@Injectable()
export class OAuthExchangeService {
  private readonly logger = new Logger(OAuthExchangeService.name);
  private static readonly TICKET_TTL_MS = 90_000; // ~90 seconds

  constructor(
    @InjectModel(OAuthExchangeTicket.name)
    private readonly ticketModel: Model<OAuthExchangeTicketDocument>,
    @InjectModel(OAuthState.name)
    private readonly stateModel: Model<OAuthStateDocument>,
  ) {}

  private hashState(state: string): string {
    return crypto.createHash('sha256').update(state).digest('hex');
  }

  /**
   * OAUTH-SEC2: issue a transaction-bound OAuth state (random, stored
   * with its purpose, ~10-minute expiry, single-use).
   */
  async issueState(purpose: 'admin_login' | 'cashier_login'): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.stateModel.create({
      stateHash: this.hashState(state),
      purpose,
      expiresAt,
      isUsed: false,
    });
    return state;
  }

  /**
   * OAUTH-SEC2: validate + consume an OAuth state (CAS single-use).
   * Returns the STORED purpose — the flow classification never comes
   * from client-supplied state metadata.
   */
  async validateState(
    state: string,
  ): Promise<{ valid: boolean; purpose?: string }> {
    if (!state || typeof state !== 'string' || state.length < 32) {
      return { valid: false };
    }
    const live = await this.stateModel
      .findOne({
        stateHash: this.hashState(state),
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!live) {
      return { valid: false };
    }
    const consumed = await this.stateModel
      .findOneAndUpdate(
        { _id: live._id, isUsed: false },
        { $set: { isUsed: true, usedAt: new Date() } },
        { new: false },
      )
      .exec();
    if (!consumed || consumed.isUsed) {
      return { valid: false }; // replayed/concurrent
    }
    return { valid: true, purpose: consumed.purpose };
  }

  private hashTicket(ticket: string): string {
    return crypto.createHash('sha256').update(ticket).digest('hex');
  }

  /**
   * Issue a ticket for `payload` (a JSON-serializable object).
   * Returns { ticket, bindNonce } — the nonce is ALSO set as a short-
   * lived HttpOnly cookie on the API domain during the OAuth redirect
   * chain; redemption requires the cookie to match (proof-of-possession:
   * a ticket stolen from URL history cannot be redeemed from another
   * browser). SameSite=None; Secure keeps it compatible with the
   * cross-origin Vercel/Render architecture and mobile browsers.
   */
  async issueTicket(
    payload: Record<string, unknown>,
    purpose: 'admin_login' | 'cashier_signup' | 'shop_registration' | 'otp_verification',
  ): Promise<{ ticket: string; bindNonce: string }> {
    const ticket = crypto.randomBytes(32).toString('hex');
    const bindNonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + OAuthExchangeService.TICKET_TTL_MS);
    await this.ticketModel.create({
      ticketHash: this.hashTicket(ticket),
      payload: JSON.stringify({ ...payload, bindNonce }),
      purpose,
      expiresAt,
      isUsed: false,
    });
    this.logger.log(`OAuth exchange ticket issued (purpose: ${purpose})`);
    return { ticket, bindNonce };
  }

  /**
   * Atomically redeem a ticket: validates expiry + single use (CAS).
   * Rejects invalid, expired, replayed and concurrent redemptions.
   */
  async redeemTicket(
    ticket: string,
    expectedPurpose?: 'admin_login' | 'cashier_signup' | 'shop_registration' | 'otp_verification',
    browserNonce?: string,
  ): Promise<Record<string, unknown>> {
    if (!ticket || typeof ticket !== 'string' || ticket.length < 32) {
      throw new UnauthorizedException('Invalid authentication ticket');
    }
    const ticketHash = this.hashTicket(ticket);

    // Find the live ticket (single-use, unexpired) by hash.
    const live = await this.ticketModel
      .findOne({ ticketHash, isUsed: false, expiresAt: { $gt: new Date() } })
      .exec();
    if (!live) {
      // Expired, already used, or never issued — one generic message.
      throw new UnauthorizedException(
        'Authentication ticket is invalid or has expired. Please sign in again.',
      );
    }

    if (expectedPurpose && live.purpose !== expectedPurpose) {
      // Transaction mismatch — consume it anyway so it cannot be reused.
      await this.ticketModel
        .updateOne({ _id: live._id }, { $set: { isUsed: true, usedAt: new Date() } })
        .exec();
      throw new UnauthorizedException('Authentication ticket is invalid. Please sign in again.');
    }

    // Atomic consume: exactly one redemption wins.
    const consumed = await this.ticketModel
      .findOneAndUpdate(
        { _id: live._id, isUsed: false },
        { $set: { isUsed: true, usedAt: new Date() } },
        { new: false },
      )
      .exec();
    if (!consumed || consumed.isUsed) {
      throw new UnauthorizedException(
        'Authentication ticket is invalid or has expired. Please sign in again.',
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(consumed.payload);
    } catch {
      throw new UnauthorizedException('Authentication ticket is invalid. Please sign in again.');
    }
    // OAUTH-SEC2: browser transaction binding — the ticket is only
    // redeemable in the browser that received the OAuth redirect (the
    // binding cookie was set on the API domain during the redirect
    // chain). A ticket obtained from URL history in another browser
    // cannot complete the login.
    if (parsed.bindNonce) {
      if (!browserNonce || browserNonce !== parsed.bindNonce) {
        throw new UnauthorizedException(
          'Authentication ticket is invalid for this browser. Please sign in again.',
        );
      }
      const { bindNonce: _omit, ...rest } = parsed;
      return rest;
    }
    return parsed;
  }
}
