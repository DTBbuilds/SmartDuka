import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
export declare class DiscountsController {
    private readonly discountsService;
    constructor(discountsService: DiscountsService);
    create(dto: CreateDiscountDto, user: Record<string, any>): Promise<import("./schemas/discount.schema").Discount>;
    findAll(status: string, user: Record<string, any>): Promise<import("./schemas/discount.schema").Discount[]>;
    findById(id: string): Promise<import("./schemas/discount.schema").Discount | null>;
    update(id: string, dto: UpdateDiscountDto): Promise<import("./schemas/discount.schema").Discount | null>;
    delete(id: string): Promise<import("./schemas/discount.schema").Discount | null>;
    applyDiscount(dto: ApplyDiscountDto, user: Record<string, any>): Promise<{
        discountAmount: number;
        discountId: string;
        discountName: string;
    }>;
    getAuditLog(discountId: string, appliedBy: string, startDate: string, endDate: string, user: Record<string, any>): Promise<import("./schemas/discount-audit.schema").DiscountAudit[]>;
    approveDiscount(id: string, user: Record<string, any>): Promise<import("./schemas/discount-audit.schema").DiscountAudit | null>;
    rejectDiscount(id: string, user: Record<string, any>): Promise<import("./schemas/discount-audit.schema").DiscountAudit | null>;
}
