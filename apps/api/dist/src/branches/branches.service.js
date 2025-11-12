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
let BranchesService = BranchesService_1 = class BranchesService {
    branchModel;
    auditModel;
    logger = new common_1.Logger(BranchesService_1.name);
    constructor(branchModel, auditModel) {
        this.branchModel = branchModel;
        this.auditModel = auditModel;
    }
    async create(shopId, userId, dto) {
        const existing = await this.branchModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            code: dto.code,
        });
        if (existing) {
            throw new common_1.BadRequestException('Branch code already exists in this shop');
        }
        const branch = new this.branchModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            ...dto,
            createdBy: new mongoose_2.Types.ObjectId(userId),
        });
        const created = await branch.save();
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(userId),
            action: 'create_branch',
            resource: 'branch',
            resourceId: created._id,
            changes: {
                before: null,
                after: created.toObject(),
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
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = BranchesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __param(1, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], BranchesService);
//# sourceMappingURL=branches.service.js.map