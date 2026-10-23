import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';

/**
 * POS-CURRENCY-CHECKOUT-P0 (Part D) — LEGACY BASE-CURRENCY REMEDIATION
 *
 * The audited exception to the currency-immutability policy: the ONLY way a
 * shop with financial records may change its base currency. Proven:
 *  - requires reviewed evidence (reason + evidenceSummary, min length);
 *  - idempotent on remediationId (the audit ledger is the dedup store);
 *  - writes a ShopAuditLog event with oldValue/newValue/reason;
 *  - performs NO historical mutation and NO conversion;
 *  - rejects unsupported currencies and no-op targets.
 */
describe('POS-CURRENCY-CHECKOUT-P0 legacy currency remediation', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const SA = '507f1f77bcf86cd799439099';

  let service: SuperAdminService;
  let shopDoc: any;
  let auditCreates: any[];
  let auditLogService: any;

  function boot(shopOverrides: any = {}) {
    shopDoc = {
      _id: SHOP,
      name: 'Load & Go',
      currency: 'AUD',
      status: 'active',
      ...shopOverrides,
    };
    auditCreates = [];
    auditLogService = {
      create: jest.fn().mockImplementation(async (dto: any) => {
        auditCreates.push(dto);
        return { _id: 'audit-1', ...dto };
      }),
      getAuditLogsByAction: jest.fn().mockResolvedValue([]),
      getShopAuditLog: jest.fn().mockResolvedValue([]),
    };
    const shopModel = {
      findById: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(shopDoc),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
      })),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation((filter: any, update: any) => {
          if (filter.currency !== undefined && shopDoc.currency !== filter.currency) {
            return { exec: jest.fn().mockResolvedValue(null) }; // CAS fails
          }
          Object.assign(shopDoc, update.$set || update);
          return { exec: jest.fn().mockResolvedValue(shopDoc) };
        }),
    };
    service = new SuperAdminService(
      shopModel as any,
      {} as any,
      { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })) } as any,
      {} as any,
      {} as any,
      auditLogService as any,
      undefined,
      undefined,
      { countDocuments: jest.fn().mockResolvedValue(0) } as any, // paymentTransactionModel
      { countDocuments: jest.fn().mockResolvedValue(0) } as any, // orderModel
    );
  }

  const validDto = {
    remediationId: 'rem-0001',
    targetCurrency: 'KES',
    reason: 'Shop operates in Kenya: KES VAT, M-Pesa, KES-denominated history',
    evidenceSummary:
      '6 orders May-Oct 2026 all KES/VAT-16%; registered before country-currency validation',
    expectedCurrentCurrency: 'AUD',
  };

  it('remediates a legacy misconfigured shop with a full audit event and no historical mutation', async () => {
    boot();
    const updated = await service.remediateBaseCurrency(SHOP, SA, validDto);
    expect(updated.currency).toBe('KES');
    expect(auditCreates).toHaveLength(1);
    expect(auditCreates[0]).toMatchObject({
      action: 'update',
      oldValue: { currency: 'AUD' },
      newValue: { currency: 'KES' },
    });
    expect(auditCreates[0].reason).toContain('currency-remediation:rem-0001');
    expect(auditCreates[0].notes).toContain('Historical records unchanged');
  });

  it('is idempotent on remediationId — a retry does not double-apply', async () => {
    boot();
    auditLogService.getAuditLogsByAction = jest
      .fn()
      .mockResolvedValue([
        { reason: 'currency-remediation:rem-0001 — earlier application' },
      ]);
    const result = await service.remediateBaseCurrency(SHOP, SA, validDto);
    expect(result).toBe(shopDoc);
    expect(auditCreates).toHaveLength(0); // no second audit event
  });

  it('rejects thin evidence (reason/evidenceSummary too short)', async () => {
    boot();
    await expect(
      service.remediateBaseCurrency(SHOP, SA, { ...validDto, reason: 'short' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.remediateBaseCurrency(SHOP, SA, {
        ...validDto,
        evidenceSummary: 'short',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(auditCreates).toHaveLength(0);
  });

  it('rejects unsupported target currencies', async () => {
    boot();
    await expect(
      service.remediateBaseCurrency(SHOP, SA, {
        ...validDto,
        targetCurrency: 'XXX',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects no-op targets (same currency)', async () => {
    boot();
    await expect(
      service.remediateBaseCurrency(SHOP, SA, {
        ...validDto,
        targetCurrency: 'AUD',
      }),
    ).rejects.toThrow(/nothing to remediate/i);
  });

  it('preflight mismatch: expected currency does not match the stored currency → conflict, no write', async () => {
    boot({ currency: 'KES' }); // concurrent change already happened
    await expect(
      service.remediateBaseCurrency(SHOP, SA, validDto),
    ).rejects.toThrow(/preflight mismatch/i);
    expect(auditCreates).toHaveLength(0);
  });

  it('CAS: a concurrent currency write between preflight and update aborts with no audit event', async () => {
    boot();
    // Preflight reads AUD; a concurrent write lands mid-flight so the atomic
    // CAS filter (currency: AUD) no longer matches → update returns null.
    const shopModel = (service as any).shopModel;
    shopModel.findOneAndUpdate = jest.fn(() => ({
      exec: jest.fn().mockResolvedValue(null), // CAS lost the race
    }));
    await expect(
      service.remediateBaseCurrency(SHOP, SA, validDto),
    ).rejects.toThrow(/Concurrent currency change detected/i);
    expect(auditCreates).toHaveLength(0);
    expect(shopDoc.currency).toBe('AUD'); // untouched by the aborted attempt
  });

  it('concurrent financial activity inside the quiet window aborts the remediation', async () => {
    boot();
    // Re-inject an order model reporting a fresh order.
    (service as any).orderModel = { countDocuments: jest.fn().mockResolvedValue(1) };
    await expect(
      service.remediateBaseCurrency(SHOP, SA, validDto),
    ).rejects.toThrow(/Concurrent financial activity/i);
    expect(auditCreates).toHaveLength(0);
    expect(shopDoc.currency).toBe('AUD');
  });

  it('missing expectedCurrentCurrency is rejected', async () => {
    boot();
    const { expectedCurrentCurrency, ...without } = validDto;
    await expect(
      service.remediateBaseCurrency(SHOP, SA, without as any),
    ).rejects.toThrow(/expectedCurrentCurrency/);
    expect(auditCreates).toHaveLength(0);
  });

  it('unknown shop is rejected', async () => {
    boot();
    service.getShopDetails = jest.fn().mockResolvedValue(null);
    await expect(
      service.remediateBaseCurrency(SHOP, SA, validDto),
    ).rejects.toThrow(NotFoundException);
  });
});
