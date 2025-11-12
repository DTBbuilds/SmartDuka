import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { Order } from '../sales/schemas/order.schema';

describe('PaymentReconciliationService', () => {
  let service: PaymentReconciliationService;
  let mockOrderModel: any;

  beforeEach(async () => {
    mockOrderModel = {
      find: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReconciliationService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
      ],
    }).compile();

    service = module.get<PaymentReconciliationService>(PaymentReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcilePayments', () => {
    it('should reconcile payments successfully', async () => {
      const shopId = 'shop123';
      const date = new Date();
      const actualCash = 10000;
      const reconcililedBy = 'user123';

      mockOrderModel.exec.mockResolvedValue([
        {
          payments: [{ method: 'cash', amount: 5000 }],
          total: 5000,
        },
        {
          payments: [{ method: 'cash', amount: 5000 }],
          total: 5000,
        },
      ]);

      const result = await service.reconcilePayments(
        shopId,
        date,
        actualCash,
        reconcililedBy,
      );

      expect(result).toBeDefined();
      expect(result.expectedCash).toBe(10000);
      expect(result.actualCash).toBe(10000);
      expect(result.variance).toBe(0);
      expect(result.status).toBe('reconciled');
    });

    it('should handle variance correctly', async () => {
      const shopId = 'shop123';
      const date = new Date();
      const actualCash = 9900;
      const reconcililedBy = 'user123';

      mockOrderModel.exec.mockResolvedValue([
        {
          payments: [{ method: 'cash', amount: 10000 }],
          total: 10000,
        },
      ]);

      const result = await service.reconcilePayments(
        shopId,
        date,
        actualCash,
        reconcililedBy,
      );

      expect(result.variance).toBe(-100);
      expect(result.variancePercentage).toBe(-1);
    });

    it('should mark as variance_pending for large variance', async () => {
      const shopId = 'shop123';
      const date = new Date();
      const actualCash = 9800;
      const reconcililedBy = 'user123';

      mockOrderModel.exec.mockResolvedValue([
        {
          payments: [{ method: 'cash', amount: 10000 }],
          total: 10000,
        },
      ]);

      const result = await service.reconcilePayments(
        shopId,
        date,
        actualCash,
        reconcililedBy,
      );

      expect(result.status).toBe('variance_pending');
    });
  });

  describe('matchTransactions', () => {
    it('should match transactions correctly', async () => {
      const shopId = 'shop123';
      const orders = [
        { total: 5000, createdAt: new Date() },
      ];
      const transactions = [
        { amount: 5000, createdAt: new Date() },
      ];

      const result = await service.matchTransactions(shopId, orders as any, transactions);

      expect(result.matched).toBe(1);
      expect(result.unmatched).toBe(0);
      expect(result.discrepancies.length).toBe(0);
    });

    it('should identify unmatched transactions', async () => {
      const shopId = 'shop123';
      const orders = [];
      const transactions = [
        { amount: 5000, createdAt: new Date() },
      ];

      const result = await service.matchTransactions(shopId, orders as any, transactions);

      expect(result.matched).toBe(0);
      expect(result.unmatched).toBe(1);
      expect(result.discrepancies.length).toBe(1);
    });
  });
});
