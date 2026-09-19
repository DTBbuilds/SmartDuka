import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransaction } from '../schemas/payment-transaction.schema';
import { MpesaTransaction } from '../schemas/mpesa-transaction.schema';

describe('PaymentTransactionService idempotency', () => {
  let service: PaymentTransactionService;
  let paymentTransactionModel: any;

  beforeEach(async () => {
    paymentTransactionModel = Object.assign(jest.fn(), {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentTransactionService,
        { provide: getModelToken(PaymentTransaction.name), useValue: paymentTransactionModel },
        { provide: getModelToken(MpesaTransaction.name), useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentTransactionService>(PaymentTransactionService);
  });

  it('creates a payment transaction when no record exists for the M-Pesa transaction', async () => {
    const saved = { _id: 'new-id', mpesaTransactionId: 'ws_CO_CHECKOUT_1' };
    paymentTransactionModel.mockImplementationOnce((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(saved),
    }));

    const result = await service.createTransaction({
      shopId: '507f1f77bcf86cd799439011',
      orderId: '507f1f77bcf86cd799439012',
      orderNumber: 'ORD-1',
      cashierId: '507f1f77bcf86cd799439013',
      cashierName: 'Cashier',
      paymentMethod: 'mpesa',
      amount: 1000,
      status: 'completed',
      mpesaTransactionId: 'ws_CO_CHECKOUT_1',
      mpesaReceiptNumber: 'RKL2ABCD5E',
    });

    expect(result).toBe(saved);
  });

  it('returns the existing record instead of duplicating when the same M-Pesa transaction is recorded twice', async () => {
    const existing = { _id: 'existing-id', mpesaTransactionId: 'ws_CO_CHECKOUT_1', amount: 1000 };
    paymentTransactionModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
    const constructorFn = jest.fn();
    paymentTransactionModel.mockImplementationOnce(constructorFn);

    const result = await service.createTransaction({
      shopId: '507f1f77bcf86cd799439011',
      orderId: '507f1f77bcf86cd799439012',
      orderNumber: 'ORD-1',
      cashierId: '507f1f77bcf86cd799439013',
      cashierName: 'Cashier',
      paymentMethod: 'mpesa',
      amount: 1000,
      status: 'completed',
      mpesaTransactionId: 'ws_CO_CHECKOUT_1',
      mpesaReceiptNumber: 'RKL2ABCD5E',
    });

    expect(result).toBe(existing);
    expect(constructorFn).not.toHaveBeenCalled();
  });
});
