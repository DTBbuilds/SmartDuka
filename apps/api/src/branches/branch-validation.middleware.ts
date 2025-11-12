import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './branch.schema';

/**
 * PHASE 2: BRANCH VALIDATION MIDDLEWARE
 * 
 * Validates that user has access to the requested branch
 * Multi-tenant safe: ensures shopId matches
 */
@Injectable()
export class BranchValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BranchValidationMiddleware.name);

  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only validate if branchId is in params or query
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return next();
    }

    try {
      const user = (req as any).user;
      if (!user) {
        throw new ForbiddenException('User not authenticated');
      }

      // Check if branch exists and belongs to user's shop
      const branch = await this.branchModel.findOne({
        _id: new Types.ObjectId(branchId as string),
        shopId: new Types.ObjectId(user.shopId),
      });

      if (!branch) {
        throw new ForbiddenException('Branch not found or access denied');
      }

      // Check if user has access to this branch
      const userRole = user.role;
      const userBranchId = user.branchId?.toString();
      const userBranches = user.branches?.map((b: any) => b.toString()) || [];

      // Admin has access to all branches
      if (userRole === 'admin') {
        return next();
      }

      // Branch admin has access to assigned branches
      if (userRole === 'branch_admin' && userBranches.includes(branchId as string)) {
        return next();
      }

      // Branch manager has access to own branch
      if (userRole === 'branch_manager' && userBranchId === branchId) {
        return next();
      }

      // Cashier/Supervisor has access to assigned branch
      if ((userRole === 'cashier' || userRole === 'supervisor') && userBranchId === branchId) {
        return next();
      }

      throw new ForbiddenException('You do not have access to this branch');
    } catch (error: any) {
      this.logger.error(`Branch validation error: ${error.message}`);
      throw error;
    }
  }
}
