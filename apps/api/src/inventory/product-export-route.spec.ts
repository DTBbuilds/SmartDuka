jest.mock('nanoid', () => ({ nanoid: () => 'testnanoid' }));
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

/**
 * FRONTEND-FIX1 / FIX1-A — product export route reliability.
 *
 * REGRESSION: `@Get('products/:id')` was declared BEFORE
 * `@Get('products/export')`, so Nest matched `/products/export` to the
 * parameterized route with id='export' → `new ObjectId('export')` →
 * BSONError → HTTP 500. The export endpoint was unreachable in
 * production (SDV2-002). The fix relocates the export route above the
 * parameterized one; these tests pin that order and the service-level
 * export behavior.
 */

describe('FIX1-A — product export route reliability', () => {
  it('products/export is declared BEFORE products/:id (no route shadowing)', () => {
    const proto = InventoryController.prototype as unknown as Record<string, unknown>;
    const order = Object.getOwnPropertyNames(proto);
    const exportIdx = order.indexOf('exportProducts');
    const getByIdx = order.indexOf('getProduct');
    expect(exportIdx).toBeGreaterThan(-1);
    expect(getByIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeLessThan(getByIdx);
  });

  it('route paths are distinct: export is not captured by :id', () => {
    const exportPath = Reflect.getMetadata(
      'path',
      InventoryController.prototype.exportProducts,
    );
    const idPath = Reflect.getMetadata(
      'path',
      InventoryController.prototype.getProduct,
    );
    expect(exportPath).toBe('products/export');
    expect(idPath).toBe('products/:id');
    expect(exportPath).not.toBe(idPath);
  });

  it('service export filters by the caller shop and writes CSV with headers', async () => {
    const rows = [
      {
        _id: 'p1', name: 'Tea Leaves', sku: 'TSL-OI98', barcode: 'BC1',
        price: 50, cost: 30, stock: 100, categoryId: 'c1', brand: '',
        tax: 0, status: 'active', description: 'test',
      },
    ];
    const productModel: any = {
      find: jest.fn(() => ({
        exec: async () => rows,
      })),
      db: {
        collection: jest.fn(() => ({
          find: jest.fn(() => ({
            project: jest.fn(() => ({
              toArray: async () => [],
            })),
          })),
        })),
      },
    };
    const categoryModel: any = {
      find: jest.fn(() => ({
        select: jest.fn(() => ({
          exec: async () => [{ _id: 'c1', name: 'General' }],
        })),
      })),
    };
    const svc: any = new InventoryService(
      productModel,
      categoryModel,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    const chunks: string[] = [];
    const res: any = {
      headersSent: false,
      setHeader: jest.fn(),
      send: jest.fn((c: string) => { chunks.push(c); }),
      end: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    await svc.exportProducts('507f1f77bcf86cd7994390aa', res, undefined);
    const csv = chunks.join('');
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(csv).toContain('name,sku,barcode,price,cost,stock,category');
    expect(csv).toContain('Tea Leaves');
    expect(csv).toContain('General');
    // tenant scope: the product query filtered by the caller's shopId
    const filterArg = productModel.find.mock.calls[0][0];
    expect(filterArg.shopId.toString()).toBe('507f1f77bcf86cd7994390aa');
  });

  it('empty shop exports a valid headers-only CSV (no 500)', async () => {
    const productModel: any = {
      find: jest.fn(() => ({ exec: async () => [] })),
      db: {
        collection: jest.fn(() => ({
          find: jest.fn(() => ({
            project: jest.fn(() => ({ toArray: async () => [] })),
          })),
        })),
      },
    };
    const categoryModel: any = {
      find: jest.fn(() => ({
        select: jest.fn(() => ({ exec: async () => [] })),
      })),
    };
    const svc: any = new InventoryService(
      productModel, categoryModel,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    const chunks: string[] = [];
    const res: any = {
      headersSent: false, setHeader: jest.fn(),
      send: jest.fn((c: string) => { chunks.push(c); }),
      end: jest.fn(), status: jest.fn(() => res), json: jest.fn(),
    };
    await svc.exportProducts('507f1f77bcf86cd7994390bb', res, undefined);
    const csv = chunks.join('');
    expect(csv).toContain('name,sku,barcode');
    expect(csv.split('\n').filter(Boolean).length).toBe(1); // header only
  });
});
