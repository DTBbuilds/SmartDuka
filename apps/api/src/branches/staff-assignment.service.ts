import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Branch, BranchDocument } from './branch.schema';
import { AuditLog, AuditLogDocument } from '../audit/audit-log.schema';

/**
 * PHASE 2: STAFF ASSIGNMENT SERVICE
 * 
 * Manages assignment of staff to branches
 * Multi-tenant safe: all operations filtered by shopId
 */
@Injectable()
export class StaffAssignmentService {
  private readonly logger = new Logger(StaffAssignmentService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Assign user to a branch
   * Multi-tenant safe: filters by shopId
   */
  async assignToBranch(
    shopId: string,
    userId: string,
    branchId: string,
    assignedBy: string,
  ): Promise<UserDocument> {
    // Verify branch exists
    const branch = await this.branchModel.findOne({
      _id: new Types.ObjectId(branchId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    // Verify user exists and belongs to shop
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update user's branch assignment
    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      {
        branchId: new Types.ObjectId(branchId),
        lastBranchId: new Types.ObjectId(branchId),
      },
      { new: true },
    );

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(assignedBy),
      action: 'assign_staff_to_branch',
      resource: 'user',
      resourceId: new Types.ObjectId(userId),
      changes: {
        before: { branchId: user.branchId },
        after: { branchId: new Types.ObjectId(branchId) },
      },
    });

    this.logger.log(`User ${userId} assigned to branch ${branchId}`);
    return updated!;
  }

  /**
   * Assign user to multiple branches (for branch admins)
   * Multi-tenant safe: filters by shopId
   */
  async assignToMultipleBranches(
    shopId: string,
    userId: string,
    branchIds: string[],
    assignedBy: string,
  ): Promise<UserDocument> {
    // Verify all branches exist
    const branches = await this.branchModel.find({
      _id: { $in: branchIds.map(id => new Types.ObjectId(id)) },
      shopId: new Types.ObjectId(shopId),
    });

    if (branches.length !== branchIds.length) {
      throw new BadRequestException('One or more branches not found');
    }

    // Verify user exists
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update user's branch assignments
    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      {
        branches: branchIds.map(id => new Types.ObjectId(id)),
      },
      { new: true },
    );

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(assignedBy),
      action: 'assign_staff_to_multiple_branches',
      resource: 'user',
      resourceId: new Types.ObjectId(userId),
      changes: {
        before: { branches: user.branches },
        after: { branches: branchIds.map(id => new Types.ObjectId(id)) },
      },
    });

    this.logger.log(`User ${userId} assigned to ${branchIds.length} branches`);
    return updated!;
  }

  /**
   * Get staff for a branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getStaffByBranch(shopId: string, branchId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({
        shopId: new Types.ObjectId(shopId),
        $or: [
          { branchId: new Types.ObjectId(branchId) },
          { branches: new Types.ObjectId(branchId) },
        ],
      })
      .select('-passwordHash -pinHash')
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Remove user from branch
   * Multi-tenant safe: filters by shopId
   */
  async removeFromBranch(
    shopId: string,
    userId: string,
    branchId: string,
    removedBy: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Remove from single branch assignment
    if (user.branchId?.toString() === branchId) {
      const updated = await this.userModel.findByIdAndUpdate(
        new Types.ObjectId(userId),
        { branchId: null },
        { new: true },
      );

      // Log audit trail
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
        userId: new Types.ObjectId(removedBy),
        action: 'remove_staff_from_branch',
        resource: 'user',
        resourceId: new Types.ObjectId(userId),
        changes: {
          before: { branchId: new Types.ObjectId(branchId) },
          after: { branchId: null },
        },
      });

      this.logger.log(`User ${userId} removed from branch ${branchId}`);
      return updated!;
    }

    // Remove from multiple branch assignments
    if (user.branches && user.branches.length > 0) {
      const updatedBranches = user.branches.filter(
        b => b.toString() !== branchId,
      );

      const updated = await this.userModel.findByIdAndUpdate(
        new Types.ObjectId(userId),
        { branches: updatedBranches },
        { new: true },
      );

      // Log audit trail
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
        userId: new Types.ObjectId(removedBy),
        action: 'remove_staff_from_branch',
        resource: 'user',
        resourceId: new Types.ObjectId(userId),
        changes: {
          before: { branches: user.branches },
          after: { branches: updatedBranches },
        },
      });

      this.logger.log(`User ${userId} removed from branch ${branchId}`);
      return updated!;
    }

    throw new BadRequestException('User is not assigned to this branch');
  }

  /**
   * Update branch-specific permissions
   * Multi-tenant safe: filters by shopId
   */
  async updateBranchPermissions(
    shopId: string,
    userId: string,
    branchId: string,
    permissions: any,
    updatedBy: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const branchPermissions = user.branchPermissions || {};
    const oldPermissions = branchPermissions[branchId];

    branchPermissions[branchId] = permissions;

    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      { branchPermissions },
      { new: true },
    );

    // Log audit trail
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: new Types.ObjectId(branchId),
      userId: new Types.ObjectId(updatedBy),
      action: 'update_branch_permissions',
      resource: 'user',
      resourceId: new Types.ObjectId(userId),
      changes: {
        before: { permissions: oldPermissions },
        after: { permissions },
      },
    });

    this.logger.log(`Permissions updated for user ${userId} in branch ${branchId}`);
    return updated!;
  }

  /**
   * Get branch-specific permissions for user
   * Multi-tenant safe: filters by shopId
   */
  async getBranchPermissions(
    shopId: string,
    userId: string,
    branchId: string,
  ): Promise<any> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.branchPermissions?.[branchId] || {};
  }
}
