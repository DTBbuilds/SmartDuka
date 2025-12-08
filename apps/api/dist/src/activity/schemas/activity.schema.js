"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitySchema = exports.Activity = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Activity = class Activity {
    shopId;
    userId;
    userName;
    userRole;
    action;
    details;
    ipAddress;
    userAgent;
    timestamp;
};
exports.Activity = Activity;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop', index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Activity.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User', index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Activity.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Activity.prototype, "userName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['admin', 'cashier'] }),
    __metadata("design:type", String)
], Activity.prototype, "userRole", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: [
            'login',
            'login_pin',
            'logout',
            'heartbeat',
            'status_change',
            'checkout',
            'product_view',
            'inventory_view',
            'report_view',
            'product_add',
            'product_edit',
            'product_delete',
            'stock_update',
            'cashier_add',
            'cashier_delete',
            'cashier_disable',
            'cashier_enable',
            'settings_change',
            'shift_start',
            'shift_end',
            'shift_reconcile',
            'transaction_void',
            'transaction_refund',
            'transaction_discount',
        ],
    }),
    __metadata("design:type", String)
], Activity.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Activity.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", String)
], Activity.prototype, "ipAddress", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", String)
], Activity.prototype, "userAgent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, index: true }),
    __metadata("design:type", Date)
], Activity.prototype, "timestamp", void 0);
exports.Activity = Activity = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Activity);
exports.ActivitySchema = mongoose_1.SchemaFactory.createForClass(Activity);
exports.ActivitySchema.index({ shopId: 1, createdAt: -1 });
exports.ActivitySchema.index({ shopId: 1, userId: 1, createdAt: -1 });
exports.ActivitySchema.index({ shopId: 1, action: 1 });
exports.ActivitySchema.index({ userId: 1, action: 1 });
exports.ActivitySchema.index({ shopId: 1, 'details.branchId': 1, createdAt: -1 });
exports.ActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
//# sourceMappingURL=activity.schema.js.map