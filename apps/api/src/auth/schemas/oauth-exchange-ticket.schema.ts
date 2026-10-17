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

/**
 * OAUTH-SEC2 — transaction-bound OAuth state.
 *
 * The cashier flow previously used a STATIC, predictable state
 * ({"role":"cashier"}) with no transaction binding. States are now
 * cryptographically random, stored server-side with their purpose,
 * single-use and short-lived; the callback classifies the flow from the
 * STORED purpose — never from client-supplied state metadata.
 */
@Schema({ timestamps: true, collection: 'oauth_states' })
export class OAuthState {
  @Prop({ required: true, index: true })
  stateHash: string;

  @Prop({ required: true, enum: ['admin_login', 'cashier_login'] })
  purpose: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;
}

export type OAuthStateDocument = OAuthState & Document;
export const OAuthStateSchema = SchemaFactory.createForClass(OAuthState);

OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });
OAuthStateSchema.index({ stateHash: 1, isUsed: 1 });
