"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const reconciliation_schema_1 = require("./reconciliation.schema");
const reconciliation_service_1 = require("./reconciliation.service");
const reconciliation_controller_1 = require("./reconciliation.controller");
const order_schema_1 = require("../sales/schemas/order.schema");
let FinancialModule = class FinancialModule {
};
exports.FinancialModule = FinancialModule;
exports.FinancialModule = FinancialModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: reconciliation_schema_1.Reconciliation.name, schema: reconciliation_schema_1.ReconciliationSchema },
                { name: 'Order', schema: order_schema_1.OrderSchema },
            ]),
        ],
        providers: [reconciliation_service_1.ReconciliationService],
        controllers: [reconciliation_controller_1.ReconciliationController],
        exports: [reconciliation_service_1.ReconciliationService],
    })
], FinancialModule);
//# sourceMappingURL=financial.module.js.map