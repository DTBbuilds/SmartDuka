import { MpesaService } from './payments/services/mpesa.service';
import { MpesaTransactionStatus } from './payments/schemas/mpesa-transaction.schema';

/**
 * CASHIER-P0 F-08 — M-PESA CALLBACK TRUST SHIELD
 *
 * The STK callback endpoint is public and unsigned. These tests prove the
 * service NEVER marks money received on the strength of an untrusted
 * callback alone:
 *   - a forged "success" is rejected when the provider query reports failure;
 *   - an unverifiable "success" leaves the transaction unresolved (the
 *     reconciliation loop settles it later);
 *   - an amount that does not match the initiated transaction is never
 *     completed;
 *   - a provider-verified success completes exactly like the pre-hardening
 *     flow (receipt stored, payment transaction recorded).
 */
describe('CASHIER-P0 F-08 mpesa callback verification', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const CRX = 'CRX-REQUEST-1';

  let service: MpesaService;
  let transaction: any;
  let mpesaTxnModel: any;
  let querySTKStatus: jest.Mock;
  let createTransaction: jest.Mock;
  let markIntentFailed: jest.Mock;

  const callback = (resultCode: number, amount?: number) => ({
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-1',
        CheckoutRequestID: CRX,
        ResultCode: resultCode,
        ResultDesc: resultCode === 0 ? 'Success' : 'Failed',
        ...(resultCode === 0
          ? {
              CallbackMetadata: {
                Item: [
                  ...(amount !== undefined
                    ? [{ Name: 'Amount', Value: amount }]
                    : []),
                  { Name: 'MpesaReceiptNumber', Value: 'RECEIPT01' },
                ],
              },
            }
          : {}),
      },
    },
  });

  function boot(transactionOverrides: Record<string, any> = {}) {
    transaction = {
      _id: 'txn-1',
      shopId: { toString: () => SHOP_A },
      orderId: { toString: () => '507f1f77bcf86cd799439061' },
      orderNumber: 'STK-2026-T1',
      cashierId: { toString: () => '507f1f77bcf86cd7994390a2' },
      cashierName: 'Alice',
      checkoutRequestId: CRX,
      amount: 1000,
      status: MpesaTransactionStatus.PENDING,
      stkPushSentAt: new Date(),
      save: jest.fn(async function (this: any) {
        return this;
      }),
      ...transactionOverrides,
    };
    mpesaTxnModel = { findOne: jest.fn().mockResolvedValue(transaction) };
    querySTKStatus = jest.fn();
    createTransaction = jest.fn().mockResolvedValue({});
    markIntentFailed = jest.fn().mockResolvedValue({});

    service = new MpesaService(
      mpesaTxnModel,
      {} as any,
      { createTransaction } as any,
      {} as any,
      { markIntentFailed } as any,
      { querySTKStatus } as any,
    );
  }

  it('provider-verified success completes the transaction and records payment', async () => {
    boot();
    querySTKStatus.mockResolvedValue({
      success: true,
      status: 'COMPLETED',
      resultCode: '0',
    });

    const result = await service.processCallback(callback(0, 1000));

    expect(result.ResultCode).toBe(0);
    expect(transaction.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(transaction.mpesaReceiptNumber).toBe('RECEIPT01');
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'mpesa', status: 'completed' }),
    );
  });

  it('a forged success (provider reports failure) is rejected — transaction marked FAILED, order intent released', async () => {
    boot();
    querySTKStatus.mockResolvedValue({
      success: false,
      status: 'FAILED',
      resultCode: '1',
    });

    await service.processCallback(callback(0, 1000));

    expect(transaction.status).toBe(MpesaTransactionStatus.FAILED);
    expect(createTransaction).not.toHaveBeenCalled();
    expect(markIntentFailed).toHaveBeenCalledWith(
      SHOP_A,
      expect.any(String),
      'mpesa',
    );
  });

  it('an unverifiable success claim leaves the transaction PENDING (no completion, no convergence)', async () => {
    boot();
    querySTKStatus.mockRejectedValue(new Error('provider unreachable'));

    await service.processCallback(callback(0, 1000));

    expect(transaction.status).toBe(MpesaTransactionStatus.PENDING);
    expect(transaction.errorCategory).toBe('callback_unverified');
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('a claimed amount that mismatches the initiated transaction is never completed', async () => {
    boot();
    querySTKStatus.mockResolvedValue({
      success: true,
      status: 'COMPLETED',
      resultCode: '0',
    });

    await service.processCallback(callback(0, 5));

    expect(transaction.status).toBe(MpesaTransactionStatus.PENDING);
    expect(transaction.errorCategory).toBe('amount_mismatch');
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('duplicate callbacks are idempotent (already-terminal transactions are not reprocessed)', async () => {
    boot({ status: MpesaTransactionStatus.COMPLETED });
    querySTKStatus.mockResolvedValue({
      success: true,
      status: 'COMPLETED',
      resultCode: '0',
    });

    const result = await service.processCallback(callback(0, 1000));

    expect(result.ResultDesc).toBe('Already processed');
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('a callback for an unknown CheckoutRequestID is acknowledged but ignored', async () => {
    boot();
    mpesaTxnModel.findOne.mockResolvedValue(null);

    const result = await service.processCallback(callback(0, 1000));

    expect(result.ResultCode).toBe(0);
    expect(querySTKStatus).not.toHaveBeenCalled();
  });

  // ── GATE1: forged FAILURE claims are verified too ──

  it('GATE1: a forged failure claim cannot prematurely fail a legitimate payment (provider unreachable → stays PENDING)', async () => {
    boot();
    querySTKStatus.mockRejectedValue(new Error('provider unreachable'));

    const result = await service.processCallback(callback(1032));

    expect(transaction.status).toBe(MpesaTransactionStatus.PENDING);
    expect(transaction.errorCategory).toBe('failure_claim_unverified');
    expect(markIntentFailed).not.toHaveBeenCalled();
    expect(result.ResultCode).toBe(0);
  });

  it('GATE1: a provider-confirmed failure completes the failure flow (FAILED + intent released)', async () => {
    boot();
    querySTKStatus.mockResolvedValue({
      success: false,
      status: 'FAILED',
      resultCode: '1032',
    });

    await service.processCallback(callback(1032));

    expect(transaction.status).toBe(MpesaTransactionStatus.FAILED);
    expect(markIntentFailed).toHaveBeenCalledWith(
      SHOP_A,
      expect.any(String),
      'mpesa',
    );
  });

  it('GATE1: a failure claim overruled by the provider completes the payment (money moved)', async () => {
    boot();
    querySTKStatus.mockResolvedValue({
      success: true,
      status: 'COMPLETED',
      resultCode: '0',
    });

    await service.processCallback(callback(1032));

    expect(transaction.status).toBe(MpesaTransactionStatus.COMPLETED);
    // A forged failure callback carries no CallbackMetadata, so no receipt
    // number is available locally; the reconciliation loop can attach it
    // later via the provider query trail.
    expect(transaction.mpesaReceiptNumber).toBeUndefined();
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', mpesaTransactionId: CRX }),
    );
    expect(markIntentFailed).not.toHaveBeenCalled();
  });
});
