import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionControlsService } from './transaction-controls.service';
import { TransactionControlsController } from './transaction-controls.controller';
import { Order } from './schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import {
  InventoryClaim,
  InventoryClaimItemState,
  InventoryClaimState,
} from '../inventory/schemas/inventory-claim.schema';

describe('TransactionControlsService inventory consistency', () => {
  let service: TransactionControlsService;
  let controller: TransactionControlsController;
  let orderModel: any;
  let inventoryClaimModel: any;
  let inventoryService: any;

  const SHOP_ID = '507f1f77bcf86cd799439011';
  const ORDER_ID = '507f1f77bcf86cd799439014';
  const CASHIER_ID = '507f1f77bcf86cd799439012';

  function makeOrder(overrides: Record<string, any> = {}) {
    return {
      _id: new Types.ObjectId(ORDER_ID),
      shopId: new Types.ObjectId(SHOP_ID),
      orderNumber: 'STK-2026-ABC123',
      status: 'pending',
      paymentStatus: 'unpaid',
      items: [
        { productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100, lineTotal: 200 },
      ],
      total: 232,
      ...overrides,
    };
  }

  beforeEach(async () => {
    orderModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue([]),
    };
    inventoryService = {
      updateStock: jest.fn().mockResolvedValue({ stock: 12 }),
      createStockAdjustment: jest.fn().mockResolvedValue({}),
    };

    // Durable-claim simulation (SDV2-005): no claim by default -> legacy path.
    inventoryClaimModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionControlsService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(InventoryClaim.name), useValue: inventoryClaimModel },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<TransactionControlsService>(TransactionControlsService);
    controller = new TransactionControlsController(service);
  });

  describe('voidTransaction', () => {
    it('restores stock for a voided pending order (reservation release) with an audit trail', async () => {
      const order = makeOrder();
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, status: 'void' });

      await service.voidTransaction(ORDER_ID, SHOP_ID, 'Customer abandoned M-Pesa payment', CASHIER_ID, false);

      // The release is gated by an atomic terminal-state claim
      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: { $ne: 'void' } }),
        expect.anything(),
        expect.anything(),
      );

      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prod1', 2);
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
        SHOP_ID,
        'prod1',
        2,
        'void',
        CASHIER_ID,
        expect.stringContaining('STK-2026-ABC123'),
      );
    });

    it('restores stock exactly once - a second void is rejected without touching stock', async () => {
      const order = makeOrder();
      orderModel.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: 'void' });
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, status: 'void' });

      await service.voidTransaction(ORDER_ID, SHOP_ID, 'First void', CASHIER_ID, false);

      await expect(
        service.voidTransaction(ORDER_ID, SHOP_ID, 'Second void', CASHIER_ID, false),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledTimes(1);
    });

    it('does not restore stock when the void update loses a race (claim-based exactly-once)', async () => {
      const order = makeOrder();
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue(null); // lost the claim race

      await expect(
        service.voidTransaction(ORDER_ID, SHOP_ID, 'Void', CASHIER_ID, false),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('gates the release on an atomic terminal-state claim (status $ne void in the update filter)', async () => {
      const order = makeOrder();
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, status: 'void' });

      await service.voidTransaction(ORDER_ID, SHOP_ID, 'Concurrent void', CASHIER_ID, false);

      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: { $ne: 'void' } }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('cannot void another shop\'s order (tenant isolation - no restoration, no state change)', async () => {
      orderModel.findOne.mockResolvedValue(null);

      await expect(
        service.voidTransaction(ORDER_ID, '507f1f77bcf86cd799439099', 'Cross-shop attempt', CASHIER_ID, false),
      ).rejects.toThrow(NotFoundException);

      expect(orderModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        shopId: expect.any(Types.ObjectId),
      });
      expect(orderModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(inventoryService.createStockAdjustment).not.toHaveBeenCalled();
    });
  });

  describe('processRefund', () => {
    it('restores stock when a full refund voids the order', async () => {
      const order = makeOrder({ status: 'completed', total: 200 });
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, status: 'void' });

      await service.processRefund(ORDER_ID, SHOP_ID, 200, 'Returned all items', CASHIER_ID, false);

      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prod1', 2);
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
        SHOP_ID,
        'prod1',
        2,
        'refund',
        CASHIER_ID,
        expect.any(String),
      );
    });

    it('does not restore stock for a partial refund (order stays completed)', async () => {
      const order = makeOrder({ status: 'completed' });
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, refundAmount: 50 });

      await service.processRefund(ORDER_ID, SHOP_ID, 50, 'Partial return', CASHIER_ID, false);

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });
    it('does not restore stock for a partial refund (order stays completed)', async () => {
      const order = makeOrder({ status: 'completed' });
      orderModel.findOne.mockResolvedValue(order);
      orderModel.findOneAndUpdate.mockResolvedValue({ ...order, refundAmount: 50 });

      await service.processRefund(ORDER_ID, SHOP_ID, 50, 'Partial return', CASHIER_ID, false);

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });
  });

  describe('wired route contract (POST /transactions/void)', () => {
    it('passes the authenticated shop and cashier context to the release service with approval required', async () => {
      const voidSpy = jest.spyOn(service, 'voidTransaction').mockResolvedValue({} as any);

      await controller.voidTransaction(
        { orderId: ORDER_ID, voidReason: 'Customer abandoned M-Pesa payment' },
        { shopId: SHOP_ID, sub: CASHIER_ID },
      );

      expect(voidSpy).toHaveBeenCalledWith(
        ORDER_ID,
        SHOP_ID,
        'Customer abandoned M-Pesa payment',
        CASHIER_ID,
        true,
      );
      voidSpy.mockRestore();
    });
  });
});
