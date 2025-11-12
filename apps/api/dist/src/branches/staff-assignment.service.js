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
var StaffAssignmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const branch_schema_1 = require("./branch.schema");
const audit_log_schema_1 = require("../audit/audit-log.schema");
let StaffAssignmentService = StaffAssignmentService_1 = class StaffAssignmentService {
    userModel;
    branchModel;
    auditModel;
    logger = new common_1.Logger(StaffAssignmentService_1.name);
    constructor(userModel, branchModel, auditModel) {
        this.userModel = userModel;
        this.branchModel = branchModel;
        this.auditModel = auditModel;
    }
    async assignToBranch(shopId, userId, branchId, assignedBy) {
        const branch = await this.branchModel.findOne({
            _id: new mongoose_2.Types.ObjectId(branchId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!branch) {
            throw new common_1.BadRequestException('Branch not found');
        }
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const updated = await this.userModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(userId), {
            branchId: new mongoose_2.Types.ObjectId(branchId),
            lastBranchId: new mongoose_2.Types.ObjectId(branchId),
        }, { new: true });
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(assignedBy),
            action: 'assign_staff_to_branch',
            resource: 'user',
            resourceId: new mongoose_2.Types.ObjectId(userId),
            changes: {
                before: { branchId: user.branchId },
                after: { branchId: new mongoose_2.Types.ObjectId(branchId) },
            },
        });
        this.logger.log(`User ${userId} assigned to branch ${branchId}`);
        return updated;
    }
    async assignToMultipleBranches(shopId, userId, branchIds, assignedBy) {
        const branches = await this.branchModel.find({
            _id: { $in: branchIds.map(id => new mongoose_2.Types.ObjectId(id)) },
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (branches.length !== branchIds.length) {
            throw new common_1.BadRequestException('One or more branches not found');
        }
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const updated = await this.userModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(userId), {
            branches: branchIds.map(id => new mongoose_2.Types.ObjectId(id)),
        }, { new: true });
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(assignedBy),
            action: 'assign_staff_to_multiple_branches',
            resource: 'user',
            resourceId: new mongoose_2.Types.ObjectId(userId),
            changes: {
                before: { branches: user.branches },
                after: { branches: branchIds.map(id => new mongoose_2.Types.ObjectId(id)) },
            },
        });
        this.logger.log(`User ${userId} assigned to ${branchIds.length} branches`);
        return updated;
    }
    async getStaffByBranch(shopId, branchId) {
        return this.userModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            $or: [
                { branchId: new mongoose_2.Types.ObjectId(branchId) },
                { branches: new mongoose_2.Types.ObjectId(branchId) },
            ],
        })
            .select('-passwordHash -pinHash')
            .sort({ name: 1 })
            .exec();
    }
    async removeFromBranch(shopId, userId, branchId, removedBy) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.branchId?.toString() === branchId) {
            const updated = await this.userModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(userId), { branchId: null }, { new: true });
            await this.auditModel.create({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                branchId: new mongoose_2.Types.ObjectId(branchId),
                userId: new mongoose_2.Types.ObjectId(removedBy),
                action: 'remove_staff_from_branch',
                resource: 'user',
                resourceId: new mongoose_2.Types.ObjectId(userId),
                changes: {
                    before: { branchId: new mongoose_2.Types.ObjectId(branchId) },
                    after: { branchId: null },
                },
            });
            this.logger.log(`User ${userId} removed from branch ${branchId}`);
            return updated;
        }
        if (user.branches && user.branches.length > 0) {
            const updatedBranches = user.branches.filter(b => b.toString() !== branchId);
            const updated = await this.userModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(userId), { branches: updatedBranches }, { new: true });
            await this.auditModel.create({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                branchId: new mongoose_2.Types.ObjectId(branchId),
                userId: new mongoose_2.Types.ObjectId(removedBy),
                action: 'remove_staff_from_branch',
                resource: 'user',
                resourceId: new mongoose_2.Types.ObjectId(userId),
                changes: {
                    before: { branches: user.branches },
                    after: { branches: updatedBranches },
                },
            });
            this.logger.log(`User ${userId} removed from branch ${branchId}`);
            return updated;
        }
        throw new common_1.BadRequestException('User is not assigned to this branch');
    }
    async updateBranchPermissions(shopId, userId, branchId, permissions, updatedBy) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const branchPermissions = user.branchPermissions || {};
        const oldPermissions = branchPermissions[branchId];
        branchPermissions[branchId] = permissions;
        const updated = await this.userModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(userId), { branchPermissions }, { new: true });
        await this.auditModel.create({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            userId: new mongoose_2.Types.ObjectId(updatedBy),
            action: 'update_branch_permissions',
            resource: 'user',
            resourceId: new mongoose_2.Types.ObjectId(userId),
            changes: {
                before: { permissions: oldPermissions },
                after: { permissions },
            },
        });
        this.logger.log(`Permissions updated for user ${userId} in branch ${branchId}`);
        return updated;
    }
    async getBranchPermissions(shopId, userId, branchId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        return user.branchPermissions?.[branchId] || {};
    }
};
exports.StaffAssignmentService = StaffAssignmentService;
exports.StaffAssignmentService = StaffAssignmentService = StaffAssignmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __param(2, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], StaffAssignmentService);
//# sourceMappingURL=staff-assignment.service.js.map