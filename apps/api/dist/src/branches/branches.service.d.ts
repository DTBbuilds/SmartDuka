import { Model } from 'mongoose';
import { BranchDocument } from './branch.schema';
import { AuditLogDocument } from '../audit/audit-log.schema';
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
export declare class BranchesService {
    private readonly branchModel;
    private readonly auditModel;
    private readonly logger;
    constructor(branchModel: Model<BranchDocument>, auditModel: Model<AuditLogDocument>);
    create(shopId: string, userId: string, dto: CreateBranchDto): Promise<BranchDocument>;
    findByShop(shopId: string): Promise<BranchDocument[]>;
    findById(branchId: string, shopId: string): Promise<BranchDocument | null>;
    findByCode(code: string, shopId: string): Promise<BranchDocument | null>;
    update(branchId: string, shopId: string, userId: string, dto: UpdateBranchDto): Promise<BranchDocument | null>;
    delete(branchId: string, shopId: string, userId: string): Promise<boolean>;
    countByShop(shopId: string): Promise<number>;
    getActive(shopId: string): Promise<BranchDocument[]>;
}
