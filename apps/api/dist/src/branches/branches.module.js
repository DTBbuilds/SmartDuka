"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const branch_schema_1 = require("./branch.schema");
const audit_log_schema_1 = require("../audit/audit-log.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const branches_service_1 = require("./branches.service");
const branches_controller_1 = require("./branches.controller");
const staff_assignment_service_1 = require("./staff-assignment.service");
const staff_assignment_controller_1 = require("./staff-assignment.controller");
const branch_validation_middleware_1 = require("./branch-validation.middleware");
const subscriptions_module_1 = require("../subscriptions/subscriptions.module");
let BranchesModule = class BranchesModule {
};
exports.BranchesModule = BranchesModule;
exports.BranchesModule = BranchesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: branch_schema_1.Branch.name, schema: branch_schema_1.BranchSchema },
                { name: audit_log_schema_1.AuditLog.name, schema: audit_log_schema_1.AuditLogSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
            (0, common_1.forwardRef)(() => subscriptions_module_1.SubscriptionsModule),
        ],
        providers: [branches_service_1.BranchesService, staff_assignment_service_1.StaffAssignmentService, branch_validation_middleware_1.BranchValidationMiddleware],
        controllers: [branches_controller_1.BranchesController, staff_assignment_controller_1.StaffAssignmentController],
        exports: [branches_service_1.BranchesService, staff_assignment_service_1.StaffAssignmentService, branch_validation_middleware_1.BranchValidationMiddleware],
    })
], BranchesModule);
//# sourceMappingURL=branches.module.js.map