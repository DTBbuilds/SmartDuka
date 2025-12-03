import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false, unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({ 
    required: true, 
    enum: ['admin', 'branch_admin', 'branch_manager', 'supervisor', 'cashier'], 
    default: 'cashier' 
  })
  role: 'admin' | 'branch_admin' | 'branch_manager' | 'supervisor' | 'cashier';

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['active', 'disabled'], default: 'active' })
  status: 'active' | 'disabled';

  @Prop({ required: false, trim: true })
  name?: string;

  @Prop({ default: 0 })
  totalSales?: number;

  // PIN-based login (hashed)
  @Prop({ required: false })
  pinHash?: string;

  // Unique cashier ID (e.g., C001)
  @Prop({ required: false, unique: true, sparse: true })
  cashierId?: string;

  // Session timeout in minutes
  @Prop({ default: 15 })
  sessionTimeout?: number;

  // Permissions for cashiers
  @Prop({ type: Object, default: {} })
  permissions?: {
    canVoid?: boolean;
    canRefund?: boolean;
    canDiscount?: boolean;
    maxDiscountAmount?: number;
    maxRefundAmount?: number;
    voidRequiresApproval?: boolean;
    refundRequiresApproval?: boolean;
    discountRequiresApproval?: boolean;
    restrictedCategories?: string[];
  };

  // Last login timestamp
  @Prop()
  lastLoginAt?: Date;

  // Last activity timestamp
  @Prop()
  lastActivityAt?: Date;

  // PHASE 2: Branch Management Fields
  
  // Primary branch (for cashiers assigned to single branch)
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  // Multiple branches (for branch managers/admins)
  @Prop({ required: false, type: [Types.ObjectId], ref: 'Branch', default: [] })
  branches?: Types.ObjectId[];

  // Branch-specific permissions
  @Prop({ type: Object, default: {} })
  branchPermissions?: {
    [branchId: string]: {
      canVoid?: boolean;
      canRefund?: boolean;
      canDiscount?: boolean;
      maxDiscountAmount?: number;
      canManageInventory?: boolean;
      canViewReports?: boolean;
      canManageStaff?: boolean;
      canApproveTransactions?: boolean;
    };
  };

  // Approval requirements
  @Prop({ type: Object, default: {} })
  requiresApprovalFor?: {
    voids?: boolean;
    refunds?: boolean;
    discounts?: boolean;
    minAmount?: number;
  };

  // Last branch accessed
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  lastBranchId?: Types.ObjectId;

  // Google OAuth fields
  @Prop({ required: false, unique: true, sparse: true })
  googleId?: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ enum: ['local', 'google'], default: 'local' })
  authProvider: 'local' | 'google';
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes for multi-tenant queries
// Note: email and phone already have indexes from @Prop({ unique: true })
UserSchema.index({ shopId: 1, role: 1 });
UserSchema.index({ shopId: 1, branchId: 1 });
UserSchema.index({ shopId: 1, cashierId: 1 });
UserSchema.index({ branches: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastLoginAt: -1 });
// Note: googleId already has index from @Prop({ unique: true, sparse: true })
