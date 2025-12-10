"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const shifts_service_1 = require("./shifts.service");
const shifts_controller_1 = require("./shifts.controller");
const shift_schema_1 = require("./schemas/shift.schema");
const order_schema_1 = require("../sales/schemas/order.schema");
let ShiftsModule = class ShiftsModule {
};
exports.ShiftsModule = ShiftsModule;
exports.ShiftsModule = ShiftsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                {
                    name: shift_schema_1.Shift.name,
                    schema: shift_schema_1.ShiftSchema,
                },
                {
                    name: order_schema_1.Order.name,
                    schema: order_schema_1.OrderSchema,
                },
            ]),
        ],
        providers: [shifts_service_1.ShiftsService],
        controllers: [shifts_controller_1.ShiftsController],
        exports: [shifts_service_1.ShiftsService],
    })
], ShiftsModule);
//# sourceMappingURL=shifts.module.js.map