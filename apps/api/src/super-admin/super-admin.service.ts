import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    private readonly auditLogService: ShopAuditLogService,
  ) {}

  /**
   * Get all pending shops
   */
  async getPendingShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all verified shops
   */
  async getVerifiedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'verified' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all active shops
   */
  async getActiveShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all suspended shops
   */
  async getSuspendedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'suspended' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all flagged shops
   */
  async getFlaggedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ isFlagged: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all shops with optional status filter
   */
  async getAllShops(limit: number = 50, skip: number = 0, status?: string): Promise<ShopDocument[]> {
    const query: any = {};
    if (status && status !== 'all') {
      if (status === 'flagged') {
        query.isFlagged = true;
      } else {
        query.status = status;
      }
    }
    return this.shopModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get count of all shops with optional status filter
   */
  async getAllShopsCount(status?: string): Promise<number> {
    const query: any = {};
    if (status && status !== 'all') {
      if (status === 'flagged') {
        query.isFlagged = true;
      } else {
        query.status = status;
      }
    }
    return this.shopModel.countDocuments(query).exec();
  }

  /**
   * Get shop details
   */
  async getShopDetails(shopId: string): Promise<ShopDocument> {
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  /**
   * Verify a shop - automatically activates it
   */
  async verifyShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'pending') {
      throw new BadRequestException(`Cannot verify shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'active',  // ✅ Changed from 'verified' to 'active'
          verificationBy: new Types.ObjectId(superAdminId),
          verificationDate: new Date(),
          verificationNotes: notes,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'verify',
      oldValue,
      newValue: { status: 'active' },  // ✅ Updated to reflect 'active' status
      reason: 'Shop verified and activated by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} verified and activated by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Reject a shop
   */
  async rejectShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'pending') {
      throw new BadRequestException(`Cannot reject shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'rejected',
          rejectionDate: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'reject',
      oldValue,
      newValue: { status: 'rejected' },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} rejected by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Suspend a shop
   */
  async suspendShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (!['active', 'verified'].includes(shop.status)) {
      throw new BadRequestException(`Cannot suspend shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'suspended',
          suspensionDate: new Date(),
          suspensionReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'suspend',
      oldValue,
      newValue: { status: 'suspended' },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} suspended by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Reactivate a shop
   */
  async reactivateShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'suspended') {
      throw new BadRequestException(`Cannot reactivate shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'active',
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'reactivate',
      oldValue,
      newValue: { status: 'active' },
      reason: 'Shop reactivated by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} reactivated by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Flag a shop for review
   */
  async flagShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          isFlagged: true,
          flagReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'flag',
      oldValue: { isFlagged: shop.isFlagged },
      newValue: { isFlagged: true },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} flagged by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Unflag a shop
   */
  async unflagShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          isFlagged: false,
          flagReason: undefined,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'unflag',
      oldValue: { isFlagged: shop.isFlagged },
      newValue: { isFlagged: false },
      reason: 'Shop unflagged by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} unflagged by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Get shop audit log
   */
  async getShopAuditLog(shopId: string, limit: number = 50, skip: number = 0) {
    return this.auditLogService.getShopAuditLog(shopId, limit, skip);
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(shopId: string) {
    return this.auditLogService.getVerificationHistory(shopId);
  }

  /**
   * Get shop statistics
   */
  async getShopStats(shopId: string) {
    const shop = await this.getShopDetails(shopId);
    return {
      id: shop._id,
      name: shop.name,
      email: shop.email,
      phone: shop.phone,
      status: shop.status,
      complianceScore: shop.complianceScore,
      chargebackRate: shop.chargebackRate,
      refundRate: shop.refundRate,
      violationCount: shop.violationCount,
      cashierCount: shop.cashierCount,
      totalSales: shop.totalSales,
      totalOrders: shop.totalOrders,
      lastActivityDate: shop.lastActivityDate,
      isFlagged: shop.isFlagged,
      isMonitored: shop.isMonitored,
      verificationDate: shop.verificationDate,
      suspensionDate: shop.suspensionDate,
      createdAt: (shop as any).createdAt,
      updatedAt: (shop as any).updatedAt,
    };
  }

  /**
   * Get pending shops count
   */
  async getPendingShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'pending' });
  }

  /**
   * Get flagged shops count
   */
  async getFlaggedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ isFlagged: true });
  }

  /**
   * Get suspended shops count
   */
  async getSuspendedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'suspended' });
  }

  /**
   * Get verified shops count
   */
  async getVerifiedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'verified' });
  }

  /**
   * Get active shops count
   */
  async getActiveShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'active' });
  }
}
