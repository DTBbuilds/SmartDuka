"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const schedule_1 = require("@nestjs/schedule");
const payments_service_1 = require("./payments.service");
const payments_controller_1 = require("./payments.controller");
const daraja_service_1 = require("./daraja.service");
const payment_transaction_service_1 = require("./services/payment-transaction.service");
const mpesa_service_1 = require("./services/mpesa.service");
const mpesa_multi_tenant_service_1 = require("./services/mpesa-multi-tenant.service");
const mpesa_encryption_service_1 = require("./services/mpesa-encryption.service");
const mpesa_reconciliation_service_1 = require("./services/mpesa-reconciliation.service");
const payment_config_service_1 = require("./services/payment-config.service");
const mpesa_transaction_manager_service_1 = require("./services/mpesa-transaction-manager.service");
const mpesa_controller_1 = require("./mpesa.controller");
const payment_config_controller_1 = require("./payment-config.controller");
const payment_transaction_schema_1 = require("./schemas/payment-transaction.schema");
const mpesa_transaction_schema_1 = require("./schemas/mpesa-transaction.schema");
const payment_config_schema_1 = require("./schemas/payment-config.schema");
const verification_log_schema_1 = require("./schemas/verification-log.schema");
const config_audit_log_schema_1 = require("./schemas/config-audit-log.schema");
const shop_schema_1 = require("../shops/schemas/shop.schema");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            schedule_1.ScheduleModule.forRoot(),
            mongoose_1.MongooseModule.forFeature([
                { name: payment_transaction_schema_1.PaymentTransaction.name, schema: payment_transaction_schema_1.PaymentTransactionSchema },
                { name: mpesa_transaction_schema_1.MpesaTransaction.name, schema: mpesa_transaction_schema_1.MpesaTransactionSchema },
                { name: payment_config_schema_1.PaymentConfig.name, schema: payment_config_schema_1.PaymentConfigSchema },
                { name: verification_log_schema_1.VerificationLog.name, schema: verification_log_schema_1.VerificationLogSchema },
                { name: config_audit_log_schema_1.ConfigAuditLog.name, schema: config_audit_log_schema_1.ConfigAuditLogSchema },
                { name: shop_schema_1.Shop.name, schema: shop_schema_1.ShopSchema },
            ]),
        ],
        providers: [
            payments_service_1.PaymentsService,
            daraja_service_1.DarajaService,
            payment_transaction_service_1.PaymentTransactionService,
            mpesa_service_1.MpesaService,
            mpesa_multi_tenant_service_1.MpesaMultiTenantService,
            mpesa_encryption_service_1.MpesaEncryptionService,
            mpesa_reconciliation_service_1.MpesaReconciliationService,
            payment_config_service_1.PaymentConfigService,
            mpesa_transaction_manager_service_1.MpesaTransactionManagerService,
        ],
        controllers: [payments_controller_1.PaymentsController, mpesa_controller_1.MpesaController, payment_config_controller_1.PaymentConfigController],
        exports: [
            payments_service_1.PaymentsService,
            daraja_service_1.DarajaService,
            payment_transaction_service_1.PaymentTransactionService,
            mpesa_service_1.MpesaService,
            mpesa_multi_tenant_service_1.MpesaMultiTenantService,
            mpesa_encryption_service_1.MpesaEncryptionService,
            mpesa_reconciliation_service_1.MpesaReconciliationService,
            payment_config_service_1.PaymentConfigService,
            mpesa_transaction_manager_service_1.MpesaTransactionManagerService,
        ],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map