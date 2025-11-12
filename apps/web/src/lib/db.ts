import Dexie, { Table } from 'dexie';

export interface StoredProduct {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  updatedAt?: string;
}

export interface PendingOrder {
  id?: number;
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
  value: string | number | boolean | null;
  updatedAt: number;
}

class SmartDukaDB extends Dexie {
  products!: Table<StoredProduct, string>;
  pendingOrders!: Table<PendingOrder, number>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super('SmartDukaPOS');
    this.version(1).stores({
      products: '&_id, name, categoryId, updatedAt',
      pendingOrders: '++id, createdAt',
      metadata: '&key, updatedAt',
    });
  }
}

export const db = new SmartDukaDB();
