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
var BranchesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const branch_schema_1 = require("./branch.schema");
const audit_log_schema_1 = require("../audit/audit-log.schema");
const subscription_guard_service_1 = require("../subscriptions/subscription-guard.service");
let BranchesService = BranchesService_1 = class BranchesService {
    branchModel;
    auditModel;
    subscriptionGuard;
    logger = new common_1.Logger(BranchesService_1.name);
    constructor(branchModel, auditModel, subscriptionGuard) {
        this.branchModel = branchModel;
        this.auditModel = auditModel;
        this.subscriptionGuard = subscriptionGuard;
    }
    async create(shopId, userId, dto) {
        await this.subscriptionGuard.enforceLimit(shopId, 'shops');
        const existing = await this.branchModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            code: dto.code,
        });
        if (existing) {
            throw new common_1.BadRequestException('Branch code already exists in this shop');
        }
        const branchData = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
            name: dto.name,
            code: dto.code,
            description: dto.description,
            address: dto.address,
            phone: dto.phone,
            email: dto.email,
            inventoryType: dto.inventoryType,
            canTransferStock: dto.canTransferStock,
            openingTime: dto.openingTime,
            closingTime: dto.closingTime,
            timezone: dto.timezone,
            location: dto.location,
            operations: dto.operations,
            contacts: dto.contacts,
            maxStaff: dto.maxStaff,
            targetRevenue: dto.targetRevenue,
            costCenter: dto.costCenter,
            taxExempt: dto.taxExempt,
            metadata: dto.metadata,
            createdBy: new mongoose_2.Types.ObjectId(userId),
        };
        if (dto.managerId) {
            branchData.managerId = new mongoose_2.Types.ObjectId(dto.managerId);
        }
        if (dto.paymentConfig) {
            branchData.paymentConfig = {
                enabled: dto.paymentConfig.enabled ?? false,
                useShopConfig: dto.paymentConfig.useShopConfig ?? true,
                type: dto.paymentConfig.type,
                shortCode: dto.paymentConfig.shortCode,
                accountPrefix: dto.paymentConfig.accountPrefix,
                verificationStatus: 'pending',
            };
            if (dto.paymentConfig.consumerKey) {
                this.logger.warn('Branch payment credentials provided - consider using PaymentConfig service for proper encryption');
            }
        }
        const branch = new this.branchModel(branchData);
        const created = await branch.save();
        await this.subscriptionGuard.incrementUsage(shopId, 'shops');
        const auditData = { ...created.toObject() };
        if (auditData.paymentConfig) {
            auditData.paymentConfig = {
                ...auditData.paymentConfig,
                consumerKey: auditData.paymentConfig.consumerKey ? '****' : undefined,
                consumerSecret: auditData.paymentConfig.consumerSecret ? '****' : undefined,
                passkey: auditData.paymentConfig.passkey ? '****' : undefined,
            };
        }
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'create_branch',
            resource: 'branch',
            resourceId: created._id,
            changes: {
                before: null,
                after: auditData,
            },
        });
        this.logger.log(`Branch created: ${created.name} (${created.code}) in shop ${shopId}`);
        return created;
    }
    async findByShop(shopId) {
        return this.branchModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findById(branchId, shopId) {
        return this.branchModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
    }
    async findByCode(code, shopId) {
        return this.branchModel
            .findOne({
            code,
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
    }
    async update(branchId, shopId, userId, dto) {
        const before = await this.findById(branchId, shopId);
        if (!before) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const updated = await this.branchModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, { ...dto, updatedAt: new Date() }, { new: true })
            .exec();
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'update_branch',
            resource: 'branch',
            resourceId: new mongoose_2.Types.ObjectId(branchId),
            changes: {
                before: before.toObject(),
                after: updated?.toObject(),
            },
        });
        this.logger.log(`Branch updated: ${branchId} in shop ${shopId}`);
        return updated;
    }
    async delete(branchId, shopId, userId) {
        const branch = await this.findById(branchId, shopId);
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const result = await this.branchModel
            .deleteOne({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
        if (result.deletedCount > 0) {
            await this.subscriptionGuard.decrementUsage(shopId, 'shops');
        }
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'delete_branch',
            resource: 'branch',
            resourceId: new mongoose_2.Types.ObjectId(branchId),
            changes: {
                before: branch.toObject(),
                after: null,
            },
        });
        this.logger.log(`Branch deleted: ${branchId} in shop ${shopId}`);
        return result.deletedCount > 0;
    }
    async countByShop(shopId) {
        return this.branchModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
    }
    async getActive(shopId) {
        return this.branchModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        })
            .sort({ name: 1 })
            .exec();
    }
    async getBranchesWithPaymentConfig(shopId) {
        return this.branchModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            'paymentConfig.enabled': true,
            'paymentConfig.useShopConfig': false,
        })
            .sort({ name: 1 })
            .exec();
    }
    async updatePaymentConfig(branchId, shopId, userId, paymentConfig) {
        const branch = await this.findById(branchId, shopId);
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const before = branch.toObject();
        const updateData = {
            'paymentConfig.enabled': paymentConfig?.enabled ?? false,
            'paymentConfig.useShopConfig': paymentConfig?.useShopConfig ?? true,
            'paymentConfig.type': paymentConfig?.type,
            'paymentConfig.shortCode': paymentConfig?.shortCode,
            'paymentConfig.accountPrefix': paymentConfig?.accountPrefix,
            updatedAt: new Date(),
        };
        if (paymentConfig?.shortCode !== branch.paymentConfig?.shortCode) {
            updateData['paymentConfig.verificationStatus'] = 'pending';
            updateData['paymentConfig.verifiedAt'] = null;
        }
        const updated = await this.branchModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, { $set: updateData }, { new: true })
            .exec();
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'update_branch_payment_config',
            resource: 'branch',
            resourceId: new mongoose_2.Types.ObjectId(branchId),
            changes: {
                before: { paymentConfig: before.paymentConfig },
                after: { paymentConfig: updated?.paymentConfig },
            },
        });
        this.logger.log(`Branch payment config updated: ${branchId} in shop ${shopId}`);
        return updated;
    }
    async getPaymentConfigStatus(branchId, shopId) {
        const branch = await this.findById(branchId, shopId);
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const config = branch.paymentConfig;
        return {
            hasOwnConfig: !!(config?.enabled && !config?.useShopConfig),
            usesShopConfig: config?.useShopConfig ?? true,
            isConfigured: !!(config?.shortCode && config?.enabled),
            isVerified: config?.verificationStatus === 'verified',
            shortCode: config?.shortCode,
            type: config?.type,
        };
    }
    async assignManager(branchId, shopId, userId, managerId) {
        const branch = await this.findById(branchId, shopId);
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const updated = await this.branchModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, {
            $set: {
                managerId: new mongoose_2.Types.ObjectId(managerId),
                updatedAt: new Date(),
            },
        }, { new: true })
            .exec();
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'assign_branch_manager',
            resource: 'branch',
            resourceId: new mongoose_2.Types.ObjectId(branchId),
            changes: {
                before: { managerId: branch.managerId },
                after: { managerId },
            },
        });
        this.logger.log(`Manager ${managerId} assigned to branch ${branchId}`);
        return updated;
    }
    async addStaff(branchId, shopId, userId, staffId) {
        const branch = await this.findById(branchId, shopId);
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        if (branch.maxStaff && (branch.staffIds?.length || 0) >= branch.maxStaff) {
            throw new common_1.BadRequestException(`Branch has reached maximum staff limit of ${branch.maxStaff}`);
        }
        const updated = await this.branchModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, {
            $addToSet: { staffIds: new mongoose_2.Types.ObjectId(staffId) },
            $set: { updatedAt: new Date() },
        }, { new: true })
            .exec();
        this.logger.log(`Staff ${staffId} added to branch ${branchId}`);
        return updated;
    }
    async removeStaff(branchId, shopId, userId, staffId) {
        const updated = await this.branchModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, {
            $pull: { staffIds: new mongoose_2.Types.ObjectId(staffId) },
            $set: { updatedAt: new Date() },
        }, { new: true })
            .exec();
        this.logger.log(`Staff ${staffId} removed from branch ${branchId}`);
        return updated;
    }
    async getByCounty(shopId, county) {
        return this.branchModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            'location.county': county,
            status: 'active',
        })
            .sort({ name: 1 })
            .exec();
    }
    async getDeliveryBranches(shopId) {
        return this.branchModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            'operations.acceptsDelivery': true,
            status: 'active',
        })
            .sort({ name: 1 })
            .exec();
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = BranchesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __param(1, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => subscription_guard_service_1.SubscriptionGuardService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        subscription_guard_service_1.SubscriptionGuardService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map