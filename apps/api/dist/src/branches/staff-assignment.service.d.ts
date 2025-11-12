import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { BranchDocument } from './branch.schema';
import { AuditLogDocument } from '../audit/audit-log.schema';
export declare class StaffAssignmentService {
    private readonly userModel;
    private readonly branchModel;
    private readonly auditModel;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, branchModel: Model<BranchDocument>, auditModel: Model<AuditLogDocument>);
    assignToBranch(shopId: string, userId: string, branchId: string, assignedBy: string): Promise<UserDocument>;
    assignToMultipleBranches(shopId: string, userId: string, branchIds: string[], assignedBy: string): Promise<UserDocument>;
    getStaffByBranch(shopId: string, branchId: string): Promise<UserDocument[]>;
    removeFromBranch(shopId: string, userId: string, branchId: string, removedBy: string): Promise<UserDocument>;
    updateBranchPermissions(shopId: string, userId: string, branchId: string, permissions: any, updatedBy: string): Promise<UserDocument>;
    getBranchPermissions(shopId: string, userId: string, branchId: string): Promise<any>;
}
