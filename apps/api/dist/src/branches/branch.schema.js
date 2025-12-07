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
exports.BranchSchema = exports.Branch = exports.BranchContacts = exports.BranchOperations = exports.BranchLocation = exports.BranchPaymentConfig = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
class BranchPaymentConfig {
    enabled;
    useShopConfig;
    paymentConfigId;
    type;
    shortCode;
    accountPrefix;
    consumerKey;
    consumerKeyIv;
    consumerKeyTag;
    consumerSecret;
    consumerSecretIv;
    consumerSecretTag;
    passkey;
    passkeyIv;
    passkeyTag;
    callbackUrl;
    verificationStatus;
    verifiedAt;
}
exports.BranchPaymentConfig = BranchPaymentConfig;
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], BranchPaymentConfig.prototype, "enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], BranchPaymentConfig.prototype, "useShopConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId, ref: 'PaymentConfig' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BranchPaymentConfig.prototype, "paymentConfigId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, enum: ['paybill', 'till'] }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "shortCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "accountPrefix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerKeyIv", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerKeyTag", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerSecret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerSecretIv", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "consumerSecretTag", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "passkey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "passkeyIv", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "passkeyTag", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "callbackUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, enum: ['pending', 'verified', 'failed'] }),
    __metadata("design:type", String)
], BranchPaymentConfig.prototype, "verificationStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], BranchPaymentConfig.prototype, "verifiedAt", void 0);
class BranchLocation {
    county;
    subCounty;
    ward;
    landmark;
    buildingName;
    floor;
    latitude;
    longitude;
    googleMapsUrl;
    deliveryRadius;
}
exports.BranchLocation = BranchLocation;
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "county", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "subCounty", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "ward", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "landmark", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "buildingName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "floor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchLocation.prototype, "latitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchLocation.prototype, "longitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchLocation.prototype, "googleMapsUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchLocation.prototype, "deliveryRadius", void 0);
class BranchOperations {
    operatingHours;
    holidays;
    acceptsWalkIn;
    acceptsDelivery;
    acceptsPickup;
    deliveryFee;
    minimumOrderAmount;
    maxDailyOrders;
    averageServiceTime;
    receiptHeader;
    receiptFooter;
    receiptLogo;
}
exports.BranchOperations = BranchOperations;
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], BranchOperations.prototype, "operatingHours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], BranchOperations.prototype, "holidays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: true }),
    __metadata("design:type", Boolean)
], BranchOperations.prototype, "acceptsWalkIn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], BranchOperations.prototype, "acceptsDelivery", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], BranchOperations.prototype, "acceptsPickup", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchOperations.prototype, "deliveryFee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchOperations.prototype, "minimumOrderAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchOperations.prototype, "maxDailyOrders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], BranchOperations.prototype, "averageServiceTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchOperations.prototype, "receiptHeader", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchOperations.prototype, "receiptFooter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchOperations.prototype, "receiptLogo", void 0);
class BranchContacts {
    primaryPhone;
    secondaryPhone;
    whatsapp;
    email;
    supportEmail;
}
exports.BranchContacts = BranchContacts;
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchContacts.prototype, "primaryPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchContacts.prototype, "secondaryPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchContacts.prototype, "whatsapp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchContacts.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BranchContacts.prototype, "supportEmail", void 0);
let Branch = class Branch {
    shopId;
    name;
    code;
    description;
    address;
    phone;
    email;
    createdBy;
    status;
    inventoryType;
    canTransferStock;
    warehouseId;
    paymentConfig;
    location;
    openingTime;
    closingTime;
    timezone;
    operations;
    contacts;
    managerId;
    staffIds;
    maxStaff;
    targetRevenue;
    costCenter;
    taxExempt;
    metadata;
    createdAt;
    updatedAt;
};
exports.Branch = Branch;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop', index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Branch.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Branch.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Branch.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Branch.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'inactive', 'suspended'], default: 'active', index: true }),
    __metadata("design:type", String)
], Branch.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['shared', 'separate'], default: 'shared' }),
    __metadata("design:type", String)
], Branch.prototype, "inventoryType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: true }),
    __metadata("design:type", Boolean)
], Branch.prototype, "canTransferStock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Branch.prototype, "warehouseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: { enabled: false, useShopConfig: true } }),
    __metadata("design:type", BranchPaymentConfig)
], Branch.prototype, "paymentConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", BranchLocation)
], Branch.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "openingTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "closingTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", BranchOperations)
], Branch.prototype, "operations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", BranchContacts)
], Branch.prototype, "contacts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Branch.prototype, "managerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: mongoose_2.Types.ObjectId, ref: 'User' }], default: [] }),
    __metadata("design:type", Array)
], Branch.prototype, "staffIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], Branch.prototype, "maxStaff", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], Branch.prototype, "targetRevenue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Branch.prototype, "costCenter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], Branch.prototype, "taxExempt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Branch.prototype, "metadata", void 0);
exports.Branch = Branch = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Branch);
exports.BranchSchema = mongoose_1.SchemaFactory.createForClass(Branch);
exports.BranchSchema.index({ shopId: 1 });
exports.BranchSchema.index({ shopId: 1, code: 1 }, { unique: true });
exports.BranchSchema.index({ shopId: 1, status: 1 });
exports.BranchSchema.index({ createdBy: 1 });
exports.BranchSchema.index({ managerId: 1 });
exports.BranchSchema.index({ 'paymentConfig.shortCode': 1 });
exports.BranchSchema.index({ 'location.county': 1 });
exports.BranchSchema.virtual('hasOwnPaymentConfig').get(function () {
    return (this.paymentConfig?.enabled &&
        !this.paymentConfig?.useShopConfig &&
        this.paymentConfig?.shortCode);
});
exports.BranchSchema.virtual('isPaymentConfigured').get(function () {
    if (this.paymentConfig?.useShopConfig)
        return true;
    return !!(this.paymentConfig?.enabled &&
        this.paymentConfig?.shortCode &&
        this.paymentConfig?.consumerKey);
});
exports.BranchSchema.virtual('isOpen').get(function () {
    if (this.status !== 'active')
        return false;
    const now = new Date();
    const day = now.getDay();
    const hours = this.operations?.operatingHours?.[day];
    if (!hours || hours.closed)
        return false;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= hours.open && currentTime <= hours.close;
});
exports.BranchSchema.set('toJSON', { virtuals: true });
exports.BranchSchema.set('toObject', { virtuals: true });
//# sourceMappingURL=branch.schema.js.map