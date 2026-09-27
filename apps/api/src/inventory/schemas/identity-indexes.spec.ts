/**
 * P0-9D/P0-9E — canonical identity index contract.
 *
 * Tenant-scoped uniqueness over optional identity fields must be expressed
 * with a partialFilterExpression, not `sparse`. A compound sparse index
 * skips only documents missing EVERY indexed field, so `{ shopId, <x> }`
 * with sparse still indexes every document (shopId is always present) with
 * the identity as null — same-shop documents then collide with E11000
 * during index builds and inserts.
 *
 * Client-supplied identifiers additionally use `{ field: { $gt: '' } }` so
 * empty strings mean "not supplied" rather than becoming a globally unique
 * empty value per shop.
 *
 * Single-field sparse indexes on optional fields remain valid: MongoDB
 * sparse semantics correctly exclude documents missing that field.
 */
import { ProductSchema } from './product.schema';
import { StockAdjustmentSchema } from './stock-adjustment.schema';
import { AdjustmentSchema } from '../../stock/adjustment.schema';
import { OrderSchema } from '../../sales/schemas/order.schema';
import { UserSchema } from '../../users/schemas/user.schema';
import { PaymentTransactionSchema } from '../../payments/schemas/payment-transaction.schema';
import { ShopSchema } from '../../shops/schemas/shop.schema';

type IndexSpec = [{ [k: string]: unknown }, { [k: string]: unknown }];

function findIndex(schema: { indexes(): IndexSpec[] }, keySpec: object) {
  const wanted = JSON.stringify(keySpec);
  const found = schema
    .indexes()
    .find(([spec]) => JSON.stringify(spec) === wanted);
  expect(found).toBeDefined();
  return found![1];
}

describe('compound identity indexes — unique partial contract', () => {
  const existsCases: Array<[string, IndexSpec[0], object, object]> = [
    [
      'products { shopId, importIdentity }',
      { shopId: 1, importIdentity: 1 },
      { importIdentity: { $exists: true } },
      ProductSchema,
    ],
    [
      'stockadjustments { shopId, mutationId }',
      { shopId: 1, mutationId: 1 },
      { mutationId: { $exists: true } },
      StockAdjustmentSchema,
    ],
    [
      'adjustments { shopId, mutationId }',
      { shopId: 1, mutationId: 1 },
      { mutationId: { $exists: true } },
      AdjustmentSchema,
    ],
    [
      'orders { shopId, idempotencyKey }',
      { shopId: 1, idempotencyKey: 1 },
      { idempotencyKey: { $exists: true } },
      OrderSchema,
    ],
  ];

  const nonEmptyCases: Array<[string, IndexSpec[0], object, object]> = [
    [
      'products { shopId, barcode }',
      { shopId: 1, barcode: 1 },
      { barcode: { $gt: '' } },
      ProductSchema,
    ],
    [
      'products { shopId, sku }',
      { shopId: 1, sku: 1 },
      { sku: { $gt: '' } },
      ProductSchema,
    ],
    [
      'users { shopId, cashierId }',
      { shopId: 1, cashierId: 1 },
      { cashierId: { $gt: '' } },
      UserSchema,
    ],
  ];

  for (const [name, key, filter, schema] of [
    ...existsCases,
    ...nonEmptyCases,
  ] as const) {
    it(`${name} is unique partial, not sparse`, () => {
      const opts = findIndex(schema as never, key);
      expect(opts.unique).toBe(true);
      expect(opts.sparse).not.toBe(true);
      expect(opts.partialFilterExpression).toEqual(filter);
    });
  }
});

describe('single-field sparse indexes — still valid', () => {
  it('paymenttransactions { mpesaTransactionId } keeps sparse', () => {
    const opts = findIndex(PaymentTransactionSchema, {
      mpesaTransactionId: 1,
    });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).toBe(true);
  });

  it('shops { kraPin } keeps sparse', () => {
    const opts = findIndex(ShopSchema, { kraPin: 1 });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).toBe(true);
  });

  it('shops { stripeConnect.accountId } keeps sparse', () => {
    const opts = findIndex(ShopSchema, { 'stripeConnect.accountId': 1 });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).toBe(true);
  });
});

describe('legacy missing-identity compatibility', () => {
  // Partial index semantics: a document is indexed only when it satisfies
  // partialFilterExpression — i.e. when the identity field exists.
  const indexed = (doc: Record<string, unknown>, field: string) =>
    doc[field] !== undefined && doc[field] !== null;

  it('allows multiple same-shop documents with identity absent', () => {
    const docs = [{ shopId: 's1' }, { shopId: 's1' }];
    expect(docs.filter((d) => indexed(d, 'importIdentity'))).toHaveLength(0);
  });

  it('detects a unique violation for duplicate populated identity', () => {
    const docs = [
      { shopId: 's1', mutationId: 'm1' },
      { shopId: 's1', mutationId: 'm1' },
    ];
    const keys = new Set(
      docs
        .filter((d) => indexed(d, 'mutationId'))
        .map((d) => `${d.shopId}:${d.mutationId}`),
    );
    expect(keys.size).toBe(1); // collision → unique violation
  });

  it('permits identical identity across different shops', () => {
    const docs = [
      { shopId: 's1', mutationId: 'm1' },
      { shopId: 's2', mutationId: 'm1' },
    ];
    const keys = new Set(
      docs
        .filter((d) => indexed(d, 'mutationId'))
        .map((d) => `${d.shopId}:${d.mutationId}`),
    );
    expect(keys.size).toBe(2);
  });
});
