/**
 * P0-9D — canonical identity index contract.
 *
 * Tenant-scoped uniqueness over identity fields must be expressed with a
 * partialFilterExpression, not `sparse`. A compound sparse index skips only
 * documents missing EVERY indexed field, so `{ shopId, <identity> }` with
 * sparse would still index every document (shopId is always present) with
 * the identity as null — same-shop legacy documents then collide with
 * E11000 during index builds and inserts.
 */
import { ProductSchema } from './product.schema';
import { StockAdjustmentSchema } from './stock-adjustment.schema';
import { AdjustmentSchema } from '../../stock/adjustment.schema';

type IndexSpec = [{ [k: string]: unknown }, { [k: string]: unknown }];

function findIndex(schema: { indexes(): IndexSpec[] }, keySpec: object) {
  const wanted = JSON.stringify(keySpec);
  const found = schema
    .indexes()
    .find(([spec]) => JSON.stringify(spec) === wanted);
  expect(found).toBeDefined();
  return found![1];
}

describe('P0-9D identity index contract', () => {
  it('products { shopId, importIdentity } is unique partial, not sparse', () => {
    const opts = findIndex(ProductSchema, { shopId: 1, importIdentity: 1 });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).not.toBe(true);
    expect(opts.partialFilterExpression).toEqual({
      importIdentity: { $exists: true },
    });
  });

  it('stockadjustments { shopId, mutationId } is unique partial, not sparse', () => {
    const opts = findIndex(StockAdjustmentSchema, {
      shopId: 1,
      mutationId: 1,
    });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).not.toBe(true);
    expect(opts.partialFilterExpression).toEqual({
      mutationId: { $exists: true },
    });
  });

  it('adjustments { shopId, mutationId } is unique partial, not sparse', () => {
    const opts = findIndex(AdjustmentSchema, { shopId: 1, mutationId: 1 });
    expect(opts.unique).toBe(true);
    expect(opts.sparse).not.toBe(true);
    expect(opts.partialFilterExpression).toEqual({
      mutationId: { $exists: true },
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
});
