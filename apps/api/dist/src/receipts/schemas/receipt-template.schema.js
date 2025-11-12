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
exports.ReceiptTemplateSchema = exports.ReceiptTemplate = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ReceiptTemplate = class ReceiptTemplate {
    shopId;
    name;
    header;
    footer;
    companyName;
    companyPhone;
    companyEmail;
    companyWebsite;
    showItemDetails;
    showTaxBreakdown;
    showQRCode;
    qrCodeContent;
    showThankYouMessage;
    thankYouMessage;
    status;
    isDefault;
};
exports.ReceiptTemplate = ReceiptTemplate;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ReceiptTemplate.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "header", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "footer", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "companyName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "companyPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "companyEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "companyWebsite", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ReceiptTemplate.prototype, "showItemDetails", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ReceiptTemplate.prototype, "showTaxBreakdown", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ReceiptTemplate.prototype, "showQRCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "qrCodeContent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ReceiptTemplate.prototype, "showThankYouMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "thankYouMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'inactive'], default: 'active' }),
    __metadata("design:type", String)
], ReceiptTemplate.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ReceiptTemplate.prototype, "isDefault", void 0);
exports.ReceiptTemplate = ReceiptTemplate = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ReceiptTemplate);
exports.ReceiptTemplateSchema = mongoose_1.SchemaFactory.createForClass(ReceiptTemplate);
exports.ReceiptTemplateSchema.index({ shopId: 1, status: 1 });
exports.ReceiptTemplateSchema.index({ shopId: 1, isDefault: 1 });
exports.ReceiptTemplateSchema.index({ shopId: 1, createdAt: -1 });
//# sourceMappingURL=receipt-template.schema.js.map