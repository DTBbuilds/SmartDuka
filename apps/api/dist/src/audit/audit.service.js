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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const audit_log_schema_1 = require("./audit-log.schema");
let AuditService = AuditService_1 = class AuditService {
    auditModel;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(auditModel) {
        this.auditModel = auditModel;
    }
    async log(shopId, userId, action, resource, resourceId, changes, branchId) {
        const log = new this.auditModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action,
            resource,
            resourceId: resourceId ? new mongoose_2.Types.ObjectId(resourceId) : undefined,
            changes,
            branchId: branchId ? new mongoose_2.Types.ObjectId(branchId) : undefined,
        });
        const saved = await log.save();
        this.logger.debug(`Audit logged: ${action} on ${resource}`);
        return saved;
    }
    async getByShop(shopId, filters) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (filters?.action)
            query.action = filters.action;
        if (filters?.resource)
            query.resource = filters.resource;
        if (filters?.userId)
            query.userId = new mongoose_2.Types.ObjectId(filters.userId);
        if (filters?.branchId)
            query.branchId = new mongoose_2.Types.ObjectId(filters.branchId);
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate)
                query.createdAt.$gte = filters.startDate;
            if (filters.endDate)
                query.createdAt.$lte = filters.endDate;
        }
        return this.auditModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(filters?.limit || 100)
            .exec();
    }
    async getByBranch(branchId, shopId, limit = 100) {
        return this.auditModel
            .find({
            branchId: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getByUser(userId, shopId, limit = 100) {
        return this.auditModel
            .find({
            userId: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getByResource(resourceId, shopId, limit = 100) {
        return this.auditModel
            .find({
            resourceId: new mongoose_2.Types.ObjectId(resourceId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getStats(shopId) {
        const logs = await this.auditModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const actionCounts = {};
        const resourceCounts = {};
        const userCounts = {};
        for (const log of logs) {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
            const userId = log.userId.toString();
            userCounts[userId] = (userCounts[userId] || 0) + 1;
        }
        const topUsers = Object.entries(userCounts)
            .map(([userId, count]) => ({ userId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            totalLogs: logs.length,
            actionCounts,
            resourceCounts,
            topUsers,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AuditService);
//# sourceMappingURL=audit.service.js.map