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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BarcodeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
let BarcodeService = BarcodeService_1 = class BarcodeService {
    productModel;
    logger = new common_1.Logger(BarcodeService_1.name);
    constructor(productModel) {
        this.productModel = productModel;
    }
    validateBarcode(barcode) {
        try {
            const cleanBarcode = barcode.replace(/[\s-]/g, '');
            let format = 'unknown';
            let isValid = false;
            if (cleanBarcode.length === 13 && /^\d+$/.test(cleanBarcode)) {
                format = 'ean13';
                isValid = this.validateEAN13(cleanBarcode);
            }
            else if (cleanBarcode.length === 8 && /^\d+$/.test(cleanBarcode)) {
                format = 'ean8';
                isValid = this.validateEAN8(cleanBarcode);
            }
            else if (/^\d+$/.test(cleanBarcode)) {
                format = 'code128';
                isValid = cleanBarcode.length >= 4 && cleanBarcode.length <= 20;
            }
            else if (cleanBarcode.startsWith('http') || cleanBarcode.includes('://')) {
                format = 'qr';
                isValid = true;
            }
            return {
                barcode: cleanBarcode,
                format,
                isValid,
            };
        }
        catch (error) {
            this.logger.error('Barcode validation failed', error?.message);
            return {
                barcode,
                format: 'unknown',
                isValid: false,
            };
        }
    }
    async scanBarcode(barcode, shopId) {
        try {
            const validation = this.validateBarcode(barcode);
            if (!validation.isValid) {
                throw new common_1.BadRequestException('Invalid barcode format');
            }
            const product = await this.productModel
                .findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                barcode: validation.barcode,
                status: 'active',
            })
                .exec();
            if (!product) {
                throw new common_1.BadRequestException('Product not found for barcode: ' + validation.barcode);
            }
            this.logger.log(`Barcode scanned: ${validation.barcode} -> ${product.name}`);
            return product;
        }
        catch (error) {
            this.logger.error('Barcode scan failed', error?.message);
            throw error;
        }
    }
    async generateBarcode(productId, shopId) {
        try {
            const product = await this.productModel.findById(productId).exec();
            if (!product) {
                throw new common_1.BadRequestException('Product not found');
            }
            if (product.shopId.toString() !== shopId) {
                throw new common_1.BadRequestException('Product does not belong to this shop');
            }
            if (product.barcode) {
                return product.barcode;
            }
            const barcode = this.generateEAN13();
            const existing = await this.productModel
                .findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                barcode,
            })
                .exec();
            if (existing) {
                return this.generateBarcode(productId, shopId);
            }
            product.barcode = barcode;
            await product.save();
            this.logger.log(`Barcode generated for product ${productId}: ${barcode}`);
            return barcode;
        }
        catch (error) {
            this.logger.error('Barcode generation failed', error?.message);
            throw error;
        }
    }
    async bulkImportBarcodes(shopId, barcodes) {
        try {
            let successful = 0;
            let failed = 0;
            const errors = [];
            for (const item of barcodes) {
                try {
                    const validation = this.validateBarcode(item.barcode);
                    if (!validation.isValid) {
                        failed++;
                        errors.push({
                            barcode: item.barcode,
                            error: 'Invalid barcode format',
                        });
                        continue;
                    }
                    const product = await this.productModel.findById(item.productId).exec();
                    if (!product) {
                        failed++;
                        errors.push({
                            barcode: item.barcode,
                            error: 'Product not found',
                        });
                        continue;
                    }
                    if (product.shopId.toString() !== shopId) {
                        failed++;
                        errors.push({
                            barcode: item.barcode,
                            error: 'Product does not belong to this shop',
                        });
                        continue;
                    }
                    const existing = await this.productModel
                        .findOne({
                        shopId: new mongoose_2.Types.ObjectId(shopId),
                        barcode: validation.barcode,
                        _id: { $ne: item.productId },
                    })
                        .exec();
                    if (existing) {
                        failed++;
                        errors.push({
                            barcode: item.barcode,
                            error: 'Barcode already assigned to another product',
                        });
                        continue;
                    }
                    product.barcode = validation.barcode;
                    await product.save();
                    successful++;
                }
                catch (error) {
                    failed++;
                    errors.push({
                        barcode: item.barcode,
                        error: error?.message || 'Unknown error',
                    });
                }
            }
            this.logger.log(`Bulk barcode import: ${successful} successful, ${failed} failed`);
            return { successful, failed, errors };
        }
        catch (error) {
            this.logger.error('Bulk barcode import failed', error?.message);
            throw new common_1.BadRequestException('Bulk barcode import failed');
        }
    }
    validateEAN13(barcode) {
        if (barcode.length !== 13)
            return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i], 10);
            sum += digit * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(barcode[12], 10);
    }
    validateEAN8(barcode) {
        if (barcode.length !== 8)
            return false;
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            const digit = parseInt(barcode[i], 10);
            sum += digit * (i % 2 === 0 ? 3 : 1);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(barcode[7], 10);
    }
    generateEAN13() {
        let barcode = '';
        for (let i = 0; i < 12; i++) {
            barcode += Math.floor(Math.random() * 10);
        }
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i], 10);
            sum += digit * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        barcode += checkDigit;
        return barcode;
    }
};
exports.BarcodeService = BarcodeService;
exports.BarcodeService = BarcodeService = BarcodeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BarcodeService);
//# sourceMappingURL=barcode.service.js.map