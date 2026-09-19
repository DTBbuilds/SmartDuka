import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { SubscriptionInvoice } from './schemas/subscription-invoice.schema';
import { Subscription } from './schemas/subscription.schema';
import { SystemConfig } from '../super-admin/schemas/system-config.schema';
import { PaymentAttempt } from './schemas/payment-attempt.schema';
import { Shop } from '../shops/schemas/shop.schema';
import { User } from '../users/schemas/user.schema';
import { MpesaEncryptionService } from '../payments/services/mpesa-encryption.service';
import { EmailService } from '../notifications/email.service';
import { SubscriptionsService } from './subscriptions.service';

function successCallback() {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-1',
        CheckoutRequestID: 'CK-1',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 1000 },
            { Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' },
            { Name: 'TransactionDate', Value: '20260920120000' },
          ],
        },
      },
    },
  };
}

describe('SubscriptionMpesaService callback idempotency', () => {
  let service: SubscriptionMpesaService;
  let invoiceModel: any;
  let subscriptionModel: any;

  beforeEach(async () => {
    invoiceModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      create: jest.fn(),
    };
    subscriptionModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionMpesaService,
        { provide: getModelToken(SubscriptionInvoice.name), useValue: invoiceModel },
        { provide: getModelToken(Subscription.name), useValue: subscriptionModel },
        { provide: getModelToken(SystemConfig.name), useValue: {} },
        { provide: getModelToken(PaymentAttempt.name), useValue: { create: jest.fn() } },
        { provide: getModelToken(Shop.name), useValue: { findById: jest.fn().mockReturnValue({ lean: async () => ({ name: 'Shop' }) }) } },
        { provide: getModelToken(User.name), useValue: { findOne: jest.fn().mockReturnValue({ lean: async () => ({ email: 'admin@shop.test' }) }) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MpesaEncryptionService, useValue: { decrypt: jest.fn(), decryptMpesaConfig: jest.fn(), encryptMpesaConfig: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: SubscriptionsService, useValue: { activatePendingUpgrade: jest.fn() } },
      ],
    }).compile();

    service = module.get<SubscriptionMpesaService>(SubscriptionMpesaService);
    jest.spyOn(service, 'notifySuperAdminPayment').mockResolvedValue(undefined);
  });

  function makeInvoice(status = 'pending') {
    return {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(),
      subscriptionId: new Types.ObjectId(),
      invoiceNumber: 'INV-1',
      status,
      totalAmount: 1000,
      paymentAttempt: { checkoutRequestId: 'CK-1', merchantRequestId: 'MR-1', phoneNumber: '254712345678' },
    };
  }

  it('marks the invoice paid and activates the subscription exactly once on success', async () => {
    const invoice = {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(),
      subscriptionId: new Types.ObjectId(),
      invoiceNumber: 'INV-1',
      status: 'pending',
      totalAmount: 1000,
      paymentAttempt: { checkoutRequestId: 'CK-1', merchantRequestId: 'MR-1', phoneNumber: '254712345678' },
    };
    invoiceModel.findOne.mockResolvedValue(invoice);
    invoiceModel.findOneAndUpdate.mockImplementation(async (_filter, update) => {
      Object.assign(invoice, update.$set);
      return invoice;
    });
    subscriptionModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), billingCycle: 'monthly', pendingUpgrade: null });
    invoiceModel.findById.mockResolvedValue(invoice);
    subscriptionModel.findById.mockResolvedValue({ lean: async () => ({ planCode: 'starter' }) });
    subscriptionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await service.handleStkCallback(successCallback());

    expect(invoiceModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: invoice._id, status: { $ne: 'paid' } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'paid' }) }),
      expect.anything(),
    );
    expect(subscriptionModel.updateOne).toHaveBeenCalledTimes(1);
  });

  it('does not reactivate the subscription when a duplicate success callback arrives', async () => {
    const invoice = {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(),
      subscriptionId: new Types.ObjectId(),
      invoiceNumber: 'INV-1',
      status: 'pending',
      totalAmount: 1000,
      paymentAttempt: { checkoutRequestId: 'CK-1', merchantRequestId: 'MR-1', phoneNumber: '254712345678' },
    };
    invoiceModel.findOne.mockResolvedValue(invoice);
    invoiceModel.findOneAndUpdate
      .mockImplementationOnce(async (_filter, update) => {
        Object.assign(invoice, update.$set);
        return invoice;
      })
      .mockResolvedValueOnce(null);
    subscriptionModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), billingCycle: 'monthly', pendingUpgrade: null });
    invoiceModel.findById.mockResolvedValue(invoice);
    subscriptionModel.findById.mockResolvedValue({ lean: async () => ({ planCode: 'starter' }) });
    subscriptionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await service.handleStkCallback(successCallback());
    await service.handleStkCallback(successCallback());

    expect(subscriptionModel.updateOne).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a paid invoice when a failure callback arrives afterwards', async () => {
    const invoice = {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(),
      subscriptionId: new Types.ObjectId(),
      invoiceNumber: 'INV-1',
      status: 'paid',
      totalAmount: 1000,
      paymentAttempt: { checkoutRequestId: 'CK-1', merchantRequestId: 'MR-1', phoneNumber: '254712345678' },
    };
    invoiceModel.findOne.mockResolvedValue(invoice);
    invoiceModel.findOneAndUpdate.mockResolvedValue(null);

    await service.handleStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'MR-1',
          CheckoutRequestID: 'CK-1',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    });

    expect(invoiceModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: invoice._id, status: { $ne: 'paid' } }),
      expect.anything(),
    );
    expect(invoiceModel.updateOne).not.toHaveBeenCalled();
  });
});
