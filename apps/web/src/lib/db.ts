import Dexie, { Table } from 'dexie';

export interface StoredProduct {
  _id: string;
  shopId: string; // Multi-tenancy: isolate products by shop
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  updatedAt?: string;
  image?: string;
}

export interface PendingOrder {
  id?: number;
  shopId: string; // Multi-tenancy: isolate orders by shop
  createdAt: number;
  payload: {
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
    taxRate: number;
    payments: Array<{
      method: string;
      amount: number;
      reference?: string;
    }>;
    status: 'pending' | 'completed' | 'void';
    isOffline: boolean;
    notes?: string;
    customerName?: string;
    cashierId?: string;
    cashierName?: string;
  };
}

export interface MetadataRecord {
  key: string;
  shopId?: string; // Multi-tenancy: isolate metadata by shop where applicable
  value: string | number | boolean | null;
  updatedAt: number;
}

const DB_NAME = 'SmartDukaPOS';

class SmartDukaDB extends Dexie {
  products!: Table<StoredProduct, string>;
  pendingOrders!: Table<PendingOrder, number>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super(DB_NAME);
    
    // Single version schema with multi-tenancy support
    // Version 1 with shopId fields for proper tenant isolation
    this.version(1).stores({
      products: '&_id, shopId, name, categoryId, updatedAt',
      pendingOrders: '++id, shopId, createdAt',
      metadata: '&key, shopId, updatedAt',
    });
  }
}

/**
 * Delete the database completely - used for recovery from version errors
 */
export async function deleteDatabase(): Promise<void> {
  await Dexie.delete(DB_NAME);
}

// Create database instance
export const db = new SmartDukaDB();

// Handle version errors by deleting and recreating the database
if (typeof window !== 'undefined') {
  db.open().catch(async (err) => {
    if (err?.name === 'VersionError') {
      console.warn('Database version mismatch. Deleting old database for multi-tenancy security...');
      await Dexie.delete(DB_NAME);
      // Reload the page to get a fresh database
      window.location.reload();
    } else {
      console.error('Failed to open database:', err);
    }
  });
}

/**
 * Multi-tenant helper functions
 * These ensure data isolation between shops
 */

/**
 * Get pending orders for a specific shop only
 */
export async function getPendingOrdersByShop(shopId: string): Promise<PendingOrder[]> {
  if (!shopId) return [];
  return db.pendingOrders.where('shopId').equals(shopId).toArray();
}

/**
 * Get pending order count for a specific shop
 */
export async function getPendingOrderCountByShop(shopId: string): Promise<number> {
  if (!shopId) return 0;
  return db.pendingOrders.where('shopId').equals(shopId).count();
}

/**
 * Add a pending order with shop isolation
 */
export async function addPendingOrder(shopId: string, order: Omit<PendingOrder, 'shopId'>): Promise<number> {
  if (!shopId) throw new Error('shopId is required for multi-tenant isolation');
  return db.pendingOrders.add({ ...order, shopId });
}

/**
 * Delete a pending order (verifies shop ownership)
 */
export async function deletePendingOrder(shopId: string, orderId: number): Promise<void> {
  if (!shopId) throw new Error('shopId is required for multi-tenant isolation');
  const order = await db.pendingOrders.get(orderId);
  if (order && order.shopId === shopId) {
    await db.pendingOrders.delete(orderId);
  }
}

/**
 * Get products for a specific shop only
 */
export async function getProductsByShop(shopId: string): Promise<StoredProduct[]> {
  if (!shopId) return [];
  return db.products.where('shopId').equals(shopId).toArray();
}

/**
 * Clear all local data for a specific shop (useful on logout)
 */
export async function clearShopData(shopId: string): Promise<void> {
  if (!shopId) return;
  await Promise.all([
    db.products.where('shopId').equals(shopId).delete(),
    db.pendingOrders.where('shopId').equals(shopId).delete(),
    db.metadata.where('shopId').equals(shopId).delete(),
  ]);
}

/**
 * Clear ALL local data (useful when switching shops or full logout)
 */
export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.pendingOrders.clear(),
    db.metadata.clear(),
  ]);
}
