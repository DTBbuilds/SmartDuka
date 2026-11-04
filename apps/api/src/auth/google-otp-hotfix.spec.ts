import mongoose from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as crypto from 'crypto';
import {
  OAuthExchangeTicket,
  OAuthExchangeTicketSchema,
  OAuthExchangePurpose,
  OAUTH_EXCHANGE_PURPOSES,
  OAuthState,
  OAuthStateSchema,
} from './schemas/oauth-exchange-ticket.schema';
import { OAuthExchangeService } from './services/oauth-exchange.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AUTH-GOOGLE-OTP-HOTFIX1 — regression suite (disposable MongoDB).
 *
 * Root cause: `OAuthExchangeService.issueTicket()` permits the purpose
 * `otp_verification`, but `OAuthExchangeTicketSchema` did not include it in
 * its Mongoose enum — every existing Google user whose login required OTP
 * hit a schema ValidationError at the ticket write and could not complete
 * authentication (the raw error was then leaked into the /login redirect).
 *
 * Proven here against REAL schemas/services on a disposable MongoDB:
 *   - the OTP ticket persists with purpose `otp_verification`;
 *   - the Google callback redirect carries a redeemable otp ticket;
 *   - the correct browser redeems it exactly once; expired, reused and
 *     wrong-browser tickets are rejected;
 *   - the user completes OTP verification and receives a valid session;
 *   - the other OAuth purposes still work; admin/cashier role restrictions
 *     hold; the failure redirect no longer leaks raw exception details.
 */
