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
var SuperAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shop_schema_1 = require("../shops/schemas/shop.schema");
const shop_audit_log_service_1 = require("../shops/services/shop-audit-log.service");
const email_service_1 = require("../notifications/email.service");
let SuperAdminService = SuperAdminService_1 = class SuperAdminService {
    shopModel;
    auditLogService;
    emailService;
    logger = new common_1.Logger(SuperAdminService_1.name);
    constructor(shopModel, auditLogService, emailService) {
        this.shopModel = shopModel;
        this.auditLogService = auditLogService;
        this.emailService = emailService;
    }
    async getPendingShops(limit = 50, skip = 0) {
        return this.shopModel
            .find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getVerifiedShops(limit = 50, skip = 0) {
        return this.shopModel
            .find({ status: 'verified' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getActiveShops(limit = 50, skip = 0) {
        return this.shopModel
            .find({ status: 'active' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getSuspendedShops(limit = 50, skip = 0) {
        return this.shopModel
            .find({ status: 'suspended' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getFlaggedShops(limit = 50, skip = 0) {
        return this.shopModel
            .find({ isFlagged: true })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getAllShops(limit = 50, skip = 0, status) {
        const query = {};
        if (status && status !== 'all') {
            if (status === 'flagged') {
                query.isFlagged = true;
            }
            else {
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
    async getAllShopsCount(status) {
        const query = {};
        if (status && status !== 'all') {
            if (status === 'flagged') {
                query.isFlagged = true;
            }
            else {
                query.status = status;
            }
        }
        return this.shopModel.countDocuments(query).exec();
    }
    async getShopDetails(shopId) {
        const shop = await this.shopModel.findById(new mongoose_2.Types.ObjectId(shopId)).exec();
        if (!shop) {
            throw new common_1.NotFoundException('Shop not found');
        }
        return shop;
    }
    async verifyShop(shopId, superAdminId, notes) {
        const shop = await this.getShopDetails(shopId);
        if (shop.status !== 'pending') {
            throw new common_1.BadRequestException(`Cannot verify shop with status: ${shop.status}`);
        }
        const oldValue = { status: shop.status };
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            status: 'active',
            verificationBy: new mongoose_2.Types.ObjectId(superAdminId),
            verificationDate: new Date(),
            verificationNotes: notes,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
        await this.auditLogService.create({
            shopId,
            performedBy: superAdminId,
            action: 'verify',
            oldValue,
            newValue: { status: 'active' },
            reason: 'Shop verified and activated by super admin',
            notes,
        });
        this.logger.log(`Shop ${shopId} verified and activated by ${superAdminId}`);
        if (!updatedShop) {
            throw new common_1.NotFoundException('Shop not found after update');
        }
        if (this.emailService && updatedShop.email) {
            try {
                await this.emailService.sendTemplateEmail({
                    to: updatedShop.email,
                    templateName: 'shop_verified',
                    variables: {
                        shopName: updatedShop.name,
                        verificationDate: new Date().toLocaleDateString('en-KE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        }),
                        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
                        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin`,
                    },
                });
                this.logger.log(`Verification email sent to ${updatedShop.email}`);
            }
            catch (err) {
                this.logger.error(`Failed to send verification email: ${err}`);
            }
        }
        return updatedShop;
    }
    async rejectShop(shopId, superAdminId, reason, notes) {
        const shop = await this.getShopDetails(shopId);
        if (shop.status !== 'pending') {
            throw new common_1.BadRequestException(`Cannot reject shop with status: ${shop.status}`);
        }
        const oldValue = { status: shop.status };
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            status: 'rejected',
            rejectionDate: new Date(),
            rejectionReason: reason,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
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
            throw new common_1.NotFoundException('Shop not found after update');
        }
        if (this.emailService && updatedShop.email) {
            try {
                await this.emailService.sendTemplateEmail({
                    to: updatedShop.email,
                    templateName: 'shop_rejected',
                    variables: {
                        shopName: updatedShop.name,
                        rejectionReason: reason,
                        supportEmail: 'smartdukainfo@gmail.com',
                    },
                });
                this.logger.log(`Rejection email sent to ${updatedShop.email}`);
            }
            catch (err) {
                this.logger.error(`Failed to send rejection email: ${err}`);
            }
        }
        return updatedShop;
    }
    async suspendShop(shopId, superAdminId, reason, notes) {
        const shop = await this.getShopDetails(shopId);
        if (!['active', 'verified'].includes(shop.status)) {
            throw new common_1.BadRequestException(`Cannot suspend shop with status: ${shop.status}`);
        }
        const oldValue = { status: shop.status };
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            status: 'suspended',
            suspensionDate: new Date(),
            suspensionReason: reason,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
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
            throw new common_1.NotFoundException('Shop not found after update');
        }
        if (this.emailService && updatedShop.email) {
            try {
                await this.emailService.sendTemplateEmail({
                    to: updatedShop.email,
                    templateName: 'shop_suspended',
                    variables: {
                        shopName: updatedShop.name,
                        suspensionReason: reason,
                        supportEmail: 'smartdukainfo@gmail.com',
                    },
                });
                this.logger.log(`Suspension email sent to ${updatedShop.email}`);
            }
            catch (err) {
                this.logger.error(`Failed to send suspension email: ${err}`);
            }
        }
        return updatedShop;
    }
    async reactivateShop(shopId, superAdminId, notes) {
        const shop = await this.getShopDetails(shopId);
        if (shop.status !== 'suspended') {
            throw new common_1.BadRequestException(`Cannot reactivate shop with status: ${shop.status}`);
        }
        const oldValue = { status: shop.status };
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            status: 'active',
            updatedAt: new Date(),
        }, { new: true })
            .exec();
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
            throw new common_1.NotFoundException('Shop not found after update');
        }
        return updatedShop;
    }
    async flagShop(shopId, superAdminId, reason, notes) {
        const shop = await this.getShopDetails(shopId);
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            isFlagged: true,
            flagReason: reason,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
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
            throw new common_1.NotFoundException('Shop not found after update');
        }
        return updatedShop;
    }
    async unflagShop(shopId, superAdminId, notes) {
        const shop = await this.getShopDetails(shopId);
        const updatedShop = await this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            isFlagged: false,
            flagReason: undefined,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
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
            throw new common_1.NotFoundException('Shop not found after update');
        }
        return updatedShop;
    }
    async getShopAuditLog(shopId, limit = 50, skip = 0) {
        return this.auditLogService.getShopAuditLog(shopId, limit, skip);
    }
    async getVerificationHistory(shopId) {
        return this.auditLogService.getVerificationHistory(shopId);
    }
    async getShopStats(shopId) {
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
            createdAt: shop.createdAt,
            updatedAt: shop.updatedAt,
        };
    }
    async getPendingShopsCount() {
        return this.shopModel.countDocuments({ status: 'pending' });
    }
    async getFlaggedShopsCount() {
        return this.shopModel.countDocuments({ isFlagged: true });
    }
    async getSuspendedShopsCount() {
        return this.shopModel.countDocuments({ status: 'suspended' });
    }
    async getVerifiedShopsCount() {
        return this.shopModel.countDocuments({ status: 'verified' });
    }
    async getActiveShopsCount() {
        return this.shopModel.countDocuments({ status: 'active' });
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = SuperAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_schema_1.Shop.name)),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        shop_audit_log_service_1.ShopAuditLogService,
        email_service_1.EmailService])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map