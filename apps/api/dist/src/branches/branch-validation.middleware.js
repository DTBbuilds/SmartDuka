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
var BranchValidationMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchValidationMiddleware = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const branch_schema_1 = require("./branch.schema");
let BranchValidationMiddleware = BranchValidationMiddleware_1 = class BranchValidationMiddleware {
    branchModel;
    logger = new common_1.Logger(BranchValidationMiddleware_1.name);
    constructor(branchModel) {
        this.branchModel = branchModel;
    }
    async use(req, res, next) {
        const branchId = req.params.branchId || req.query.branchId;
        if (!branchId) {
            return next();
        }
        try {
            const user = req.user;
            if (!user) {
                throw new common_1.ForbiddenException('User not authenticated');
            }
            const branch = await this.branchModel.findOne({
                _id: new mongoose_2.Types.ObjectId(branchId),
                shopId: new mongoose_2.Types.ObjectId(user.shopId),
            });
            if (!branch) {
                throw new common_1.ForbiddenException('Branch not found or access denied');
            }
            const userRole = user.role;
            const userBranchId = user.branchId?.toString();
            const userBranches = user.branches?.map((b) => b.toString()) || [];
            if (userRole === 'admin') {
                return next();
            }
            if (userRole === 'branch_admin' && userBranches.includes(branchId)) {
                return next();
            }
            if (userRole === 'branch_manager' && userBranchId === branchId) {
                return next();
            }
            if ((userRole === 'cashier' || userRole === 'supervisor') && userBranchId === branchId) {
                return next();
            }
            throw new common_1.ForbiddenException('You do not have access to this branch');
        }
        catch (error) {
            this.logger.error(`Branch validation error: ${error.message}`);
            throw error;
        }
    }
};
exports.BranchValidationMiddleware = BranchValidationMiddleware;
exports.BranchValidationMiddleware = BranchValidationMiddleware = BranchValidationMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BranchValidationMiddleware);
//# sourceMappingURL=branch-validation.middleware.js.map