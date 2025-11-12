"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const inventory_service_1 = require("./inventory.service");
const inventory_controller_1 = require("./inventory.controller");
const product_schema_1 = require("./schemas/product.schema");
const category_schema_1 = require("./schemas/category.schema");
const stock_adjustment_schema_1 = require("./schemas/stock-adjustment.schema");
const stock_reconciliation_schema_1 = require("./schemas/stock-reconciliation.schema");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
                { name: category_schema_1.Category.name, schema: category_schema_1.CategorySchema },
                { name: stock_adjustment_schema_1.StockAdjustment.name, schema: stock_adjustment_schema_1.StockAdjustmentSchema },
                { name: stock_reconciliation_schema_1.StockReconciliation.name, schema: stock_reconciliation_schema_1.StockReconciliationSchema },
            ]),
        ],
        providers: [inventory_service_1.InventoryService],
        controllers: [inventory_controller_1.InventoryController],
        exports: [inventory_service_1.InventoryService],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map