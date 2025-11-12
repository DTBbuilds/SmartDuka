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
exports.CustomerSchema = exports.Customer = exports.ContactPreferencesSchema = exports.ContactPreferences = exports.CustomerPreferencesSchema = exports.CustomerPreferences = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let CustomerPreferences = class CustomerPreferences {
    favoriteProducts;
    preferredPaymentMethod;
    notes;
};
exports.CustomerPreferences = CustomerPreferences;
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], CustomerPreferences.prototype, "favoriteProducts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerPreferences.prototype, "preferredPaymentMethod", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerPreferences.prototype, "notes", void 0);
exports.CustomerPreferences = CustomerPreferences = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], CustomerPreferences);
exports.CustomerPreferencesSchema = mongoose_1.SchemaFactory.createForClass(CustomerPreferences);
let ContactPreferences = class ContactPreferences {
    sms;
    email;
};
exports.ContactPreferences = ContactPreferences;
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ContactPreferences.prototype, "sms", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ContactPreferences.prototype, "email", void 0);
exports.ContactPreferences = ContactPreferences = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], ContactPreferences);
exports.ContactPreferencesSchema = mongoose_1.SchemaFactory.createForClass(ContactPreferences);
let Customer = class Customer {
    shopId;
    name;
    phone;
    email;
    address;
    notes;
    totalPurchases;
    totalSpent;
    lastPurchaseDate;
    lastVisit;
    segment;
    preferences;
    contactPreferences;
    status;
};
exports.Customer = Customer;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Customer.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Customer.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Customer.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Customer.prototype, "totalPurchases", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Customer.prototype, "totalSpent", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Customer.prototype, "lastPurchaseDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Customer.prototype, "lastVisit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['vip', 'regular', 'inactive'], default: 'regular' }),
    __metadata("design:type", String)
], Customer.prototype, "segment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.CustomerPreferencesSchema, default: {} }),
    __metadata("design:type", CustomerPreferences)
], Customer.prototype, "preferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.ContactPreferencesSchema, default: {} }),
    __metadata("design:type", ContactPreferences)
], Customer.prototype, "contactPreferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active' }),
    __metadata("design:type", String)
], Customer.prototype, "status", void 0);
exports.Customer = Customer = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Customer);
exports.CustomerSchema = mongoose_1.SchemaFactory.createForClass(Customer);
exports.CustomerSchema.index({ shopId: 1, phone: 1 });
exports.CustomerSchema.index({ shopId: 1, name: 1 });
exports.CustomerSchema.index({ shopId: 1, segment: 1 });
exports.CustomerSchema.index({ shopId: 1, lastPurchaseDate: -1 });
//# sourceMappingURL=customer.schema.js.map