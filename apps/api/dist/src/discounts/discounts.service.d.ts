import { Model } from 'mongoose';
import { Discount, DiscountDocument } from './schemas/discount.schema';
import { DiscountAudit, DiscountAuditDocument } from './schemas/discount-audit.schema';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
export declare class DiscountsService {
    private discountModel;
    private auditModel;
    private readonly logger;
    constructor(discountModel: Model<DiscountDocument>, auditModel: Model<DiscountAuditDocument>);
    create(shopId: string, dto: CreateDiscountDto): Promise<Discount>;
    findAll(shopId: string, status?: string): Promise<Discount[]>;
    findById(id: string): Promise<Discount | null>;
    update(id: string, dto: UpdateDiscountDto): Promise<Discount | null>;
    delete(id: string): Promise<Discount | null>;
    validateDiscount(shopId: string, discountId: string, subtotal: number, customerId?: string, customerSegment?: string): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    calculateDiscountAmount(discountId: string, subtotal: number, itemCount?: number): Promise<number>;
    applyDiscount(shopId: string, dto: ApplyDiscountDto): Promise<{
        discountAmount: number;
        discountId: string;
        discountName: string;
    }>;
    getAuditLog(shopId: string, filters?: {
        discountId?: string;
        appliedBy?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<DiscountAudit[]>;
    approveDiscount(auditId: string, approvedBy: string): Promise<DiscountAudit | null>;
    rejectDiscount(auditId: string, approvedBy: string): Promise<DiscountAudit | null>;
}
