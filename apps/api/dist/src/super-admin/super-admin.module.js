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
const subscription_schema_1 = require("../subscriptions/schemas/subscription.schema");
const subscription_invoice_schema_1 = require("../subscriptions/schemas/subscription-invoice.schema");
const payment_transaction_schema_1 = require("../payments/schemas/payment-transaction.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const system_audit_log_schema_1 = require("./schemas/system-audit-log.schema");
const email_log_schema_1 = require("./schemas/email-log.schema");
const super_admin_service_1 = require("./super-admin.service");
const super_admin_controller_1 = require("./super-admin.controller");
const system_management_controller_1 = require("./system-management.controller");
const shop_audit_log_service_1 = require("../shops/services/shop-audit-log.service");
const system_audit_service_1 = require("./services/system-audit.service");
const email_log_service_1 = require("./services/email-log.service");
const system_management_service_1 = require("./services/system-management.service");
const notifications_module_1 = require("../notifications/notifications.module");
let SuperAdminModule = class SuperAdminModule {
};
exports.SuperAdminModule = SuperAdminModule;
exports.SuperAdminModule = SuperAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: shop_schema_1.Shop.name, schema: shop_schema_1.ShopSchema },
                { name: shop_audit_log_schema_1.ShopAuditLog.name, schema: shop_audit_log_schema_1.ShopAuditLogSchema },
                { name: subscription_schema_1.Subscription.name, schema: subscription_schema_1.SubscriptionSchema },
                { name: subscription_invoice_schema_1.SubscriptionInvoice.name, schema: subscription_invoice_schema_1.SubscriptionInvoiceSchema },
                { name: payment_transaction_schema_1.PaymentTransaction.name, schema: payment_transaction_schema_1.PaymentTransactionSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: system_audit_log_schema_1.SystemAuditLog.name, schema: system_audit_log_schema_1.SystemAuditLogSchema },
                { name: email_log_schema_1.EmailLog.name, schema: email_log_schema_1.EmailLogSchema },
            ]),
            notifications_module_1.NotificationsModule,
        ],
        providers: [
            super_admin_service_1.SuperAdminService,
            shop_audit_log_service_1.ShopAuditLogService,
            system_audit_service_1.SystemAuditService,
            email_log_service_1.EmailLogService,
            system_management_service_1.SystemManagementService,
        ],
        controllers: [super_admin_controller_1.SuperAdminController, system_management_controller_1.SystemManagementController],
        exports: [
            super_admin_service_1.SuperAdminService,
            shop_audit_log_service_1.ShopAuditLogService,
            system_audit_service_1.SystemAuditService,
            email_log_service_1.EmailLogService,
            system_management_service_1.SystemManagementService,
        ],
    })
], SuperAdminModule);
//# sourceMappingURL=super-admin.module.js.map