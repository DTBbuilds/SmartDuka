import mongoose, { Types } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  OAuthExchangeTicket,
  OAuthExchangeTicketSchema,
  OAuthState,
  OAuthStateSchema,
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
let StateModel: mongoose.Model<any>;

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, { serverSelectionTimeoutMS: 15000 })
      .asPromise();
    TicketModel = conn.model('OauthSec1Ticket', OAuthExchangeTicketSchema);
    StateModel = conn.model('OauthSec1State', OAuthStateSchema);
    svc = new OAuthExchangeService(TicketModel as any, StateModel as any);
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
    await StateModel.deleteMany({});
    await fn();
  });

describe('OAUTH-SEC1 — one-time exchange tickets (real MongoDB)', () => {
  itMongo('valid redemption returns the payload exactly once', async () => {
    const payload = { accessToken: 'at-123', refreshToken: 'rt-456' };
    const { ticket, bindNonce } = await svc.issueTicket(payload, 'admin_login');
    const redeemed = await svc.redeemTicket(ticket, undefined, bindNonce);
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
    const { ticket, bindNonce } = await svc.issueTicket({ v: 1 }, 'admin_login');
    const [r1, r2] = await Promise.allSettled([
      svc.redeemTicket(ticket, undefined, bindNonce),
      svc.redeemTicket(ticket, undefined, bindNonce),
    ]);
    const winners = [r1, r2].filter((r) => r.status === 'fulfilled');
    expect(winners.length).toBe(1);
  });

  itMongo('purpose mismatch rejected and ticket consumed', async () => {
    const { ticket } = await svc.issueTicket({ googleProfile: { name: 'X' } }, 'shop_registration');
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
    const { ticket, bindNonce } = await svc.issueTicket({ secret: 'payload' }, 'admin_login');
    const docs = await TicketModel.find({}).lean();
    expect(docs.length).toBe(1);
    expect(JSON.stringify(docs[0])).not.toContain(ticket);
    expect(docs[0].ticketHash).toHaveLength(64); // sha256 hex
  });
});

describe('OAUTH-SEC2 — transaction-bound state + browser binding (real MongoDB)', () => {
  itMongo('state: issue → validate (purpose from store) → replay rejected', async () => {
    const state = await svc.issueState('cashier_login');
    const check = await svc.validateState(state);
    expect(check.valid).toBe(true);
    expect(check.purpose).toBe('cashier_login'); // from the STORE
    const replay = await svc.validateState(state);
    expect(replay.valid).toBe(false);
  });

  itMongo('state: forged/unknown/expired rejected', async () => {
    expect((await svc.validateState('x')).valid).toBe(false);
    expect((await svc.validateState(crypto.randomBytes(32).toString('hex'))).valid).toBe(false);
    // expired
    const state = crypto.randomBytes(32).toString('hex');
    await StateModel.create({
      stateHash: crypto.createHash('sha256').update(state).digest('hex'),
      purpose: 'admin_login', expiresAt: new Date(Date.now() - 1000), isUsed: false,
    });
    expect((await svc.validateState(state)).valid).toBe(false);
  });

  itMongo('state: predictable legacy state has NO entry (rejected)', async () => {
    // the old static state must no longer classify anything
    expect((await svc.validateState(encodeURIComponent(JSON.stringify({ role: 'cashier' })))).valid).toBe(false);
  });

  itMongo('ticket binding: wrong/missing browser nonce rejected', async () => {
    const { ticket, bindNonce } = await svc.issueTicket({ accessToken: 'a' }, 'admin_login');
    // correct nonce → redeemed
    const payload = await svc.redeemTicket(ticket, undefined, bindNonce);
    expect(payload.accessToken).toBe('a');
    // a fresh ticket with the WRONG nonce → rejected
    const t2 = await svc.issueTicket({ accessToken: 'b' }, 'admin_login');
    await expect(
      svc.redeemTicket(t2.ticket, undefined, 'wrong-nonce'),
    ).rejects.toThrow(UnauthorizedException);
    // missing nonce (another browser) → rejected
    const t3 = await svc.issueTicket({ accessToken: 'c' }, 'admin_login');
    await expect(svc.redeemTicket(t3.ticket)).rejects.toThrow(UnauthorizedException);
  });

  itMongo('ticket binding: bindNonce never returned to the client', async () => {
    const { ticket, bindNonce } = await svc.issueTicket({ accessToken: 'd' }, 'admin_login');
    const payload = await svc.redeemTicket(ticket, undefined, bindNonce);
    expect(payload.bindNonce).toBeUndefined();
  });
});
