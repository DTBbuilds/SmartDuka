import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { MpesaService } from './mpesa.service';
import { DarajaService } from '../daraja.service';
import { PaymentTransactionService } from './payment-transaction.service';
import { MpesaTransaction, MpesaTransactionStatus } from '../schemas/mpesa-transaction.schema';

const SHOP_ID = new Types.ObjectId();
const ORDER_ID = new Types.ObjectId();
const CASHIER_ID = new Types.ObjectId();

function makeTransaction(overrides: Record<string, any> = {}) {
  const tx: any = {
    _id: new Types.ObjectId(),
    shopId: SHOP_ID,
    orderId: ORDER_ID,
    orderNumber: 'ORD-TEST-1',
    idempotencyKey: 'idem-1',
    checkoutRequestId: 'ws_CO_CHECKOUT_1',
    merchantRequestId: 'MR-1',
    phoneNumber: '254712345678',
    amount: 1000,
    accountReference: 'SD-ORD-TEST-1',
    status: MpesaTransactionStatus.PENDING,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    retryCount: 0,
    maxRetries: 3,
    cashierId: CASHIER_ID,
    cashierName: 'Test Cashier',
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return tx;
}

function successCallback(overrides: Record<string, any> = {}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-1',
        CheckoutRequestID: 'ws_CO_CHECKOUT_1',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 1000 },
            { Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' },
            { Name: 'PhoneNumber', Value: '254712345678' },
          ],
        },
        ...overrides,
      },
    },
  };
}

describe('MpesaService callback integrity', () => {
  let service: MpesaService;
  let transactionModel: any;
  let paymentTransactionService: { createTransaction: jest.Mock };

  beforeEach(async () => {
    transactionModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    paymentTransactionService = { createTransaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaService,
        { provide: getModelToken(MpesaTransaction.name), useValue: transactionModel },
        { provide: DarajaService, useValue: {} },
        { provide: PaymentTransactionService, useValue: paymentTransactionService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<MpesaService>(MpesaService);
  });

  it('marks a pending transaction completed and creates exactly one payment record on a valid success callback', async () => {
    const tx = makeTransaction();
    transactionModel.findOne.mockResolvedValueOnce(tx).mockResolvedValueOnce(null);
    transactionModel.findOneAndUpdate.mockResolvedValueOnce({ ...tx, status: MpesaTransactionStatus.COMPLETED });

    const result = await service.processCallback(successCallback());

    expect(result.ResultCode).toBe(0);
    expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: tx._id, status: { $in: [MpesaTransactionStatus.CREATED, MpesaTransactionStatus.PENDING] } }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: MpesaTransactionStatus.COMPLETED, mpesaReceiptNumber: 'RKL2ABCD5E' }),
      }),
      expect.anything(),
    );
    expect(paymentTransactionService.createTransaction).toHaveBeenCalledTimes(1);
    expect(paymentTransactionService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ mpesaTransactionId: 'ws_CO_CHECKOUT_1', mpesaReceiptNumber: 'RKL2ABCD5E', status: 'completed' }),
    );
  });

  it('is idempotent: a duplicate success callback does not create a second payment record', async () => {
    const tx = makeTransaction();
    transactionModel.findOne
      .mockResolvedValueOnce(tx)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });

    await service.processCallback(successCallback());
    await service.processCallback(successCallback());

    expect(paymentTransactionService.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed result code non-success and creates no payment record', async () => {
    const tx = makeTransaction();
    transactionModel.findOne.mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });

    const result = await service.processCallback(successCallback({ ResultCode: 1032, ResultDesc: 'Request cancelled by user', CallbackMetadata: undefined }));

    expect(result.ResultCode).toBe(0);
    expect(tx.status).toBe(MpesaTransactionStatus.FAILED);
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('handles a callback for an unknown CheckoutRequestID safely', async () => {
    transactionModel.findOne.mockResolvedValue(null);

    const result = await service.processCallback(successCallback({ CheckoutRequestID: 'ws_CO_UNKNOWN' }));

    expect(result.ResultCode).toBe(0);
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('does not throw or create success for a malformed callback body', async () => {
    await expect(service.processCallback({} as any)).resolves.toEqual({ ResultCode: 0, ResultDesc: 'Callback received' });
    await expect(service.processCallback(undefined as any)).resolves.toEqual({ ResultCode: 0, ResultDesc: 'Callback received' });
    await expect(service.processCallback({ Body: {} } as any)).resolves.toEqual({ ResultCode: 0, ResultDesc: 'Callback received' });
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('does not mark success when the callback amount does not match the transaction amount', async () => {
    const tx = makeTransaction();
    transactionModel.findOne.mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });

    const mismatched = successCallback();
    mismatched.Body.stkCallback.CallbackMetadata.Item[0] = { Name: 'Amount', Value: 500 };

    await service.processCallback(mismatched);

    expect(tx.status).toBe(MpesaTransactionStatus.FAILED);
    expect(tx.errorCategory).toBe('amount_mismatch');
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('does not mark success when the receipt number was already used by another transaction', async () => {
    const tx = makeTransaction();
    const otherTx = makeTransaction({ mpesaReceiptNumber: 'RKL2ABCD5E' });
    transactionModel.findOne
      .mockResolvedValueOnce(tx)
      .mockResolvedValueOnce(otherTx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });

    await service.processCallback(successCallback());

    expect(tx.status).toBe(MpesaTransactionStatus.FAILED);
    expect(tx.errorCategory).toBe('duplicate_receipt');
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects a callback whose MerchantRequestID does not match the transaction', async () => {
    const tx = makeTransaction();
    transactionModel.findOne.mockResolvedValue(tx);

    const result = await service.processCallback(successCallback({ MerchantRequestID: 'MR-OTHER' }));

    expect(result.ResultCode).toBe(0);
    expect(tx.status).toBe(MpesaTransactionStatus.PENDING);
    expect(transactionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });
});
