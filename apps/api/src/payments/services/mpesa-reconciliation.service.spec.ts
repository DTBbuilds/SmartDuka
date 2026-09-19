import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { MpesaReconciliationService } from './mpesa-reconciliation.service';
import { DarajaService } from '../daraja.service';
import { PaymentTransactionService } from './payment-transaction.service';
import { MpesaTransaction, MpesaTransactionStatus } from '../schemas/mpesa-transaction.schema';

describe('MpesaReconciliationService integrity', () => {
  let service: MpesaReconciliationService;
  let transactionModel: any;
  let darajaService: { queryStkStatus: jest.Mock };
  let paymentTransactionService: { createTransaction: jest.Mock };

  function makePendingTransaction(overrides: Record<string, any> = {}) {
    return {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(),
      orderId: new Types.ObjectId(),
      orderNumber: 'ORD-1',
      checkoutRequestId: 'ws_CO_CHECKOUT_1',
      merchantRequestId: 'MR-1',
      phoneNumber: '254712345678',
      amount: 1000,
      status: MpesaTransactionStatus.PENDING,
      cashierId: new Types.ObjectId(),
      cashierName: 'Cashier',
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  beforeEach(async () => {
    transactionModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      aggregate: jest.fn().mockResolvedValue([]),
    };
    darajaService = { queryStkStatus: jest.fn() };
    paymentTransactionService = { createTransaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaReconciliationService,
        { provide: getModelToken(MpesaTransaction.name), useValue: transactionModel },
        { provide: DarajaService, useValue: darajaService },
        { provide: PaymentTransactionService, useValue: paymentTransactionService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('false') } },
      ],
    }).compile();

    service = module.get<MpesaReconciliationService>(MpesaReconciliationService);
  });

  it('marks a pending transaction completed via STK query with a numeric result code', async () => {
    const tx = makePendingTransaction();
    transactionModel.findById.mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });
    darajaService.queryStkStatus.mockResolvedValue({ status: 'completed', resultCode: 0, resultDesc: 'Success' });

    const result = await service.reconcileTransaction(tx._id.toString());

    expect(result.success).toBe(true);
    expect(tx.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(tx.mpesaResultCode).toBe(0);
    expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: tx._id, status: MpesaTransactionStatus.PENDING }),
      expect.objectContaining({ $set: expect.objectContaining({ status: MpesaTransactionStatus.COMPLETED }) }),
      expect.anything(),
    );
  });

  it('does not create a payment record when the claim was lost to a concurrent processor', async () => {
    const tx = makePendingTransaction();
    transactionModel.findById.mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockResolvedValue(null);
    darajaService.queryStkStatus.mockResolvedValue({ status: 'completed', resultCode: 0, resultDesc: 'Success' });

    const result = await service.reconcileTransaction(tx._id.toString());

    expect(result.success).toBe(false);
    expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: tx._id, status: MpesaTransactionStatus.PENDING }),
      expect.anything(),
      expect.anything(),
    );
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('refuses to reconcile a transaction that is already in a terminal state', async () => {
    const tx = makePendingTransaction({ status: MpesaTransactionStatus.COMPLETED });
    transactionModel.findById.mockResolvedValue(tx);

    const result = await service.reconcileTransaction(tx._id.toString());

    expect(result.success).toBe(false);
    expect(darajaService.queryStkStatus).not.toHaveBeenCalled();
  });

  it('leaves a transaction pending when the STK query reports DS timeout (unknown outcome is not released)', async () => {
    const tx = makePendingTransaction();
    transactionModel.findById.mockResolvedValue(tx);
    darajaService.queryStkStatus.mockResolvedValue({ status: 'failed', resultCode: 1037, resultDesc: 'Request timeout' });

    const result = await service.reconcileTransaction(tx._id.toString());

    expect(result.success).toBe(false);
    expect(tx.status).toBe(MpesaTransactionStatus.PENDING);
    expect(transactionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('marks a pending transaction failed for a non-timeout failure result', async () => {
    const tx = makePendingTransaction();
    transactionModel.findById.mockResolvedValue(tx);
    transactionModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(tx, update.$set);
      return tx;
    });
    darajaService.queryStkStatus.mockResolvedValue({ status: 'failed', resultCode: 1, resultDesc: 'Insufficient balance' });

    const result = await service.reconcileTransaction(tx._id.toString());

    expect(result.success).toBe(true);
    expect(tx.status).toBe(MpesaTransactionStatus.FAILED);
    expect(tx.mpesaResultCode).toBe(1);
  });
});
