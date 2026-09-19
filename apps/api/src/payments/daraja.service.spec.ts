import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DarajaService } from './daraja.service';

jest.mock('axios', () => ({
  create: jest.fn(() => ({ post: jest.fn() })),
  get: jest.fn(),
}));

const CONSUMER_KEY = 'SDpkLIVEkey0123456789abcdef';
const CONSUMER_KEY_PREFIX = CONSUMER_KEY.substring(0, 10);

describe('DarajaService credential logging', () => {
  let service: DarajaService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    loggerErrorSpy.mockClear();

    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          MPESA_CONSUMER_KEY: CONSUMER_KEY,
          MPESA_CONSUMER_SECRET: 'SDskLIVEsecret0123456789',
          MPESA_SHORTCODE: '174379',
          MPESA_PASSKEY: 'test-passkey-value-not-a-real-secret',
          MPESA_ENV: 'production',
        };
        return values[key] ?? defaultValue;
      }),
    };

    service = new DarajaService(configService as ConfigService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('does not log credential material when OAuth authentication fails', async () => {
    const axios = jest.requireMock('axios');
    axios.get.mockRejectedValueOnce({
      message: 'Request failed with status code 401',
      response: { status: 401, data: { error: 'invalid_credentials' } },
    });

    await expect(
      service.initiateStkPush({
        phoneNumber: '254712345678',
        amount: 100,
        accountReference: 'SD-ORD-1',
        transactionDesc: 'Payment',
        callbackUrl: 'https://example.com/callback',
      }),
    ).rejects.toThrow('Failed to authenticate with M-Pesa');

    const loggedLines = loggerErrorSpy.mock.calls.map((call) => call.map(String).join(' '));

    expect(loggedLines.some((line) => line.includes(CONSUMER_KEY))).toBe(false);
    expect(loggedLines.some((line) => line.includes(CONSUMER_KEY_PREFIX))).toBe(false);
    expect(loggedLines.some((line) => line.includes('Credentials configured:'))).toBe(true);
  });
});
