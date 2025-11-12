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
var PurchasesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const purchase_schema_1 = require("./purchase.schema");
const nanoid_1 = require("nanoid");
const inventory_service_1 = require("../inventory/inventory.service");
let PurchasesService = PurchasesService_1 = class PurchasesService {
    purchaseModel;
    inventoryService;
    logger = new common_1.Logger(PurchasesService_1.name);
    constructor(purchaseModel, inventoryService) {
        this.purchaseModel = purchaseModel;
        this.inventoryService = inventoryService;
    }
    async create(shopId, userId, dto) {
        const items = dto.items.map((item) => ({
            productId: new mongoose_2.Types.ObjectId(item.productId),
            productName: item.productName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
        }));
        const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
        const purchaseNumber = `PO-${Date.now()}-${(0, nanoid_1.nanoid)(6)}`;
        const purchase = new this.purchaseModel({
            purchaseNumber,
            supplierId: new mongoose_2.Types.ObjectId(dto.supplierId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: dto.branchId ? new mongoose_2.Types.ObjectId(dto.branchId) : undefined,
            items,
            totalCost,
            status: 'pending',
            expectedDeliveryDate: dto.expectedDeliveryDate,
            invoiceNumber: dto.invoiceNumber,
            notes: dto.notes,
            createdBy: new mongoose_2.Types.ObjectId(userId),
        });
        return purchase.save();
    }
    async findAll(shopId) {
        return this.purchaseModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .populate('supplierId', 'name phone email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async findById(purchaseId, shopId) {
        return this.purchaseModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(purchaseId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .populate('supplierId', 'name phone email address')
            .exec();
    }
    async update(purchaseId, shopId, dto, userId) {
        const currentPurchase = await this.purchaseModel.findOne({
            _id: new mongoose_2.Types.ObjectId(purchaseId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!currentPurchase) {
            throw new common_1.BadRequestException('Purchase order not found');
        }
        if (dto.status === 'received' && currentPurchase.status !== 'received') {
            const stockIncreaseErrors = [];
            for (const item of currentPurchase.items) {
                try {
                    let updatedProduct;
                    if (currentPurchase.branchId) {
                        updatedProduct = await this.inventoryService.updateBranchStock(shopId, item.productId.toString(), currentPurchase.branchId.toString(), item.quantity);
                    }
                    else {
                        updatedProduct = await this.inventoryService.updateStock(shopId, item.productId.toString(), item.quantity);
                    }
                    if (!updatedProduct) {
                        stockIncreaseErrors.push(`Product ${item.productId} not found in shop ${shopId}`);
                        continue;
                    }
                    await this.inventoryService.createStockAdjustment(shopId, item.productId.toString(), item.quantity, 'purchase_received', userId || 'system', `Purchase Order ${currentPurchase.purchaseNumber} - ${item.productName} x${item.quantity}`);
                    this.logger.log(`Stock increased for ${item.productName}: +${item.quantity} (PO: ${currentPurchase.purchaseNumber})`);
                }
                catch (error) {
                    stockIncreaseErrors.push(`Failed to increase stock for ${item.productName}: ${error?.message || 'Unknown error'}`);
                    this.logger.error(`Stock increase error for ${item.productName}:`, error);
                }
            }
            if (stockIncreaseErrors.length > 0) {
                this.logger.error(`Stock increase errors for PO ${currentPurchase.purchaseNumber}:`, stockIncreaseErrors);
                dto.notes = (dto.notes || '') +
                    `\n⚠️ INVENTORY SYNC WARNING: ${stockIncreaseErrors.join('; ')}`;
            }
        }
        const updated = await this.purchaseModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(purchaseId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, { ...dto, updatedAt: new Date() }, { new: true })
            .populate('supplierId', 'name phone email')
            .exec();
        return updated;
    }
    async delete(purchaseId, shopId) {
        const result = await this.purchaseModel
            .deleteOne({
            _id: new mongoose_2.Types.ObjectId(purchaseId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
        return result.deletedCount > 0;
    }
    async getPending(shopId) {
        return this.purchaseModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'pending',
        })
            .populate('supplierId', 'name phone')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getBySupplier(supplierId, shopId) {
        return this.purchaseModel
            .find({
            supplierId: new mongoose_2.Types.ObjectId(supplierId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findByBranch(shopId, branchId) {
        return this.purchaseModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
        })
            .populate('supplierId', 'name phone email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getPendingByBranch(shopId, branchId) {
        return this.purchaseModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            status: 'pending',
        })
            .populate('supplierId', 'name phone')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getReceivedByBranch(shopId, branchId) {
        return this.purchaseModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            status: 'received',
        })
            .populate('supplierId', 'name phone')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getBranchStats(shopId, branchId) {
        const purchases = await this.purchaseModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
        })
            .exec();
        const pending = purchases.filter(p => p.status === 'pending').length;
        const received = purchases.filter(p => p.status === 'received').length;
        const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0);
        return {
            totalPurchases: purchases.length,
            pendingPurchases: pending,
            receivedPurchases: received,
            totalSpent,
        };
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = PurchasesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(purchase_schema_1.Purchase.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        inventory_service_1.InventoryService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map