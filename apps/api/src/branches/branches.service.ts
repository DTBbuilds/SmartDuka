import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './branch.schema';
import { AuditLog, AuditLogDocument } from '../audit/audit-log.schema';

export interface CreateBranchDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  inventoryType?: 'shared' | 'separate';
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive';
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
}

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
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
    // Check if code already exists for this shop
    const existing = await this.branchModel.findOne({
      shopId: new Types.ObjectId(shopId),
      code: dto.code,
    });

    if (existing) {
      throw new BadRequestException('Branch code already exists in this shop');
    }

    const branch = new this.branchModel({
      shopId: new Types.ObjectId(shopId),
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });

    const created = await branch.save();

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action: 'create_branch',
      resource: 'branch',
      resourceId: created._id,
      changes: {
        before: null,
        after: created.toObject(),
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
}
