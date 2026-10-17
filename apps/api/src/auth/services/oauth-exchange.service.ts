import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  OAuthExchangeTicket,
  OAuthExchangeTicketDocument,
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
  ) {}

  private hashTicket(ticket: string): string {
    return crypto.createHash('sha256').update(ticket).digest('hex');
  }

  /**
   * Issue a ticket for `payload` (a JSON-serializable object).
   * Returns the RAW ticket (delivered to the frontend via redirect).
   */
  async issueTicket(
    payload: Record<string, unknown>,
    purpose: 'admin_login' | 'cashier_signup' | 'shop_registration',
  ): Promise<string> {
    const ticket = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + OAuthExchangeService.TICKET_TTL_MS);
    await this.ticketModel.create({
      ticketHash: this.hashTicket(ticket),
      payload: JSON.stringify(payload),
      purpose,
      expiresAt,
      isUsed: false,
    });
    this.logger.log(`OAuth exchange ticket issued (purpose: ${purpose})`);
    return ticket;
  }

  /**
   * Atomically redeem a ticket: validates expiry + single use (CAS).
   * Rejects invalid, expired, replayed and concurrent redemptions.
   */
  async redeemTicket(
    ticket: string,
    expectedPurpose?: 'admin_login' | 'cashier_signup' | 'shop_registration',
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

    try {
      return JSON.parse(consumed.payload);
    } catch {
      throw new UnauthorizedException('Authentication ticket is invalid. Please sign in again.');
    }
  }
}
