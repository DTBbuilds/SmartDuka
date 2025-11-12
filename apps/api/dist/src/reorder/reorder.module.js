"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReorderModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const reorder_service_1 = require("./reorder.service");
const reorder_controller_1 = require("./reorder.controller");
const product_schema_1 = require("../inventory/schemas/product.schema");
const purchase_schema_1 = require("../purchases/purchase.schema");
let ReorderModule = class ReorderModule {
};
exports.ReorderModule = ReorderModule;
exports.ReorderModule = ReorderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
                { name: purchase_schema_1.Purchase.name, schema: purchase_schema_1.PurchaseSchema },
            ]),
        ],
        providers: [reorder_service_1.ReorderService],
        controllers: [reorder_controller_1.ReorderController],
        exports: [reorder_service_1.ReorderService],
    })
], ReorderModule);
//# sourceMappingURL=reorder.module.js.map