describe('AUTH-GOOGLE-OTP-HOTFIX1 — Google OAuth OTP ticket lifecycle', () => {
  jest.setTimeout(120_000);

  let mongo: MongoMemoryServer;
  let conn: mongoose.Connection;
  let TicketModel: mongoose.Model<any>;
  let StateModel: mongoose.Model<any>;
  let svc: OAuthExchangeService;

  const OTP_PAYLOAD = {
    email: 'cashier@example.com',
    userName: 'Alice',
    shopName: 'Load & Go',
    isGoogleLogin: true,
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose
      .createConnection(mongo.getUri('google-otp-hotfix'), {
        serverSelectionTimeoutMS: 15000,
      })
      .asPromise();
    TicketModel = conn.model('HotfixTicket', OAuthExchangeTicketSchema);
    StateModel = conn.model('HotfixState', OAuthStateSchema);
    svc = new OAuthExchangeService(TicketModel as any, StateModel as any);
  });

  afterAll(async () => {
    await conn?.dropDatabase();
    await conn?.close();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await TicketModel.deleteMany({});
    await StateModel.deleteMany({});
  });

  // ── Phase 1: the schema accepts otp_verification ──

  it('schema accepts purpose otp_verification (the root-cause regression)', async () => {
    const doc = await TicketModel.create({
      ticketHash: crypto.createHash('sha256').update('t1').digest('hex'),
      payload: JSON.stringify(OTP_PAYLOAD),
      purpose: 'otp_verification',
      expiresAt: new Date(Date.now() + 60_000),
      isUsed: false,
    });
    expect(doc.purpose).toBe('otp_verification');
  });

  it('schema still rejects unknown purposes', async () => {
    await expect(
      TicketModel.create({
        ticketHash: crypto.createHash('sha256').update('t2').digest('hex'),
        payload: '{}',
        purpose: 'not_a_purpose',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow(/not a valid enum value/);
  });

  it('service, schema and purpose types are synchronized', () => {
    expect([...OAUTH_EXCHANGE_PURPOSES]).toContain('otp_verification');
    expect(OAUTH_EXCHANGE_PURPOSES).toHaveLength(4);
  });

  it('existing Google user requiring OTP receives a valid exchange ticket that persists (exact controller call)', async () => {
    const { ticket, bindNonce } = await svc.issueTicket(
      OTP_PAYLOAD,
      'otp_verification',
    );

    const persisted = (await TicketModel.findOne({
      ticketHash: crypto.createHash('sha256').update(ticket).digest('hex'),
    }).lean()) as any;
    expect(persisted).toBeTruthy();
    expect(persisted.purpose).toBe('otp_verification');
    expect(persisted.isUsed).toBe(false);
    expect(persisted.payload).not.toContain(ticket); // hashed storage

    const redeemed = await svc.redeemTicket(
      ticket,
      'otp_verification',
      bindNonce,
    );
    expect(redeemed).toEqual(OTP_PAYLOAD);
    expect((redeemed as any).bindNonce).toBeUndefined();
  });

  it('the otp ticket is single-use (replay rejected)', async () => {
    const { ticket, bindNonce } = await svc.issueTicket(
      OTP_PAYLOAD,
      'otp_verification',
    );
    await svc.redeemTicket(ticket, 'otp_verification', bindNonce);
    await expect(
      svc.redeemTicket(ticket, 'otp_verification', bindNonce),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('expired otp ticket is rejected', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    await TicketModel.create({
      ticketHash: crypto.createHash('sha256').update(raw).digest('hex'),
      payload: JSON.stringify(OTP_PAYLOAD),
      purpose: 'otp_verification',
      expiresAt: new Date(Date.now() - 1000),
      isUsed: false,
    });
    await expect(svc.redeemTicket(raw, 'otp_verification')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('wrong-browser and missing-nonce redemptions are rejected (each attempt consumes the ticket — fail-closed)', async () => {
    // Fresh ticket per scenario: any redemption attempt consumes the ticket,
    // so a wrong-browser attempt must not leave it redeemable elsewhere.
    const wrongBrowser = await svc.issueTicket(OTP_PAYLOAD, 'otp_verification');
    await expect(
      svc.redeemTicket(wrongBrowser.ticket, 'otp_verification', 'wrong-nonce'),
    ).rejects.toThrow(/invalid for this browser/i);
    await expect(
      svc.redeemTicket(
        wrongBrowser.ticket,
        'otp_verification',
        wrongBrowser.bindNonce,
      ),
    ).rejects.toThrow(UnauthorizedException); // consumed by the failed attempt

    const noNonce = await svc.issueTicket(OTP_PAYLOAD, 'otp_verification');
    await expect(
      svc.redeemTicket(noNonce.ticket, 'otp_verification'),
    ).rejects.toThrow(/invalid for this browser/i);

    // correct browser still redeems its own fresh ticket
    const correct = await svc.issueTicket(OTP_PAYLOAD, 'otp_verification');
    const redeemed = await svc.redeemTicket(
      correct.ticket,
      'otp_verification',
      correct.bindNonce,
    );
    expect(redeemed.email).toBe(OTP_PAYLOAD.email);
  });

  it('otp ticket redeemed with a mismatched purpose is rejected and consumed', async () => {
    const { ticket, bindNonce } = await svc.issueTicket(
      OTP_PAYLOAD,
      'otp_verification',
    );
    await expect(
      svc.redeemTicket(ticket, 'admin_login', bindNonce),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      svc.redeemTicket(ticket, 'otp_verification', bindNonce),
    ).rejects.toThrow(UnauthorizedException); // consumed — no reuse
  });

  it('the other OAuth purposes remain functional', async () => {
    const purposes: OAuthExchangePurpose[] = [
      'admin_login',
      'cashier_signup',
      'shop_registration',
    ];
    for (const purpose of purposes) {
      const { ticket, bindNonce } = await svc.issueTicket(
        { v: purpose },
        purpose,
      );
      const redeemed = await svc.redeemTicket(ticket, purpose, bindNonce);
      expect(redeemed.v).toBe(purpose);
    }
  });

  // ── Phase 2 + controller flow: real AuthController, real ticket store ──

  const FRONTEND = 'https://frontend.test';

  function mockRes() {
    return {
      setHeader: jest.fn(),
      redirect: jest.fn(),
    } as any;
  }

  function mockReq(overrides: Record<string, any> = {}) {
    return {
      ip: '127.0.0.1',
      connection: {},
      get: () => 'test-agent',
      oauthStatePurpose: 'admin_login',
      user: {
        googleId: 'g-123',
        email: OTP_PAYLOAD.email,
        name: OTP_PAYLOAD.userName,
        avatarUrl: undefined,
      },
      ...overrides,
    } as any;
  }

  function buildAuthServiceDeps(userOverrides: Record<string, any> = {}) {
    const user: any = {
      _id: new mongoose.Types.ObjectId(),
      email: OTP_PAYLOAD.email,
      name: OTP_PAYLOAD.userName,
      role: 'admin',
      shopId: new mongoose.Types.ObjectId(),
      googleId: 'g-123',
      status: 'active',
      emailVerified: true,
      ...userOverrides,
    };
    const shop: any = {
      _id: user.shopId,
      name: OTP_PAYLOAD.shopName,
      status: 'active',
    };
    const usersService: any = {
      findByGoogleId: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(user),
      linkGoogleAccount: jest.fn().mockResolvedValue({}),
      updateEmailVerified: jest.fn().mockResolvedValue({}),
    };
    const shopsService: any = { findById: jest.fn().mockResolvedValue(shop) };
    const otpService: any = {
      sendLoginOtp: jest.fn().mockResolvedValue({}),
      verifyOtp: jest.fn().mockResolvedValue({ valid: true }),
    };
    const tokenService: any = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'at-hotfix',
        refreshToken: 'rt-hotfix',
        csrfToken: 'cs-hotfix',
        expiresIn: 900,
        sessionId: 'sess-1',
      }),
    };
    const loginHistoryModel: any = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({}),
    }));
    const activityService: any = {
      logActivity: jest.fn().mockResolvedValue({}),
    };
    return {
      user,
      shop,
      usersService,
      shopsService,
      otpService,
      tokenService,
      loginHistoryModel,
      activityService,
    };
  }

  function buildAuthService(
    deps: ReturnType<typeof buildAuthServiceDeps>,
    device?: any,
  ) {
    return new AuthService(
      deps.usersService,
      deps.shopsService,
      {} as any,
      {} as any,
      deps.loginHistoryModel,
      deps.tokenService,
      deps.activityService,
      undefined,
      undefined,
      undefined,
      deps.otpService,
      device,
    );
  }

  function buildController(authService: any) {
    const configService: any = {
      get: (k: string) => (k === 'FRONTEND_URL' ? FRONTEND : undefined),
    };
    const cookieService: any = { setOAuthBindingCookie: jest.fn() };
    return new AuthController(
      authService,
      {} as any,
      {} as any,
      configService,
      svc,
      cookieService,
    );
  }

  it('FULL FLOW: existing Google user requiring OTP is redirected with a redeemable otp ticket (was: schema 500)', async () => {
    const deps = buildAuthServiceDeps({ emailVerified: false });
    const controller = buildController(buildAuthService(deps));
    const res = mockRes();

    await controller.googleAuthCallback(mockReq(), res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const url = res.redirect.mock.calls[0][0] as string;
    expect(url).toMatch(
      new RegExp(`^${FRONTEND}/login\\?otp=true&otp_ticket=[0-9a-f]{64}$`),
    );

    // The ticket in the URL redeems for the correct browser — proving it
    // PERSISTED (the bug: the write failed with a schema ValidationError).
    const ticket = new URL(url).searchParams.get('otp_ticket')!;
    const bindNonce = (controller as any).cookieService.setOAuthBindingCookie
      .mock.calls[0][1] as string;
    const payload = (await svc.redeemTicket(
      ticket,
      'otp_verification',
      bindNonce,
    )) as any;
    expect(payload.email).toBe(OTP_PAYLOAD.email);
    expect(payload.userName).toBe(OTP_PAYLOAD.userName);
    expect(payload.shopName).toBe(OTP_PAYLOAD.shopName);
    expect(payload.isGoogleLogin).toBe(true);
    expect(payload.bindNonce).toBeUndefined();
  });

  it('FULL FLOW (cashier): cashier requiring OTP is NOT misclassified as an admin and receives the otp ticket', async () => {
    const deps = buildAuthServiceDeps({
      role: 'cashier',
      emailVerified: false,
    });
    const controller = buildController(buildAuthService(deps));
    const res = mockRes();

    await controller.googleAuthCallback(
      mockReq({ oauthStatePurpose: 'cashier_login' }),
      res,
    );

    const url = res.redirect.mock.calls[0][0] as string;
    expect(url).toMatch(/\/login\?otp=true&otp_ticket=/);
    const ticket = new URL(url).searchParams.get('otp_ticket')!;
    const bindNonce = (controller as any).cookieService.setOAuthBindingCookie
      .mock.calls[0][1] as string;
    const payload = (await svc.redeemTicket(
      ticket,
      'otp_verification',
      bindNonce,
    )) as any;
    expect(payload.email).toBe(OTP_PAYLOAD.email);
  });

  it('role restriction: admin account in the cashier flow is still rejected with the clear message', async () => {
    const deps = buildAuthServiceDeps({ role: 'admin', emailVerified: false });
    const controller = buildController(buildAuthService(deps));
    const res = mockRes();

    await controller.googleAuthCallback(
      mockReq({ oauthStatePurpose: 'cashier_login' }),
      res,
    );

    const url = res.redirect.mock.calls[0][0] as string;
    expect(url).toMatch(/\/login\?error=/);
    const msg = decodeURIComponent(
      new URL(url).searchParams.get('error') as string,
    );
    expect(msg).toMatch(/linked to an admin account/i);
  });

  it('admin flow without OTP still completes via the admin_login ticket (tokens redeemable once)', async () => {
    const deps = buildAuthServiceDeps();
    const device: any = {
      generateFingerprint: () => 'fp',
      shouldRequireOtp: jest.fn().mockResolvedValue({ required: false }),
      recordLoginAttempt: jest.fn().mockResolvedValue({}),
    };
    const controller = buildController(buildAuthService(deps, device));
    const res = mockRes();

    await controller.googleAuthCallback(mockReq(), res);

    const url = res.redirect.mock.calls[0][0] as string;
    expect(url).toMatch(
      new RegExp(
        `^${FRONTEND}/auth/callback\\?success=true&ticket=[0-9a-f]{64}$`,
      ),
    );
    const ticket = new URL(url).searchParams.get('ticket')!;
    const bindNonce = (controller as any).cookieService.setOAuthBindingCookie
      .mock.calls[0][1] as string;
    const payload = (await svc.redeemTicket(
      ticket,
      'admin_login',
      bindNonce,
    )) as any;
    expect(payload.accessToken).toBe('at-hotfix');
    expect(payload.user.role).toBe('admin');
    // single-use
    await expect(
      svc.redeemTicket(ticket, 'admin_login', bindNonce),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('new-user flows still hand off via cashier_signup / shop_registration tickets', async () => {
    const deps = buildAuthServiceDeps();
    deps.usersService.findByGoogleId = jest.fn().mockResolvedValue(null);
    deps.usersService.findByEmail = jest.fn().mockResolvedValue(null);
    const controller = buildController(buildAuthService(deps));

    const resCashier = mockRes();
    await controller.googleAuthCallback(
      mockReq({ oauthStatePurpose: 'cashier_login' }),
      resCashier,
    );
    expect(resCashier.redirect.mock.calls[0][0]).toMatch(
      /\/auth\/cashier-google-signup\?google_ticket=/,
    );

    const resAdmin = mockRes();
    await controller.googleAuthCallback(mockReq(), resAdmin);
    expect(resAdmin.redirect.mock.calls[0][0]).toMatch(
      /\/register-shop\?google_ticket=/,
    );
  });

  it('Phase 2: a backend failure redirects with a friendly message and NEVER leaks raw exception details', async () => {
    const deps = buildAuthServiceDeps();
    deps.usersService.findByGoogleId = jest
      .fn()
      .mockRejectedValue(
        new Error(
          '`otp_verification` is not a valid enum value for path `purpose` at path `purpose`',
        ),
      );
    const controller = buildController(buildAuthService(deps));
    const res = mockRes();

    await controller.googleAuthCallback(mockReq(), res);

    const url = res.redirect.mock.calls[0][0] as string;
    const msg = decodeURIComponent(
      new URL(url).searchParams.get('error') as string,
    );
    expect(msg).toBe(
      'Google sign-in failed. Please try again, or sign in with your email and password.',
    );
    expect(url).not.toMatch(/enum value/i);
    expect(url).not.toMatch(/path/i);
  });

  // ── Session completion: OTP verified → valid authenticated session ──

  it('verifyLoginOtpAndGetTokens issues a valid authenticated session for the OTP user', async () => {
    const deps = buildAuthServiceDeps({ emailVerified: false });
    const authService = buildAuthService(deps);

    const result = await authService.verifyLoginOtpAndGetTokens(
      OTP_PAYLOAD.email,
      '123456',
      '127.0.0.1',
      'test-agent',
    );

    expect(deps.otpService.verifyOtp).toHaveBeenCalledWith(
      OTP_PAYLOAD.email,
      '123456',
      'login',
    );
    expect(deps.usersService.updateEmailVerified).toHaveBeenCalled();
    expect(result.tokens!.accessToken).toBe('at-hotfix');
    expect(result.user.email).toBe(OTP_PAYLOAD.email);
    expect(result.user.role).toBe('admin');
    expect(result.shop.name).toBe(OTP_PAYLOAD.shopName);
  });

  it('invalid OTP code does not issue a session', async () => {
    const deps = buildAuthServiceDeps();
    deps.otpService.verifyOtp = jest.fn().mockResolvedValue({ valid: false });
    const authService = buildAuthService(deps);

    await expect(
      authService.verifyLoginOtpAndGetTokens(OTP_PAYLOAD.email, '000000'),
    ).rejects.toThrow(UnauthorizedException);
    expect(deps.tokenService.generateTokenPair).not.toHaveBeenCalled();
  });

  // ── Email/password login (untouched path) still returns tokens ──

  it('email/password login controller path still sets cookies and returns tokens', async () => {
    const tokens = {
      accessToken: 'at-login',
      refreshToken: 'rt-login',
      csrfToken: 'cs-login',
      expiresIn: 900,
    };
    const authService: any = {
      loginWithTokens: jest.fn().mockResolvedValue({
        requiresEmailVerification: false,
        user: { id: 'u1', email: OTP_PAYLOAD.email, role: 'admin' },
        shop: { id: 's1', name: OTP_PAYLOAD.shopName },
        tokens,
      }),
    };
    const cookieService: any = { setAuthCookies: jest.fn() };
    const controller = new AuthController(
      authService,
      {} as any,
      {} as any,
      { get: () => FRONTEND } as any,
      svc,
      cookieService,
    );
    const res: any = { cookie: jest.fn() };

    const result = await controller.login(
      { email: OTP_PAYLOAD.email, password: 'pw', shopId: 's1' },
      { ip: '127.0.0.1', connection: {}, get: () => 'ua' } as any,
      res,
    );

    expect(result.tokens!.accessToken).toBe('at-login');
    expect(cookieService.setAuthCookies).toHaveBeenCalledWith(
      res,
      'at-login',
      'rt-login',
      'cs-login',
    );
  });
});
