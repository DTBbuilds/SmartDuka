import { BadRequestException } from '@nestjs/common';
import { CurrencyPolicyService } from './currency-policy.service';

/**
 * QUALITY-CORE1 P1-B — BASE-CURRENCY IMMUTABILITY REGRESSION SHIELD
 *
 * Policy:
 *   - currency selectable at creation (out of scope here — creation is
 *     unaffected);
 *   - changeable through normal APIs ONLY before any currency-denominated
 *     financial record exists;
 *   - immutable afterwards, with guidance to create a new shop;
 *   - no automatic historical conversion.
 *
 * The evidence set deliberately covers more than "completed sales > 0":
 * pending orders, payment transactions (any status), purchases, and
 * money-bearing shifts each independently lock the currency.
 */
describe('QUALITY-CORE1 currency immutability policy', () => {
  const SHOP = '507f1f77bcf86cd799439011';

  let service: CurrencyPolicyService;
  let existsMocks: Record<string, jest.Mock>;

  function boot(existing: Record<string, boolean>) {
    existsMocks = {
      orderModel: jest.fn().mockResolvedValue(existing.orders ?? null),
      paymentTransactionModel: jest
        .fn()
        .mockResolvedValue(existing.paymentTransactions ?? null),
      purchaseModel: jest.fn().mockResolvedValue(existing.purchases ?? null),
      shiftModel: jest.fn().mockResolvedValue(existing.shifts ?? null),
    };
    service = new CurrencyPolicyService(
      { exists: existsMocks.orderModel } as any,
      { exists: existsMocks.paymentTransactionModel } as any,
      { exists: existsMocks.purchaseModel } as any,
      { exists: existsMocks.shiftModel } as any,
    );
  }

  describe('activity detection', () => {
    it('a shop with no financial records may change currency', async () => {
      boot({});
      const status = await service.getCurrencyActivityStatus(SHOP);
      expect(status.hasActivity).toBe(false);
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'UGX'),
      ).resolves.toBeUndefined();
    });

    it('a single PENDING order already locks the currency (allocations are denominated)', async () => {
      boot({ orders: { _id: 'o1' } });
      const status = await service.getCurrencyActivityStatus(SHOP);
      expect(status.hasActivity).toBe(true);
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'UGX'),
      ).rejects.toThrow(BadRequestException);
    });

    it('a failed/pending payment transaction locks the currency', async () => {
      boot({ paymentTransactions: { _id: 't1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'TZS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('a purchase locks the currency', async () => {
      boot({ purchases: { _id: 'p1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'TZS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('a money-bearing shift locks the currency', async () => {
      boot({ shifts: { _id: 's1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'TZS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('a bare opened shift with no money facts does NOT lock the currency', async () => {
      boot({});
      // The shift existence query must carry the money-fact predicate.
      await service.getCurrencyActivityStatus(SHOP);
      const shiftQuery = existsMocks.shiftModel.mock.calls[0][0];
      expect(shiftQuery.$or).toBeDefined();
      expect(shiftQuery.$or).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ openingBalance: { $gt: 0 } }),
          expect.objectContaining({ totalSales: { $gt: 0 } }),
          expect.objectContaining({ transactionCount: { $gt: 0 } }),
        ]),
      );
    });

    it('every evidence query is tenant-scoped by shopId', async () => {
      boot({});
      await service.getCurrencyActivityStatus(SHOP);
      for (const key of Object.keys(existsMocks)) {
        const query = existsMocks[key].mock.calls[0][0];
        expect(String(query.shopId)).toBe(SHOP);
      }
    });
  });

  describe('change semantics', () => {
    it('same-currency writes are always allowed (not a change)', async () => {
      boot({ orders: { _id: 'o1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'KES'),
      ).resolves.toBeUndefined();
      expect(existsMocks.orderModel).not.toHaveBeenCalled();
    });

    it('currency-undefined writes are allowed (other fields updating)', async () => {
      boot({ orders: { _id: 'o1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', undefined),
      ).resolves.toBeUndefined();
      expect(existsMocks.orderModel).not.toHaveBeenCalled();
    });

    it('the rejection guides the user to create a new shop — no silent conversion', async () => {
      boot({ orders: { _id: 'o1' } });
      await expect(
        service.assertCurrencyChangeAllowed(SHOP, 'KES', 'UGX'),
      ).rejects.toThrow(/create a new shop/i);
    });
  });
});
