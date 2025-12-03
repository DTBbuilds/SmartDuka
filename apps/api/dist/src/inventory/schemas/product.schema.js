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
exports.ProductSchema = exports.Product = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Product = class Product {
    shopId;
    name;
    sku;
    barcode;
    categoryId;
    price;
    cost;
    stock;
    tax;
    status;
    lowStockThreshold;
    description;
    brand;
    image;
    updatedAt;
    expiryDate;
    batchNumber;
    lotNumber;
    reorderPoint;
    reorderQuantity;
    preferredSupplierId;
    leadTimeDays;
    lastRestockDate;
    branchId;
    branchInventory;
};
exports.Product = Product;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Product.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, unique: true, sparse: true, trim: true }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, unique: true, sparse: true, trim: true }),
    __metadata("design:type", String)
], Product.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Category', required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Product.prototype, "categoryId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "cost", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "tax", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'inactive'], default: 'active' }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 10 }),
    __metadata("design:type", Number)
], Product.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Product.prototype, "brand", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Product.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Product.prototype, "expiryDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Product.prototype, "batchNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Product.prototype, "lotNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "reorderPoint", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "reorderQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Product.prototype, "preferredSupplierId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, min: 0, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "leadTimeDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Product.prototype, "lastRestockDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId, ref: 'Branch' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Product.prototype, "branchId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Product.prototype, "branchInventory", void 0);
exports.Product = Product = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Product);
exports.ProductSchema = mongoose_1.SchemaFactory.createForClass(Product);
exports.ProductSchema.index({ shopId: 1, name: 1 });
exports.ProductSchema.index({ shopId: 1, barcode: 1 });
exports.ProductSchema.index({ shopId: 1, sku: 1 });
exports.ProductSchema.index({ shopId: 1, status: 1 });
exports.ProductSchema.index({ shopId: 1, expiryDate: 1 });
exports.ProductSchema.index({ shopId: 1, stock: 1 });
exports.ProductSchema.index({ shopId: 1, branchId: 1 });
exports.ProductSchema.index({ shopId: 1, barcode: 1, status: 1 });
exports.ProductSchema.index({ shopId: 1, sku: 1, status: 1 });
exports.ProductSchema.index({ shopId: 1, brand: 1 });
exports.ProductSchema.index({ shopId: 1, name: 'text', description: 'text', brand: 'text' });
//# sourceMappingURL=product.schema.js.map