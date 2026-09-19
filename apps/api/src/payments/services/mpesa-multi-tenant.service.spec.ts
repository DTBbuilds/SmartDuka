import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { MpesaMultiTenantService } from './mpesa-multi-tenant.service';
import { MpesaEncryptionService } from './mpesa-encryption.service';
import { MpesaTransaction, MpesaTransactionStatus } from '../schemas/mpesa-transaction.schema';
import { Shop } from '../../shops/schemas/shop.schema';

const SHOP_ID = '507f1f77bcf86cd799439011';

function makeShop() {
  return {
    _id: new Types.ObjectId(SHOP_ID),
    mpesaConfig: {
      enabled: true,
      type: 'paybill',
      shortCode: '174379',
      consumerKey: 'encrypted-key',
      consumerSecret: 'encrypted-secret',
      passkey: 'encrypted-passkey',
      callbackUrl: 'https://example.com/api/v1/payments/mpesa/callback',
      verificationStatus: 'verified',
    },
  };
}

describe('MpesaMultiTenantService integrity', () => {
  let service: MpesaMultiTenantService;
  let shopModel: any;
  let transactionModel: any;
  let fetchMock: jest.Mock;
  let originalFetch: any;

  beforeEach(async () => {
    fetchMock = jest.fn();
    originalFetch = (global as any).fetch;
    (global as any).fetch = fetchMock;
    shopModel = {
      findById: jest.fn().mockReturnValue({ exec: async () => makeShop() }),
      findByIdAndUpdate: jest.fn(),
    };
    transactionModel = Object.assign(
      jest.fn().mockImplementation((doc: any) => {
        doc._id = doc._id ?? new Types.ObjectId();
        doc.save = jest.fn().mockResolvedValue(true);
        return doc;
      }),
      {
        findOne: jest.fn().mockReturnValue({ exec: async () => null }),
        findOneAndUpdate: jest.fn(),
        findByIdAndUpdate: jest.fn(),
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaMultiTenantService,
        { provide: getModelToken(Shop.name), useValue: shopModel },
        { provide: getModelToken(MpesaTransaction.name), useValue: transactionModel },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sandbox') } },
        {
          provide: MpesaEncryptionService,
          useValue: {
            decryptMpesaConfig: jest.fn().mockReturnValue({ consumerKey: 'ck', consumerSecret: 'cs', passkey: 'pk' }),
            encryptMpesaConfig: jest.fn(),
            decrypt: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MpesaMultiTenantService>(MpesaMultiTenantService);
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  describe('initiateSTKPush', () => {
    it('persists a transaction with a schema-valid status and required fields on success', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: '3599' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ResponseCode: '0', CheckoutRequestID: 'CK-1', MerchantRequestID: 'MR-1' }),
        });

      let constructedDoc: any;
      transactionModel.mockImplementation((doc: any) => {
        constructedDoc = doc;
        doc._id = doc._id ?? new Types.ObjectId();
        doc.save = jest.fn().mockResolvedValue(true);
        return doc;
      });

      const result = await service.initiateSTKPush({
        shopId: SHOP_ID,
        phoneNumber: '254712345678',
        amount: 1000,
        orderId: '507f1f77bcf86cd799439012',
        orderNumber: 'ORD-TEST-1',
        description: 'Payment',
        cashierId: '507f1f77bcf86cd799439013',
        cashierName: 'Cashier',
      });

      expect(result.success).toBe(true);
      expect(constructedDoc).toBeDefined();
      expect(constructedDoc.status).toBe(MpesaTransactionStatus.PENDING);
      expect(constructedDoc.orderNumber).toBe('ORD-TEST-1');
      expect(constructedDoc.idempotencyKey).toBeDefined();
      expect(constructedDoc.expiresAt).toBeInstanceOf(Date);
      expect(constructedDoc.cashierId).toBeInstanceOf(Types.ObjectId);
      expect(constructedDoc.cashierName).toBe('Cashier');
    });

    it('reports failure without throwing when the STK request is rejected', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: '3599' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ResponseCode: '1', errorMessage: 'Invalid request' }) });

      const result = await service.initiateSTKPush({
        shopId: SHOP_ID,
        phoneNumber: '254712345678',
        amount: 1000,
        orderId: '507f1f77bcf86cd799439012',
        orderNumber: 'ORD-TEST-1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('ignores a duplicate callback for an already-completed transaction', async () => {
      const tx = { _id: new Types.ObjectId(), shopId: new Types.ObjectId(), checkoutRequestId: 'CK-1', status: MpesaTransactionStatus.COMPLETED };
      transactionModel.findOne.mockReturnValue({ exec: async () => tx });

      const result = await service.handleCallback({ Body: { stkCallback: { CheckoutRequestID: 'CK-1', MerchantRequestID: 'MR-1', ResultCode: 0, ResultDesc: 'ok' } } });

      expect(result.success).toBe(true);
      expect(transactionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('atomically transitions a pending transaction to completed with schema-valid fields', async () => {
      const tx = { _id: new Types.ObjectId(), shopId: new Types.ObjectId(), checkoutRequestId: 'CK-1', status: MpesaTransactionStatus.PENDING };
      transactionModel.findOne.mockReturnValue({ exec: async () => tx });
      transactionModel.findOneAndUpdate.mockResolvedValue({ ...tx, status: MpesaTransactionStatus.COMPLETED });

      const result = await service.handleCallback({
        Body: {
          stkCallback: {
            CheckoutRequestID: 'CK-1',
            MerchantRequestID: 'MR-1',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' }] },
          },
        },
      });

      expect(result.success).toBe(true);
      expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: tx._id, status: { $in: [MpesaTransactionStatus.CREATED, MpesaTransactionStatus.PENDING] } }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: MpesaTransactionStatus.COMPLETED, mpesaReceiptNumber: 'RKL2ABCD5E' }),
        }),
        expect.anything(),
      );
    });
  });

  describe('querySTKStatus', () => {
    it('only updates transactions that are still mutable (created/pending)', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: '3599' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ResultCode: '1032', ResultDesc: 'Cancelled' }) });

      await service.querySTKStatus(SHOP_ID, 'CK-1');

      expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ checkoutRequestId: 'CK-1', status: { $in: [MpesaTransactionStatus.CREATED, MpesaTransactionStatus.PENDING] } }),
        expect.objectContaining({ $set: expect.objectContaining({ status: MpesaTransactionStatus.FAILED }) }),
      );
    });
  });
});
