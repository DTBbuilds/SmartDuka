import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument, BranchPaymentConfig, BranchLocation, BranchOperations, BranchContacts } from './branch.schema';
import { AuditLog, AuditLogDocument } from '../audit/audit-log.schema';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';

export interface CreateBranchDto {
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  inventoryType?: 'shared' | 'separate';
  canTransferStock?: boolean;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  
  // Payment configuration
  paymentConfig?: {
    enabled?: boolean;
    useShopConfig?: boolean;
    type?: 'paybill' | 'till';
    shortCode?: string;
    accountPrefix?: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
  };
  
  // Location details
  location?: {
    county?: string;
    subCounty?: string;
    ward?: string;
    landmark?: string;
    buildingName?: string;
    floor?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    deliveryRadius?: number;
  };
  
  // Operations
  operations?: {
    operatingHours?: Record<number, { open: string; close: string; closed?: boolean }>;
    holidays?: string[];
    acceptsWalkIn?: boolean;
    acceptsDelivery?: boolean;
    acceptsPickup?: boolean;
    deliveryFee?: number;
    minimumOrderAmount?: number;
    maxDailyOrders?: number;
    averageServiceTime?: number;
    receiptHeader?: string;
    receiptFooter?: string;
    receiptLogo?: string;
  };
  
  // Contacts
  contacts?: {
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
    supportEmail?: string;
  };
  
  // Management
  managerId?: string;
  maxStaff?: number;
  
  // Financial
  targetRevenue?: number;
  costCenter?: string;
  taxExempt?: boolean;
  
  metadata?: Record<string, any>;
}

export interface UpdateBranchDto {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  inventoryType?: 'shared' | 'separate';
  canTransferStock?: boolean;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  
  // Payment configuration
  paymentConfig?: {
    enabled?: boolean;
    useShopConfig?: boolean;
    type?: 'paybill' | 'till';
    shortCode?: string;
    accountPrefix?: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
  };
  
  // Location details
  location?: {
    county?: string;
    subCounty?: string;
    ward?: string;
    landmark?: string;
    buildingName?: string;
    floor?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    deliveryRadius?: number;
  };
  
  // Operations
  operations?: {
    operatingHours?: Record<number, { open: string; close: string; closed?: boolean }>;
    holidays?: string[];
    acceptsWalkIn?: boolean;
    acceptsDelivery?: boolean;
    acceptsPickup?: boolean;
    deliveryFee?: number;
    minimumOrderAmount?: number;
    maxDailyOrders?: number;
    averageServiceTime?: number;
    receiptHeader?: string;
    receiptFooter?: string;
    receiptLogo?: string;
  };
  
  // Contacts
  contacts?: {
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
    supportEmail?: string;
  };
  
  // Management
  managerId?: string;
  maxStaff?: number;
  
  // Financial
  targetRevenue?: number;
  costCenter?: string;
  taxExempt?: boolean;
  
