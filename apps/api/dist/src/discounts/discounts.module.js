"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const discounts_service_1 = require("./discounts.service");
const discounts_controller_1 = require("./discounts.controller");
const discount_schema_1 = require("./schemas/discount.schema");
const discount_audit_schema_1 = require("./schemas/discount-audit.schema");
let DiscountsModule = class DiscountsModule {
};
exports.DiscountsModule = DiscountsModule;
exports.DiscountsModule = DiscountsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: discount_schema_1.Discount.name, schema: discount_schema_1.DiscountSchema },
                { name: discount_audit_schema_1.DiscountAudit.name, schema: discount_audit_schema_1.DiscountAuditSchema },
            ]),
        ],
        providers: [discounts_service_1.DiscountsService],
        controllers: [discounts_controller_1.DiscountsController],
        exports: [discounts_service_1.DiscountsService],
    })
], DiscountsModule);
//# sourceMappingURL=discounts.module.js.map