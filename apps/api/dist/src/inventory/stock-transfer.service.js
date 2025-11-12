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
var StockTransferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockTransferService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
let StockTransferService = StockTransferService_1 = class StockTransferService {
    productModel;
    logger = new common_1.Logger(StockTransferService_1.name);
    constructor(productModel) {
        this.productModel = productModel;
    }
    async requestTransfer(shopId, fromLocationId, toLocationId, productId, quantity, reason, requestedBy, notes) {
        try {
            if (fromLocationId === toLocationId) {
                throw new common_1.BadRequestException('Source and destination locations must be different');
            }
            if (quantity <= 0) {
                throw new common_1.BadRequestException('Quantity must be greater than zero');
            }
            const product = await this.productModel.findById(productId).exec();
            if (!product) {
                throw new common_1.BadRequestException('Product not found');
            }
            if (product.shopId.toString() !== shopId) {
                throw new common_1.BadRequestException('Product does not belong to this shop');
            }
            if ((product.stock ?? 0) < quantity) {
                throw new common_1.BadRequestException('Insufficient stock at source location');
            }
            const transfer = {
                shopId,
                fromLocationId,
                toLocationId,
                productId,
                quantity,
                status: 'pending',
                reason,
                notes,
                requestedBy,
                createdAt: new Date(),
            };
            this.logger.log(`Stock transfer requested: ${productId} from ${fromLocationId} to ${toLocationId}, quantity: ${quantity}`);
            return transfer;
        }
        catch (error) {
            this.logger.error('Stock transfer request failed', error?.message);
            throw error;
        }
    }
    async approveTransfer(transferId, approvedBy) {
        try {
            const transfer = {
                shopId: '',
                fromLocationId: '',
                toLocationId: '',
                productId: '',
                quantity: 0,
                status: 'approved',
                reason: '',
                approvedBy,
                requestedBy: 'Unknown',
                createdAt: new Date(),
            };
            this.logger.log(`Stock transfer approved: ${transferId}`);
            return transfer;
        }
        catch (error) {
            this.logger.error('Stock transfer approval failed', error?.message);
            throw new common_1.BadRequestException('Failed to approve stock transfer');
        }
    }
    async completeTransfer(transferId) {
        try {
            const transfer = {
                shopId: '',
                fromLocationId: '',
                toLocationId: '',
                productId: '',
                quantity: 0,
                status: 'completed',
                reason: '',
                requestedBy: 'Unknown',
                completedAt: new Date(),
                createdAt: new Date(),
            };
            this.logger.log(`Stock transfer completed: ${transferId}`);
            return transfer;
        }
        catch (error) {
            this.logger.error('Stock transfer completion failed', error?.message);
            throw new common_1.BadRequestException('Failed to complete stock transfer');
        }
    }
    async rejectTransfer(transferId, reason) {
        try {
            const transfer = {
                shopId: '',
                fromLocationId: '',
                toLocationId: '',
                productId: '',
                quantity: 0,
                status: 'rejected',
                reason,
                requestedBy: 'Unknown',
                createdAt: new Date(),
            };
            this.logger.log(`Stock transfer rejected: ${transferId}`);
            return transfer;
        }
        catch (error) {
            this.logger.error('Stock transfer rejection failed', error?.message);
            throw new common_1.BadRequestException('Failed to reject stock transfer');
        }
    }
    async getTransferHistory(shopId, locationId, status) {
        try {
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get transfer history', error?.message);
            throw new common_1.BadRequestException('Failed to get transfer history');
        }
    }
    async getTransferStats(shopId) {
        try {
            return {
                totalTransfers: 0,
                pendingTransfers: 0,
                completedTransfers: 0,
                rejectedTransfers: 0,
                totalQuantityTransferred: 0,
            };
        }
        catch (error) {
            this.logger.error('Failed to get transfer stats', error?.message);
            throw new common_1.BadRequestException('Failed to get transfer stats');
        }
    }
};
exports.StockTransferService = StockTransferService;
exports.StockTransferService = StockTransferService = StockTransferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], StockTransferService);
//# sourceMappingURL=stock-transfer.service.js.map