  metadata?: Record<string, any>;
}

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    @Inject(forwardRef(() => SubscriptionGuardService))
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  /**
   * Create a new branch
   * Multi-tenant safe: filters by shopId
   */
  async create(
    shopId: string,
    userId: string,
    dto: CreateBranchDto,
  ): Promise<BranchDocument> {
    // Enforce shop/branch limit
    await this.subscriptionGuard.enforceLimit(shopId, 'shops');

    // Check if code already exists for this shop
    const existing = await this.branchModel.findOne({
      shopId: new Types.ObjectId(shopId),
      code: dto.code,
    });

    if (existing) {
      throw new BadRequestException('Branch code already exists in this shop');
    }

    // Prepare branch data
    const branchData: any = {
      shopId: new Types.ObjectId(shopId),
      name: dto.name,
      code: dto.code,
      description: dto.description,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      inventoryType: dto.inventoryType,
      canTransferStock: dto.canTransferStock,
      openingTime: dto.openingTime,
      closingTime: dto.closingTime,
      timezone: dto.timezone,
      location: dto.location,
      operations: dto.operations,
      contacts: dto.contacts,
      maxStaff: dto.maxStaff,
      targetRevenue: dto.targetRevenue,
      costCenter: dto.costCenter,
      taxExempt: dto.taxExempt,
      metadata: dto.metadata,
      createdBy: new Types.ObjectId(userId),
    };

    // Handle manager ID
    if (dto.managerId) {
      branchData.managerId = new Types.ObjectId(dto.managerId);
    }

    // Handle payment configuration
    if (dto.paymentConfig) {
      branchData.paymentConfig = {
        enabled: dto.paymentConfig.enabled ?? false,
        useShopConfig: dto.paymentConfig.useShopConfig ?? true,
        type: dto.paymentConfig.type,
        shortCode: dto.paymentConfig.shortCode,
        accountPrefix: dto.paymentConfig.accountPrefix,
        verificationStatus: 'pending',
      };

      // Note: For security, credentials should be encrypted
      // This will be handled by the PaymentConfigService when creating
      // a separate PaymentConfig document for the branch
      if (dto.paymentConfig.consumerKey) {
        this.logger.warn(
          'Branch payment credentials provided - consider using PaymentConfig service for proper encryption'
        );
      }
    }

    const branch = new this.branchModel(branchData);
    const created = await branch.save();

    // Update usage count
    await this.subscriptionGuard.incrementUsage(shopId, 'shops');

    // Log audit trail (mask sensitive data)
    const auditData = { ...created.toObject() };
    if (auditData.paymentConfig) {
      auditData.paymentConfig = {
        ...auditData.paymentConfig,
        consumerKey: auditData.paymentConfig.consumerKey ? '****' : undefined,
        consumerSecret: auditData.paymentConfig.consumerSecret ? '****' : undefined,
        passkey: auditData.paymentConfig.passkey ? '****' : undefined,
      };
    }

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action: 'create_branch',
      resource: 'branch',
      resourceId: created._id,
      changes: {
        before: null,
        after: auditData,
      },
    });

    this.logger.log(`Branch created: ${created.name} (${created.code}) in shop ${shopId}`);

    return created;
  }

  /**
   * Get all branches for a shop
   * Multi-tenant safe: filters by shopId
   */
  async findByShop(shopId: string): Promise<BranchDocument[]> {
    return this.branchModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get single branch
   * Multi-tenant safe: filters by shopId
   */
  async findById(branchId: string, shopId: string): Promise<BranchDocument | null> {
    return this.branchModel
      .findOne({
        _id: new Types.ObjectId(branchId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  /**
   * Get branch by code
   * Multi-tenant safe: filters by shopId
   */
  async findByCode(code: string, shopId: string): Promise<BranchDocument | null> {
    return this.branchModel
      .findOne({
        code,
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  /**
   * Update branch
   * Multi-tenant safe: filters by shopId
   */
  async update(
    branchId: string,
    shopId: string,
    userId: string,
    dto: UpdateBranchDto,
  ): Promise<BranchDocument | null> {
    const before = await this.findById(branchId, shopId);
    if (!before) {
      throw new BadRequestException('Branch not found');
    }

    const updated = await this.branchModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(branchId),
          shopId: new Types.ObjectId(shopId),
        },
        { ...dto, updatedAt: new Date() },
        { new: true },
      )
      .exec();

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      action: 'update_branch',
      resource: 'branch',
      resourceId: new Types.ObjectId(branchId),
      changes: {
        before: before.toObject(),
        after: updated?.toObject(),
      },
    });

    this.logger.log(`Branch updated: ${branchId} in shop ${shopId}`);

    return updated;
  }

  /**
   * Delete branch
   * Multi-tenant safe: filters by shopId
   */
  async delete(branchId: string, shopId: string, userId: string): Promise<boolean> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    const result = await this.branchModel
      .deleteOne({
        _id: new Types.ObjectId(branchId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();

    // Decrement shop count
    if (result.deletedCount > 0) {
      await this.subscriptionGuard.decrementUsage(shopId, 'shops');
    }

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      action: 'delete_branch',
      resource: 'branch',
      resourceId: new Types.ObjectId(branchId),
      changes: {
        before: branch.toObject(),
        after: null,
      },
    });

    this.logger.log(`Branch deleted: ${branchId} in shop ${shopId}`);

    return result.deletedCount > 0;
  }

  /**
   * Count branches in shop
   */
  async countByShop(shopId: string): Promise<number> {
    return this.branchModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
  }

  /**
   * Get active branches
   */
  async getActive(shopId: string): Promise<BranchDocument[]> {
    return this.branchModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Get branches with their own payment configuration
   */
  async getBranchesWithPaymentConfig(shopId: string): Promise<BranchDocument[]> {
    return this.branchModel
      .find({
        shopId: new Types.ObjectId(shopId),
        'paymentConfig.enabled': true,
        'paymentConfig.useShopConfig': false,
      })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Update branch payment configuration
   */
  async updatePaymentConfig(
    branchId: string,
    shopId: string,
    userId: string,
    paymentConfig: CreateBranchDto['paymentConfig'],
  ): Promise<BranchDocument | null> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    const before = branch.toObject();

    const updateData: any = {
      'paymentConfig.enabled': paymentConfig?.enabled ?? false,
      'paymentConfig.useShopConfig': paymentConfig?.useShopConfig ?? true,
      'paymentConfig.type': paymentConfig?.type,
      'paymentConfig.shortCode': paymentConfig?.shortCode,
      'paymentConfig.accountPrefix': paymentConfig?.accountPrefix,
      updatedAt: new Date(),
    };

    // Reset verification if config changed
    if (paymentConfig?.shortCode !== branch.paymentConfig?.shortCode) {
      updateData['paymentConfig.verificationStatus'] = 'pending';
      updateData['paymentConfig.verifiedAt'] = null;
    }

    const updated = await this.branchModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(branchId),
          shopId: new Types.ObjectId(shopId),
        },
        { $set: updateData },
        { new: true },
      )
      .exec();

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      action: 'update_branch_payment_config',
      resource: 'branch',
      resourceId: new Types.ObjectId(branchId),
      changes: {
        before: { paymentConfig: before.paymentConfig },
        after: { paymentConfig: updated?.paymentConfig },
      },
    });

    this.logger.log(`Branch payment config updated: ${branchId} in shop ${shopId}`);

    return updated;
  }

  /**
   * Get branch payment configuration status
   */
  async getPaymentConfigStatus(branchId: string, shopId: string): Promise<{
    hasOwnConfig: boolean;
    usesShopConfig: boolean;
    isConfigured: boolean;
    isVerified: boolean;
    shortCode?: string;
    type?: string;
  }> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    const config = branch.paymentConfig;
    
    return {
      hasOwnConfig: !!(config?.enabled && !config?.useShopConfig),
      usesShopConfig: config?.useShopConfig ?? true,
      isConfigured: !!(config?.shortCode && config?.enabled),
      isVerified: config?.verificationStatus === 'verified',
      shortCode: config?.shortCode,
      type: config?.type,
    };
  }

  /**
   * Assign manager to branch
   */
  async assignManager(
    branchId: string,
    shopId: string,
    userId: string,
    managerId: string,
  ): Promise<BranchDocument | null> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    const updated = await this.branchModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(branchId),
          shopId: new Types.ObjectId(shopId),
        },
        {
          $set: {
            managerId: new Types.ObjectId(managerId),
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(userId),
      action: 'assign_branch_manager',
      resource: 'branch',
      resourceId: new Types.ObjectId(branchId),
      changes: {
        before: { managerId: branch.managerId },
        after: { managerId },
      },
    });

    this.logger.log(`Manager ${managerId} assigned to branch ${branchId}`);

    return updated;
  }

  /**
   * Add staff to branch
   */
  async addStaff(
    branchId: string,
    shopId: string,
    userId: string,
    staffId: string,
  ): Promise<BranchDocument | null> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    // Check max staff limit
    if (branch.maxStaff && (branch.staffIds?.length || 0) >= branch.maxStaff) {
      throw new BadRequestException(`Branch has reached maximum staff limit of ${branch.maxStaff}`);
    }

    const updated = await this.branchModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(branchId),
          shopId: new Types.ObjectId(shopId),
        },
        {
          $addToSet: { staffIds: new Types.ObjectId(staffId) },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Staff ${staffId} added to branch ${branchId}`);

    return updated;
  }

  /**
   * Remove staff from branch
   */
  async removeStaff(
    branchId: string,
    shopId: string,
    userId: string,
    staffId: string,
  ): Promise<BranchDocument | null> {
    const updated = await this.branchModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(branchId),
          shopId: new Types.ObjectId(shopId),
        },
        {
          $pull: { staffIds: new Types.ObjectId(staffId) },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Staff ${staffId} removed from branch ${branchId}`);

    return updated;
  }

  /**
   * Get branches by location (county)
   */
  async getByCounty(shopId: string, county: string): Promise<BranchDocument[]> {
    return this.branchModel
      .find({
        shopId: new Types.ObjectId(shopId),
        'location.county': county,
        status: 'active',
      })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Get branches that accept delivery
   */
  async getDeliveryBranches(shopId: string): Promise<BranchDocument[]> {
    return this.branchModel
      .find({
        shopId: new Types.ObjectId(shopId),
        'operations.acceptsDelivery': true,
        status: 'active',
      })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Get branch statistics
   * Returns sales, orders, staff count, and inventory stats for a branch
   */
  async getBranchStats(branchId: string, shopId: string): Promise<{
    totalSales: number;
    todaySales: number;
    totalOrders: number;
    todayOrders: number;
    staffCount: number;
    productCount: number;
    lowStockCount: number;
  }> {
    const branch = await this.findById(branchId, shopId);
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Return basic stats - these can be enhanced with actual aggregations
    // when the sales and inventory modules are integrated
    return {
      totalSales: 0, // TODO: Aggregate from sales collection
      todaySales: 0, // TODO: Aggregate from sales collection for today
      totalOrders: 0, // TODO: Count from orders collection
      todayOrders: 0, // TODO: Count from orders collection for today
      staffCount: branch.staffIds?.length || 0,
      productCount: 0, // TODO: Count from products collection
      lowStockCount: 0, // TODO: Count low stock products
    };
  }
}
