"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const sales_service_1 = require("./sales.service");
const sales_controller_1 = require("./sales.controller");
const order_schema_1 = require("./schemas/order.schema");
const receipt_schema_1 = require("./schemas/receipt.schema");
const invoice_schema_1 = require("./schemas/invoice.schema");
const receipt_service_1 = require("./services/receipt.service");
const invoice_service_1 = require("./services/invoice.service");
const inventory_module_1 = require("../inventory/inventory.module");
const activity_module_1 = require("../activity/activity.module");
const payments_module_1 = require("../payments/payments.module");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: receipt_schema_1.Receipt.name, schema: receipt_schema_1.ReceiptSchema },
                { name: invoice_schema_1.Invoice.name, schema: invoice_schema_1.InvoiceSchema },
            ]),
            inventory_module_1.InventoryModule,
            activity_module_1.ActivityModule,
            payments_module_1.PaymentsModule,
        ],
        providers: [sales_service_1.SalesService, receipt_service_1.ReceiptService, invoice_service_1.InvoiceService],
        controllers: [sales_controller_1.SalesController],
        exports: [sales_service_1.SalesService, receipt_service_1.ReceiptService, invoice_service_1.InvoiceService],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map