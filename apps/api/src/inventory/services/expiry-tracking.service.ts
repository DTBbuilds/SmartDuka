import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';

interface ExpiryAlertThresholds {
  critical: number; // days (default: 7)
  warning: number;  // days (default: 30)
  upcoming: number; // days (default: 90)
}

interface ExpiringProduct {
  _id: string;
  name: string;
  sku: string;
  batchNumber?: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  stock: number;
  category?: string;
  supplier?: string;
  cost: number;
  status: 'critical' | 'warning' | 'upcoming' | 'expired';
}

interface ExpiryStats {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  upcoming: number;
  valueAtRisk: number;
}

@Injectable()
export class ExpiryTrackingService {
  private readonly defaultThresholds: ExpiryAlertThresholds = {
    critical: 7,
    warning: 30,
    upcoming: 90,
  };

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  /**
   * Get all products nearing expiry for a shop
   */
  async getExpiringProducts(
    shopId: string | Types.ObjectId,
    thresholds: Partial<ExpiryAlertThresholds> = {},
  ): Promise<{ products: ExpiringProduct[]; stats: ExpiryStats }> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;
    const mergedThresholds = { ...this.defaultThresholds, ...thresholds };

    const now = new Date();
    const ninetyDaysFromNow = new Date(now);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + mergedThresholds.upcoming);

    // Find all products with expiry dates within the next 90 days or already expired
    const products = await this.productModel.find({
      shopId: shopObjectId,
      expiryDate: { $exists: true, $ne: null, $lte: ninetyDaysFromNow },
      stock: { $gt: 0 },
      status: 'active',
    }).lean();

    const expiringProducts: ExpiringProduct[] = [];
    let stats: ExpiryStats = {
      total: 0,
      expired: 0,
      critical: 0,
      warning: 0,
      upcoming: 0,
      valueAtRisk: 0,
    };

    for (const product of products) {
      if (!product.expiryDate) continue;

      const expiryDate = new Date(product.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: ExpiringProduct['status'];
      if (daysUntilExpiry < 0) {
        status = 'expired';
        stats.expired++;
      } else if (daysUntilExpiry <= mergedThresholds.critical) {
        status = 'critical';
        stats.critical++;
      } else if (daysUntilExpiry <= mergedThresholds.warning) {
        status = 'warning';
        stats.warning++;
      } else {
        status = 'upcoming';
        stats.upcoming++;
      }

      const valueAtRisk = (product.cost || 0) * (product.stock || 0);
      stats.valueAtRisk += valueAtRisk;

      if (daysUntilExpiry <= mergedThresholds.upcoming) {
        stats.total++;
        expiringProducts.push({
          _id: product._id.toString(),
          name: product.name,
          sku: product.sku || '',
          batchNumber: product.batchNumber,
          expiryDate: expiryDate,
          daysUntilExpiry,
          stock: product.stock || 0,
          category: product.categoryId?.toString(),
          supplier: product.preferredSupplierId?.toString(),
          cost: product.cost || 0,
          status,
        });
      }
    }

    // Sort by expiry date (most urgent first)
    expiringProducts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return { products: expiringProducts, stats };
  }

  /**
   * Get only expired products
   */
  async getExpiredProducts(
    shopId: string | Types.ObjectId,
  ): Promise<ExpiringProduct[]> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;
    const now = new Date();

    const products = await this.productModel.find({
      shopId: shopObjectId,
      expiryDate: { $exists: true, $ne: null, $lt: now },
      stock: { $gt: 0 },
      status: 'active',
    }).lean();

    return products.map((product) => ({
      _id: product._id.toString(),
      name: product.name,
      sku: product.sku || '',
      batchNumber: product.batchNumber,
      expiryDate: new Date(product.expiryDate!),
      daysUntilExpiry: Math.ceil((new Date(product.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      stock: product.stock || 0,
      category: product.categoryId?.toString(),
      supplier: product.preferredSupplierId?.toString(),
      cost: product.cost || 0,
      status: 'expired' as const,
    }));
  }

  /**
   * Get products expiring within specific days
   */
  async getProductsExpiringWithinDays(
    shopId: string | Types.ObjectId,
    days: number,
  ): Promise<ExpiringProduct[]> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    const products = await this.productModel.find({
      shopId: shopObjectId,
      expiryDate: { $exists: true, $ne: null, $gte: now, $lte: futureDate },
      stock: { $gt: 0 },
      status: 'active',
    }).lean();

    return products.map((product) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(product.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let status: ExpiringProduct['status'];
      if (daysUntilExpiry <= 7) status = 'critical';
      else if (daysUntilExpiry <= 30) status = 'warning';
      else status = 'upcoming';

      return {
        _id: product._id.toString(),
        name: product.name,
        sku: product.sku || '',
        batchNumber: product.batchNumber,
        expiryDate: new Date(product.expiryDate!),
        daysUntilExpiry,
        stock: product.stock || 0,
        category: product.categoryId?.toString(),
        supplier: product.preferredSupplierId?.toString(),
        cost: product.cost || 0,
        status,
      };
    });
  }

  /**
   * Check if a business type requires expiry tracking
   */
  requiresExpiryTracking(businessType: string): boolean {
    const typesRequiringExpiry = [
      'pharmacy',
      'chemist',
      'grocery',
      'supermarket',
      'mini_supermarket',
      'butchery',
      'bakery',
      'restaurant',
      'coffee',
      'food',
      'pet_shop',
      'agro_vet',
      'beauty_cosmetics',
    ];
    
    return typesRequiringExpiry.some(type => 
      businessType.toLowerCase().includes(type)
    );
  }

  /**
   * Get FEFO (First Expired First Out) recommendation
   */
  async getFEFORecommendation(
    shopId: string | Types.ObjectId,
    productName?: string,
  ): Promise<Array<{ product: ExpiringProduct; action: string; priority: number }>> {
    const { products } = await this.getExpiringProducts(shopId);
    
    let filtered = products;
    if (productName) {
      filtered = products.filter(p => 
        p.name.toLowerCase().includes(productName.toLowerCase())
      );
    }

    return filtered.map((product) => {
      let action: string;
      let priority: number;

      if (product.status === 'expired') {
        action = 'Dispose immediately - write off inventory';
        priority = 1;
      } else if (product.status === 'critical') {
        action = 'Mark for discount sale or promotion';
        priority = 2;
      } else if (product.status === 'warning') {
        action = 'Plan promotion or bundle with faster-moving items';
        priority = 3;
      } else {
        action = 'Monitor and plan inventory rotation';
        priority = 4;
      }

      return { product, action, priority };
    }).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate disposal report for expired products
   */
  async generateDisposalReport(
    shopId: string | Types.ObjectId,
  ): Promise<{
    totalItems: number;
    totalValue: number;
    products: Array<{
      name: string;
      sku: string;
      batchNumber?: string;
      stock: number;
      cost: number;
      totalValue: number;
      expiredDate: Date;
    }>;
  }> {
    const expiredProducts = await this.getExpiredProducts(shopId);
    
    const products = expiredProducts.map((p) => ({
      name: p.name,
      sku: p.sku,
      batchNumber: p.batchNumber,
      stock: p.stock,
      cost: p.cost,
      totalValue: p.stock * p.cost,
      expiredDate: p.expiryDate,
    }));

    return {
      totalItems: expiredProducts.length,
      totalValue: products.reduce((sum, p) => sum + p.totalValue, 0),
      products,
    };
  }
}
