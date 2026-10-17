import mongoose, { Types } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  OAuthExchangeTicket,
  OAuthExchangeTicketSchema,
} from './schemas/oauth-exchange-ticket.schema';
import { OAuthExchangeService } from './services/oauth-exchange.service';

jest.mock('nanoid', () => ({ nanoid: () => 'testnanoid' }));

/**
 * OAUTH-SEC1 — one-time OAuth exchange ticket tests (real MongoDB).
 *
 * Verified: valid redemption · expiry rejection · replay rejection ·
 * concurrent redemption (exactly one winner) · purpose mismatch ·
 * invalid/malformed tickets · hashed storage (no raw ticket in the DB).
 */

const MONGO_URI = process.env.P011C3_MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB = `p011oauth_sec1_${process.pid}`;

let conn: mongoose.Connection | null = null;
let svc: OAuthExchangeService;
let TicketModel: mongoose.Model<any>;

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, { serverSelectionTimeoutMS: 15000 })
      .asPromise();
    TicketModel = conn.model('OauthSec1Ticket', OAuthExchangeTicketSchema);
    svc = new OAuthExchangeService(TicketModel as any);
  } catch (e: any) {
    conn = null;
    console.error('MONGO_CONNECT_FAIL:', e?.message || e);
  }
}, 30000);

afterAll(async () => {
  if (conn) { await conn.dropDatabase(); await conn.close(); }
});

const itMongo = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!conn) {
      throw new Error(`REQUIRED: no mongod at ${MONGO_URI} — OAUTH-SEC1 is NOT VERIFIED without real MongoDB`);
    }
    await TicketModel.deleteMany({});
    await fn();
  });

describe('OAUTH-SEC1 — one-time exchange tickets (real MongoDB)', () => {
  itMongo('valid redemption returns the payload exactly once', async () => {
    const payload = { accessToken: 'at-123', refreshToken: 'rt-456' };
    const ticket = await svc.issueTicket(payload, 'admin_login');
    const redeemed = await svc.redeemTicket(ticket);
    expect(redeemed).toEqual(payload);
    // replay rejected
    await expect(svc.redeemTicket(ticket)).rejects.toThrow(UnauthorizedException);
  });

  itMongo('expired ticket rejected', async () => {
    const ticket = crypto.randomBytes(32).toString('hex');
    await TicketModel.create({
      ticketHash: crypto.createHash('sha256').update(ticket).digest('hex'),
      payload: JSON.stringify({ a: 1 }),
      purpose: 'admin_login',
      expiresAt: new Date(Date.now() - 1000),
      isUsed: false,
    });
    await expect(svc.redeemTicket(ticket)).rejects.toThrow(UnauthorizedException);
  });

  itMongo('concurrent redemption: exactly one winner', async () => {
    const ticket = await svc.issueTicket({ v: 1 }, 'admin_login');
    const [r1, r2] = await Promise.allSettled([
      svc.redeemTicket(ticket),
      svc.redeemTicket(ticket),
    ]);
    const winners = [r1, r2].filter((r) => r.status === 'fulfilled');
    expect(winners.length).toBe(1);
  });

  itMongo('purpose mismatch rejected and ticket consumed', async () => {
    const ticket = await svc.issueTicket({ googleProfile: { name: 'X' } }, 'shop_registration');
    await expect(
      svc.redeemTicket(ticket, 'admin_login'),
    ).rejects.toThrow(UnauthorizedException);
    // consumed — replay also rejected
    await expect(svc.redeemTicket(ticket)).rejects.toThrow(UnauthorizedException);
  });

  itMongo('invalid/malformed tickets rejected', async () => {
    await expect(svc.redeemTicket('')).rejects.toThrow(UnauthorizedException);
    await expect(svc.redeemTicket('short')).rejects.toThrow(UnauthorizedException);
    await expect(
      svc.redeemTicket(crypto.randomBytes(32).toString('hex')),
    ).rejects.toThrow(UnauthorizedException);
  });

  itMongo('ticket material stored HASHED (no raw ticket in the DB)', async () => {
    const ticket = await svc.issueTicket({ secret: 'payload' }, 'admin_login');
    const docs = await TicketModel.find({}).lean();
    expect(docs.length).toBe(1);
    expect(JSON.stringify(docs[0])).not.toContain(ticket);
    expect(docs[0].ticketHash).toHaveLength(64); // sha256 hex
  });
});
