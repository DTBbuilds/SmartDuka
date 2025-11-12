"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const shop_schema_1 = require("../shops/schemas/shop.schema");
const shop_audit_log_schema_1 = require("../shops/schemas/shop-audit-log.schema");
const super_admin_service_1 = require("./super-admin.service");
const super_admin_controller_1 = require("./super-admin.controller");
const shop_audit_log_service_1 = require("../shops/services/shop-audit-log.service");
let SuperAdminModule = class SuperAdminModule {
};
exports.SuperAdminModule = SuperAdminModule;
exports.SuperAdminModule = SuperAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: shop_schema_1.Shop.name, schema: shop_schema_1.ShopSchema },
                { name: shop_audit_log_schema_1.ShopAuditLog.name, schema: shop_audit_log_schema_1.ShopAuditLogSchema },
            ]),
        ],
        providers: [super_admin_service_1.SuperAdminService, shop_audit_log_service_1.ShopAuditLogService],
        controllers: [super_admin_controller_1.SuperAdminController],
        exports: [super_admin_service_1.SuperAdminService, shop_audit_log_service_1.ShopAuditLogService],
    })
], SuperAdminModule);
//# sourceMappingURL=super-admin.module.js.map