import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

jest.mock('nanoid', () => ({ nanoid: () => 'testnanoid' }));

/**
 * P1-13B — session-revocation enforcement in the JWT strategy.
 *
 * Before this gate, JwtStrategy.validate() returned the payload with no
 * session check: after a password reset, previously issued access
 * tokens kept full access until their 15-minute expiry. The strategy
 * now verifies the payload's sessionId against the session store
 * (terminated sessions → 401). Tokens without a sessionId skip the
 * check (legacy flows unaffected).
 */

describe('P1-13B — JwtStrategy session-revocation enforcement', () => {
  const makeStrategy = (tokenService: Partial<TokenService> | null) =>
    new JwtStrategy(
      { get: () => 'test-secret' } as unknown as ConfigService,
      (tokenService as TokenService) ?? undefined,
    );

  it('terminated session → UnauthorizedException', async () => {
    const svc = { isSessionActive: jest.fn(async () => false) };
    const strategy = makeStrategy(svc);
    await expect(
      strategy.validate({
        sub: 'u1', email: 'a@b.c', role: 'admin', shopId: 's1',
        sessionId: 'dead-session',
      } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(svc.isSessionActive).toHaveBeenCalledWith('dead-session');
  });

  it('active session → payload returned', async () => {
    const svc = { isSessionActive: jest.fn(async () => true) };
    const strategy = makeStrategy(svc);
    const payload = {
      sub: 'u1', email: 'a@b.c', role: 'admin', shopId: 's1',
      sessionId: 'live-session',
    } as any;
    expect(await strategy.validate(payload)).toBe(payload);
  });

  it('token WITHOUT sessionId (legacy) skips the session check', async () => {
    const svc = { isSessionActive: jest.fn() };
    const strategy = makeStrategy(svc);
    const payload = { sub: 'u1', email: 'a@b.c', role: 'admin', shopId: 's1' } as any;
    expect(await strategy.validate(payload)).toBe(payload);
    expect(svc.isSessionActive).not.toHaveBeenCalled();
  });

  it('tokenService unavailable → check skipped (no crash, backward compatible)', async () => {
    const strategy = makeStrategy(null);
    const payload = {
      sub: 'u1', email: 'a@b.c', role: 'admin', shopId: 's1',
      sessionId: 'whatever',
    } as any;
    expect(await strategy.validate(payload)).toBe(payload);
  });
});
