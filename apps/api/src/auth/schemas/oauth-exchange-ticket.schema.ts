import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * OAUTH-SEC1 — one-time OAuth exchange ticket.
 *
 * Replaces credential-bearing OAuth redirect URLs: after a successful
 * Google callback the backend stores the token pair (or the Google
 * profile for registration handoffs) SERVER-SIDE against a short-lived
 * cryptographically random ticket; the redirect URL carries only the
 * ticket. The frontend exchanges the ticket once via POST.
 *
 * Security properties:
 *  - stored HASHED (the raw ticket material never persists)
 *  - ~90-second expiry
 *  - atomic single-use redemption (CAS consume — replays and concurrent
 *    redemptions lose)
 *  - purpose-bound (login / cashier_signup / shop_registration)
 */
@Schema({ timestamps: true, collection: 'oauth_exchange_tickets' })
export class OAuthExchangeTicket {
  @Prop({ required: true, index: true })
  ticketHash: string;

  /** Serialized payload (tokens or profile) — server-side only. */
  @Prop({ required: true })
  payload: string;

  @Prop({ required: true, enum: ['admin_login', 'cashier_signup', 'shop_registration'] })
  purpose: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;
}

export type OAuthExchangeTicketDocument = OAuthExchangeTicket & Document;
export const OAuthExchangeTicketSchema =
  SchemaFactory.createForClass(OAuthExchangeTicket);

// TTL cleanup: expired tickets are removed by Mongo after a grace window.
OAuthExchangeTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });
OAuthExchangeTicketSchema.index({ ticketHash: 1, isUsed: 1 });
