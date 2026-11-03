import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './services/mpesa.service';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { MpesaTransactionManagerService } from './services/mpesa-transaction-manager.service';
import { MpesaReconciliationService } from './services/mpesa-reconciliation.service';
import { OrderPaymentAuthorityService } from './services/order-payment-authority.service';

/**
 * MPESA-P0 CONVERGENCE1 — F-48 REGRESSION SHIELD
 *
 * F-48: `MpesaCallbackDto.Body` had no class-validator decorators, so the
 * global ValidationPipe (`whitelist: true, forbidNonWhitelisted: true`,
 * exactly as configured in main.ts) rejected EVERY callback — including
 * genuine Daraja callbacks — with 400 "property Body should not exist".
 * No callback ever reached `MpesaService.processCallback`.
 *
 * These tests boot a real Nest HTTP app with the EXACT global pipe
 * configuration from main.ts and prove:
 *   - a real Safaricom Daraja callback (success and failure shapes,
 *     including the `Balance` metadata item that carries no `Value`) passes
 *     validation and reaches the handler;
 *   - malformed payloads are rejected with 400;
 *   - the global whitelist/forbidNonWhitelisted protections are preserved.
 *
 * Validation is NOT proof of payment — the handler still verifies every
 * callback server-to-server (F-08); see cashier-p0-mpesa-callback.spec.ts.
 */
describe('MPESA-P0 CONVERGENCE1 F-48 callback validation', () => {
  let app: any;
  let processCallback: jest.Mock;

  // Real Safaricom Daraja STK callback shapes (documented structure).
  const darajaSuccessCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: '29115-34620561-1',
        CheckoutRequestID: 'ws_CO_191220191020363925',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 1245.0 },
            { Name: 'MpesaReceiptNumber', Value: 'SGR51YAB3C' },
            { Name: 'Balance' }, // real callbacks omit Value on zero balance
            { Name: 'TransactionDate', Value: 20191219102115 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
      },
    },
  };

  const darajaFailureCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: '29115-34620561-1',
        CheckoutRequestID: 'ws_CO_191220191020363926',
        ResultCode: 1032,
        ResultDesc: 'Request cancelled by user',
      },
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MpesaController],
      providers: [
        { provide: MpesaService, useValue: { processCallback: jest.fn() } },
        { provide: MpesaMultiTenantService, useValue: {} },
        { provide: MpesaTransactionManagerService, useValue: {} },
        { provide: MpesaReconciliationService, useValue: {} },
        { provide: OrderPaymentAuthorityService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // EXACT copy of the global ValidationPipe configuration from main.ts —
    // these protections must be preserved, never relaxed for the callback.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    const mpesaService = app.get(MpesaService);
    processCallback = mpesaService.processCallback;
    processCallback.mockResolvedValue({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    processCallback.mockClear();
  });

  const post = (payload: unknown) =>
    require('supertest')(app.getHttpServer())
      .post('/payments/mpesa/callback')
      .send(payload as any);

  it('a real Daraja SUCCESS callback passes validation and reaches the handler', async () => {
    const res = await post(darajaSuccessCallback).expect(200);

    expect(res.body.ResultCode).toBe(0);
    expect(processCallback).toHaveBeenCalledTimes(1);

    const received = processCallback.mock.calls[0][0];
    expect(received.Body.stkCallback.CheckoutRequestID).toBe(
      'ws_CO_191220191020363925',
    );
    expect(received.Body.stkCallback.MerchantRequestID).toBe(
      '29115-34620561-1',
    );
    expect(received.Body.stkCallback.ResultCode).toBe(0);
    expect(received.Body.stkCallback.CallbackMetadata.Item).toHaveLength(5);
  });

  it('a real Daraja FAILURE callback (no CallbackMetadata) reaches the handler', async () => {
    const res = await post(darajaFailureCallback).expect(200);

    expect(res.body.ResultCode).toBe(0);
    const received = processCallback.mock.calls[0][0];
    expect(received.Body.stkCallback.ResultCode).toBe(1032);
    expect(received.Body.stkCallback.CallbackMetadata).toBeUndefined();
  });

  it('a numeric-string ResultCode ("0") is normalized to a number for the handler', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    payload.Body.stkCallback.ResultCode = '0';

    await post(payload).expect(200);

    const received = processCallback.mock.calls[0][0];
    expect(received.Body.stkCallback.ResultCode).toBe(0);
    expect(typeof received.Body.stkCallback.ResultCode).toBe('number');
  });

  it('missing Body is rejected', async () => {
    await post({}).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('missing stkCallback is rejected', async () => {
    await post({ Body: {} }).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('missing CheckoutRequestID is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    delete payload.Body.stkCallback.CheckoutRequestID;

    await post(payload).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('missing MerchantRequestID is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    delete payload.Body.stkCallback.MerchantRequestID;

    await post(payload).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('a non-numeric ResultCode is rejected (never silently success or failure)', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    payload.Body.stkCallback.ResultCode = 'not-a-code';

    await post(payload).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('a metadata item without Name is rejected', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    payload.Body.stkCallback.CallbackMetadata.Item = [{ Value: 100 }];

    await post(payload).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('a non-object Body is rejected', async () => {
    await post({ Body: 'garbage' }).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('unknown top-level properties are rejected (global forbidNonWhitelisted preserved)', async () => {
    await post({ ...darajaSuccessCallback, Injected: 'x' }).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('unknown nested properties are rejected (whitelist applies recursively)', async () => {
    const payload = JSON.parse(JSON.stringify(darajaSuccessCallback));
    payload.Body.stkCallback.InjectedField = 'x';

    await post(payload).expect(400);
    expect(processCallback).not.toHaveBeenCalled();
  });

  it('the legacy callback-v2 alias runs the same validated pipeline', async () => {
    processCallback.mockClear();
    const res = await require('supertest')(app.getHttpServer())
      .post('/payments/mpesa/callback-v2')
      .send(darajaSuccessCallback)
      .expect(200);

    expect(res.body.ResultCode).toBe(0);
    expect(processCallback).toHaveBeenCalledTimes(1);
  });
});
