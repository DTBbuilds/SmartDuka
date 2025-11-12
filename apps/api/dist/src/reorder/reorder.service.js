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
var ReorderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReorderService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("../inventory/schemas/product.schema");
const purchase_schema_1 = require("../purchases/purchase.schema");
const nanoid_1 = require("nanoid");
let ReorderService = ReorderService_1 = class ReorderService {
    productModel;
    purchaseModel;
    logger = new common_1.Logger(ReorderService_1.name);
    constructor(productModel, purchaseModel) {
        this.productModel = productModel;
        this.purchaseModel = purchaseModel;
    }
    async checkAndCreatePOs(shopId, userId) {
        const errors = [];
        let created = 0;
        let skipped = 0;
        try {
            const productsToReorder = await this.productModel
                .find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'active',
                reorderPoint: { $gt: 0 },
                $expr: { $lte: ['$stock', '$reorderPoint'] },
            })
                .exec();
            this.logger.log(`Found ${productsToReorder.length} products below reorder point for shop ${shopId}`);
            for (const product of productsToReorder) {
                try {
                    const existingPO = await this.purchaseModel.findOne({
                        shopId: new mongoose_2.Types.ObjectId(shopId),
                        'items.productId': product._id,
                        status: { $in: ['pending', 'received'] },
                    });
                    if (existingPO) {
                        this.logger.log(`Skipping ${product.name}: PO already exists (${existingPO.purchaseNumber})`);
                        skipped++;
                        continue;
                    }
                    if (!product.preferredSupplierId) {
                        errors.push(`${product.name}: No preferred supplier set. Cannot auto-create PO.`);
                        skipped++;
                        continue;
                    }
                    const purchaseNumber = `AUTO-${Date.now()}-${(0, nanoid_1.nanoid)(6)}`;
                    const reorderQty = product.reorderQuantity || 50;
                    const unitCost = product.cost || 0;
                    const totalCost = reorderQty * unitCost;
                    const po = new this.purchaseModel({
                        purchaseNumber,
                        supplierId: product.preferredSupplierId,
                        shopId: new mongoose_2.Types.ObjectId(shopId),
                        items: [
                            {
                                productId: product._id,
                                productName: product.name,
                                quantity: reorderQty,
                                unitCost,
                                totalCost,
                            },
                        ],
                        totalCost,
                        status: 'pending',
                        expectedDeliveryDate: this.calculateExpectedDelivery(product.leadTimeDays || 3),
                        notes: `Auto-generated reorder: Stock ${product.stock} <= Reorder Point ${product.reorderPoint}`,
                        createdBy: new mongoose_2.Types.ObjectId(userId),
                    });
                    await po.save();
                    created++;
                    this.logger.log(`Auto-created PO ${purchaseNumber} for ${product.name}: ${reorderQty} units`);
                }
                catch (error) {
                    const errorMsg = `Failed to create PO for ${product.name}: ${error?.message || 'Unknown error'}`;
                    errors.push(errorMsg);
                    this.logger.error(errorMsg, error);
                }
            }
        }
        catch (error) {
            const errorMsg = `Reorder check failed for shop ${shopId}: ${error?.message || 'Unknown error'}`;
            this.logger.error(errorMsg, error);
            errors.push(errorMsg);
        }
        return { created, errors, skipped };
    }
    async getLowStockProducts(shopId) {
        return this.productModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
            reorderPoint: { $gt: 0 },
            $expr: { $lte: ['$stock', '$reorderPoint'] },
        })
            .sort({ stock: 1 })
            .exec();
    }
    async getReorderStatus(shopId, productId) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            return null;
        }
        const needsReorder = (product.stock || 0) <= (product.reorderPoint || 0);
        const dailyUsage = await this.estimateDailyUsage(shopId, productId);
        const daysUntilStockout = dailyUsage > 0
            ? Math.ceil((product.stock || 0) / dailyUsage)
            : 999;
        return {
            productId: product._id.toString(),
            name: product.name,
            currentStock: product.stock || 0,
            reorderPoint: product.reorderPoint || 0,
            reorderQuantity: product.reorderQuantity || 50,
            needsReorder,
            daysUntilStockout,
        };
    }
    async updateReorderSettings(shopId, productId, settings) {
        const updateData = {};
        if (settings.reorderPoint !== undefined) {
            updateData.reorderPoint = Math.max(0, settings.reorderPoint);
        }
        if (settings.reorderQuantity !== undefined) {
            updateData.reorderQuantity = Math.max(0, settings.reorderQuantity);
        }
        if (settings.preferredSupplierId !== undefined) {
            updateData.preferredSupplierId = new mongoose_2.Types.ObjectId(settings.preferredSupplierId);
        }
        if (settings.leadTimeDays !== undefined) {
            updateData.leadTimeDays = Math.max(0, settings.leadTimeDays);
        }
        return this.productModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, updateData, { new: true })
            .exec();
    }
    async getReorderStats(shopId) {
        const products = await this.productModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        })
            .exec();
        const productsWithReorderPoint = products.filter((p) => (p.reorderPoint || 0) > 0);
        const productsNeedingReorder = productsWithReorderPoint.filter((p) => (p.stock || 0) <= (p.reorderPoint || 0));
        const avgReorderPoint = productsWithReorderPoint.length > 0
            ? productsWithReorderPoint.reduce((sum, p) => sum + (p.reorderPoint || 0), 0) / productsWithReorderPoint.length
            : 0;
        const avgReorderQuantity = productsWithReorderPoint.length > 0
            ? productsWithReorderPoint.reduce((sum, p) => sum + (p.reorderQuantity || 0), 0) / productsWithReorderPoint.length
            : 0;
        return {
            totalProducts: products.length,
            productsWithReorderPoint: productsWithReorderPoint.length,
            productsNeedingReorder: productsNeedingReorder.length,
            averageReorderPoint: Math.round(avgReorderPoint * 100) / 100,
            averageReorderQuantity: Math.round(avgReorderQuantity * 100) / 100,
        };
    }
    async estimateDailyUsage(shopId, productId) {
        return 0;
    }
    calculateExpectedDelivery(leadTimeDays) {
        const date = new Date();
        date.setDate(date.getDate() + leadTimeDays);
        return date;
    }
};
exports.ReorderService = ReorderService;
exports.ReorderService = ReorderService = ReorderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, mongoose_1.InjectModel)(purchase_schema_1.Purchase.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ReorderService);
//# sourceMappingURL=reorder.service.js.map