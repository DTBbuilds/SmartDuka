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
exports.PaymentTransactionSchema = exports.PaymentTransaction = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let PaymentTransaction = class PaymentTransaction {
    shopId;
    orderId;
    orderNumber;
    cashierId;
    cashierName;
    branchId;
    paymentMethod;
    amount;
    status;
    customerName;
    customerPhone;
    notes;
    mpesaReceiptNumber;
    mpesaTransactionId;
    cardLastFour;
    cardBrand;
    amountTendered;
    change;
    referenceNumber;
    errorCode;
    errorMessage;
    processedAt;
    completedAt;
    createdAt;
    updatedAt;
};
exports.PaymentTransaction = PaymentTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], PaymentTransaction.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Order' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], PaymentTransaction.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "orderNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], PaymentTransaction.prototype, "cashierId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "cashierName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId, ref: 'Branch' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], PaymentTransaction.prototype, "branchId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['cash', 'card', 'mpesa', 'other'], default: 'cash' }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['completed', 'pending', 'failed'], default: 'completed' }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "customerName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "customerPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "mpesaReceiptNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "mpesaTransactionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "cardLastFour", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "cardBrand", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "amountTendered", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "change", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "referenceNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "errorCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "errorMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "processedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "completedAt", void 0);
exports.PaymentTransaction = PaymentTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PaymentTransaction);
exports.PaymentTransactionSchema = mongoose_1.SchemaFactory.createForClass(PaymentTransaction);
exports.PaymentTransactionSchema.index({ shopId: 1, createdAt: -1 });
exports.PaymentTransactionSchema.index({ shopId: 1, cashierId: 1 });
exports.PaymentTransactionSchema.index({ shopId: 1, paymentMethod: 1 });
exports.PaymentTransactionSchema.index({ shopId: 1, status: 1 });
exports.PaymentTransactionSchema.index({ shopId: 1, branchId: 1 });
exports.PaymentTransactionSchema.index({ orderId: 1 });
exports.PaymentTransactionSchema.index({ createdAt: -1 });
//# sourceMappingURL=payment-transaction.schema.js.map