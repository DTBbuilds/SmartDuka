"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DiscountsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const discount_schema_1 = require("./schemas/discount.schema");
const discount_audit_schema_1 = require("./schemas/discount-audit.schema");
let DiscountsService = DiscountsService_1 = class DiscountsService {
    discountModel;
    auditModel;
    logger = new common_1.Logger(DiscountsService_1.name);
    constructor(discountModel, auditModel) {
        this.discountModel = discountModel;
        this.auditModel = auditModel;
    }
    async create(shopId, dto) {
        const discount = new this.discountModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            ...dto,
        });
        return discount.save();
    }
    async findAll(shopId, status) {
        const filter = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (status) {
            filter.status = status;
        }
        return this.discountModel.find(filter).sort({ createdAt: -1 }).exec();
    }
    async findById(id) {
        return this.discountModel.findById(id).exec();
    }
    async update(id, dto) {
        return this.discountModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
    }
    async delete(id) {
        return this.discountModel.findByIdAndDelete(id).exec();
    }
    async validateDiscount(shopId, discountId, subtotal, customerId, customerSegment) {
        const discount = await this.findById(discountId);
        if (!discount) {
            return { valid: false, reason: 'Discount not found' };
        }
        if (discount.shopId.toString() !== shopId) {
            return { valid: false, reason: 'Discount not available for this shop' };
        }
        if (discount.status !== 'active') {
            return { valid: false, reason: 'Discount is inactive' };
        }
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
            return { valid: false, reason: 'Discount usage limit reached' };
        }
        const now = new Date();
        if (now < discount.rules.validFrom || now > discount.rules.validTo) {
            return { valid: false, reason: 'Discount is not valid at this time' };
        }
        if (discount.rules.minPurchaseAmount && subtotal < discount.rules.minPurchaseAmount) {
            return {
                valid: false,
                reason: `Minimum purchase amount is Ksh ${discount.rules.minPurchaseAmount}`,
            };
        }
        if (discount.rules.customerSegments &&
            discount.rules.customerSegments.length > 0 &&
            customerSegment &&
            !discount.rules.customerSegments.includes(customerSegment)) {
            return { valid: false, reason: 'Discount not available for your customer segment' };
        }
        if (discount.rules.applicableDays && discount.rules.applicableDays.length > 0) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const currentDay = dayNames[now.getDay()];
            if (!discount.rules.applicableDays.includes(currentDay)) {
                return { valid: false, reason: 'Discount not available on this day' };
            }
        }
        if (discount.rules.applicableHours) {
            const currentHour = now.getHours();
            if (currentHour < discount.rules.applicableHours.start ||
                currentHour >= discount.rules.applicableHours.end) {
                return { valid: false, reason: 'Discount not available at this time' };
            }
        }
        return { valid: true };
    }
    async calculateDiscountAmount(discountId, subtotal, itemCount) {
        const discount = await this.findById(discountId);
        if (!discount)
            return 0;
        let amount = 0;
        switch (discount.type) {
            case 'percentage':
                amount = Math.round((subtotal * discount.value) / 100);
                break;
            case 'fixed':
                amount = discount.value;
                break;
            case 'bogo':
                if (itemCount && itemCount >= 2) {
                    amount = Math.round(subtotal * 0.5);
                }
                break;
            case 'tiered':
                if (subtotal >= (discount.rules.minPurchaseAmount ?? 0)) {
                    amount = Math.round((subtotal * discount.value) / 100);
                }
                break;
            case 'coupon':
                amount = discount.value;
                break;
        }
        if (discount.rules.maxDiscountAmount) {
            amount = Math.min(amount, discount.rules.maxDiscountAmount);
        }
        amount = Math.min(amount, subtotal);
        return amount;
    }
    async applyDiscount(shopId, dto) {
        const validation = await this.validateDiscount(shopId, dto.discountId, dto.subtotal, dto.customerId, dto.customerSegment);
        if (!validation.valid) {
            throw new common_1.BadRequestException(validation.reason || 'Discount validation failed');
        }
        const discountAmount = await this.calculateDiscountAmount(dto.discountId, dto.subtotal, dto.itemCount);
        const discount = await this.findById(dto.discountId);
        if (!discount) {
            throw new common_1.BadRequestException('Discount not found');
        }
        if (discount.requiresApproval && discountAmount > 500) {
            await this.auditModel.create({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                discountId: new mongoose_2.Types.ObjectId(dto.discountId),
                orderId: new mongoose_2.Types.ObjectId(dto.orderId),
                amount: discountAmount,
                appliedBy: new mongoose_2.Types.ObjectId(dto.appliedBy),
                reason: dto.reason,
                status: 'pending',
            });
            throw new common_1.BadRequestException('Discount requires manager approval. Request submitted for approval.');
        }
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            discountId: new mongoose_2.Types.ObjectId(dto.discountId),
            orderId: new mongoose_2.Types.ObjectId(dto.orderId),
            amount: discountAmount,
            appliedBy: new mongoose_2.Types.ObjectId(dto.appliedBy),
            reason: dto.reason,
            status: 'approved',
        });
        await this.discountModel.findByIdAndUpdate(dto.discountId, { $inc: { usageCount: 1 } }, { new: true });
        return {
            discountAmount,
            discountId: dto.discountId,
            discountName: discount.name,
        };
    }
    async getAuditLog(shopId, filters) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (filters?.discountId) {
            query.discountId = new mongoose_2.Types.ObjectId(filters.discountId);
        }
        if (filters?.appliedBy) {
            query.appliedBy = new mongoose_2.Types.ObjectId(filters.appliedBy);
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        return this.auditModel.find(query).sort({ createdAt: -1 }).exec();
    }
    async approveDiscount(auditId, approvedBy) {
        return this.auditModel
            .findByIdAndUpdate(auditId, {
            status: 'approved',
            approvedBy: new mongoose_2.Types.ObjectId(approvedBy),
        }, { new: true })
            .exec();
    }
    async rejectDiscount(auditId, approvedBy) {
        return this.auditModel
            .findByIdAndUpdate(auditId, {
            status: 'rejected',
            approvedBy: new mongoose_2.Types.ObjectId(approvedBy),
        }, { new: true })
            .exec();
    }
};
exports.DiscountsService = DiscountsService;
exports.DiscountsService = DiscountsService = DiscountsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(discount_schema_1.Discount.name)),
    __param(1, (0, mongoose_1.InjectModel)(discount_audit_schema_1.DiscountAudit.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], DiscountsService);
//# sourceMappingURL=discounts.service.js.map