"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const inventory_module_1 = require("./inventory/inventory.module");
const sales_module_1 = require("./sales/sales.module");
const payments_module_1 = require("./payments/payments.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const purchases_module_1 = require("./purchases/purchases.module");
const adjustments_module_1 = require("./stock/adjustments.module");
const shops_module_1 = require("./shops/shops.module");
const realtime_module_1 = require("./realtime/realtime.module");
const reports_module_1 = require("./reports/reports.module");
const customers_module_1 = require("./customers/customers.module");
const activity_module_1 = require("./activity/activity.module");
const super_admin_module_1 = require("./super-admin/super-admin.module");
const support_module_1 = require("./support/support.module");
const shifts_module_1 = require("./shifts/shifts.module");
const discounts_module_1 = require("./discounts/discounts.module");
const returns_module_1 = require("./returns/returns.module");
const receipts_module_1 = require("./receipts/receipts.module");
const loyalty_module_1 = require("./loyalty/loyalty.module");
const locations_module_1 = require("./locations/locations.module");
const financial_module_1 = require("./financial/financial.module");
const shop_settings_module_1 = require("./shop-settings/shop-settings.module");
const reorder_module_1 = require("./reorder/reorder.module");
const branches_module_1 = require("./branches/branches.module");
const audit_module_1 = require("./audit/audit.module");
const health_module_1 = require("./health/health.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/smartduka'),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 60000,
                    limit: 100,
                },
                {
                    name: 'long',
                    ttl: 3600000,
                    limit: 1000,
                },
            ]),
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            inventory_module_1.InventoryModule,
            sales_module_1.SalesModule,
            payments_module_1.PaymentsModule,
            suppliers_module_1.SuppliersModule,
            purchases_module_1.PurchasesModule,
            adjustments_module_1.AdjustmentsModule,
            shops_module_1.ShopsModule,
            realtime_module_1.RealtimeModule,
            reports_module_1.ReportsModule,
            customers_module_1.CustomersModule,
            discounts_module_1.DiscountsModule,
            returns_module_1.ReturnsModule,
            receipts_module_1.ReceiptsModule,
            loyalty_module_1.LoyaltyModule,
            locations_module_1.LocationsModule,
            financial_module_1.FinancialModule,
            activity_module_1.ActivityModule,
            super_admin_module_1.SuperAdminModule,
            support_module_1.SupportModule,
            shifts_module_1.ShiftsModule,
            shop_settings_module_1.ShopSettingsModule,
            reorder_module_1.ReorderModule,
            branches_module_1.BranchesModule,
            audit_module_1.AuditModule,
            subscriptions_module_1.SubscriptionsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map