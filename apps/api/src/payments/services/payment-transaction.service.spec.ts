import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransaction } from '../schemas/payment-transaction.schema';
import { MpesaTransaction } from '../schemas/mpesa-transaction.schema';
import { Order } from '../../sales/schemas/order.schema';

describe('PaymentTransactionService idempotency', () => {
  let service: PaymentTransactionService;
  let paymentTransactionModel: any;
  let orderModel: any;

  beforeEach(async () => {
    paymentTransactionModel = Object.assign(jest.fn(), {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });
    orderModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentTransactionService,
        { provide: getModelToken(PaymentTransaction.name), useValue: paymentTransactionModel },
        { provide: getModelToken(MpesaTransaction.name), useValue: {} },
        { provide: getModelToken(Order.name), useValue: orderModel },
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

  it('synchronizes a pending order to completed/paid when a confirmed payment is recorded', async () => {
    const order = {
      _id: 'order-1',
      status: 'pending',
      paymentStatus: 'unpaid',
      total: 1000,
      payments: [{ method: 'mpesa', amount: 1000, status: 'pending' }],
    };
    orderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    const saved = { _id: 'new-id', mpesaTransactionId: 'ws_CO_1', amount: 1000, status: 'completed' };
    paymentTransactionModel.mockImplementationOnce((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(saved),
    }));

    await service.createTransaction({
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

    expect(orderModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'order-1', status: 'pending' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          paymentStatus: 'paid',
          'payments.$[p].status': 'completed',
          'payments.$[p].mpesaReceiptNumber': 'RKL2ABCD5E',
        }),
      }),
      expect.objectContaining({ arrayFilters: [{ 'p.method': 'mpesa', 'p.status': 'pending' }] }),
    );
  });

  it('leaves completed (cash/POS) orders untouched when recording their payment transaction', async () => {
    const order = { _id: 'order-1', status: 'completed', paymentStatus: 'paid', total: 100, payments: [] };
    orderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    const saved = { _id: 'new-id', status: 'completed' };
    paymentTransactionModel.mockImplementationOnce((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(saved),
    }));

    await service.createTransaction({
      shopId: '507f1f77bcf86cd799439011',
      orderId: '507f1f77bcf86cd799439012',
      orderNumber: 'ORD-1',
      cashierId: '507f1f77bcf86cd799439013',
      cashierName: 'Cashier',
      paymentMethod: 'cash',
      amount: 100,
      status: 'completed',
    });

    expect(orderModel.updateOne).not.toHaveBeenCalled();
  });

  it('marks a partially covered pending order partial without completing it', async () => {
    const order = {
      _id: 'order-1',
      status: 'pending',
      total: 200,
      payments: [{ method: 'mpesa', amount: 50, status: 'pending' }],
    };
    orderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    const saved = { _id: 'new-id', amount: 50, status: 'completed' };
    paymentTransactionModel.mockImplementationOnce((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(saved),
    }));

    await service.createTransaction({
      shopId: '507f1f77bcf86cd799439011',
      orderId: '507f1f77bcf86cd799439012',
      orderNumber: 'ORD-1',
      cashierId: '507f1f77bcf86cd799439013',
      cashierName: 'Cashier',
      paymentMethod: 'mpesa',
      amount: 50,
      status: 'completed',
    });

    expect(orderModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ paymentStatus: 'partial' }),
      }),
      expect.anything(),
    );
  });
});
