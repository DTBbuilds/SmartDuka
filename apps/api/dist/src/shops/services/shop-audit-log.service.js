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
var ShopAuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopAuditLogService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shop_audit_log_schema_1 = require("../schemas/shop-audit-log.schema");
let ShopAuditLogService = ShopAuditLogService_1 = class ShopAuditLogService {
    auditLogModel;
    logger = new common_1.Logger(ShopAuditLogService_1.name);
    constructor(auditLogModel) {
        this.auditLogModel = auditLogModel;
    }
    async create(dto) {
        try {
            const auditLog = new this.auditLogModel({
                shopId: new mongoose_2.Types.ObjectId(dto.shopId),
                performedBy: new mongoose_2.Types.ObjectId(dto.performedBy),
                action: dto.action,
                oldValue: dto.oldValue,
                newValue: dto.newValue,
                reason: dto.reason,
                notes: dto.notes,
                createdAt: new Date(),
            });
            return await auditLog.save();
        }
        catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
            throw error;
        }
    }
    async getShopAuditLog(shopId, limit = 50, skip = 0) {
        return this.auditLogModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getAuditLogsByAction(shopId, action, limit = 50) {
        return this.auditLogModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            action,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getAuditLogsByPerformer(performedBy, limit = 50) {
        return this.auditLogModel
            .find({ performedBy: new mongoose_2.Types.ObjectId(performedBy) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getAuditLogCount(shopId) {
        return this.auditLogModel.countDocuments({ shopId: new mongoose_2.Types.ObjectId(shopId) });
    }
    async getVerificationHistory(shopId) {
        return this.auditLogModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            action: { $in: ['verify', 'reject', 'suspend', 'reactivate'] },
        })
            .sort({ createdAt: -1 })
            .exec();
    }
};
exports.ShopAuditLogService = ShopAuditLogService;
exports.ShopAuditLogService = ShopAuditLogService = ShopAuditLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_audit_log_schema_1.ShopAuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ShopAuditLogService);
//# sourceMappingURL=shop-audit-log.service.js.map