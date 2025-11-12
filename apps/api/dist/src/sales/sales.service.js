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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nanoid_1 = require("nanoid");
const order_schema_1 = require("./schemas/order.schema");
const inventory_service_1 = require("../inventory/inventory.service");
const activity_service_1 = require("../activity/activity.service");
let SalesService = class SalesService {
    orderModel;
    inventoryService;
    activityService;
    constructor(orderModel, inventoryService, activityService) {
        this.orderModel = orderModel;
        this.inventoryService = inventoryService;
        this.activityService = activityService;
    }
    async checkout(shopId, userId, branchId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Cart must contain at least one item');
        }
        const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        if (subtotal <= 0) {
            throw new common_1.BadRequestException('Subtotal must be greater than zero');
        }
        const stockValidation = await this.validateStockAvailability(shopId, dto.items);
        if (!stockValidation.isValid) {
            throw new common_1.BadRequestException(`Insufficient stock: ${stockValidation.errors.join('; ')}`);
        }
        const taxRate = dto.taxRate ?? 0.16;
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const total = subtotal + tax;
        const paymentsTotal = (dto.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
        const paymentStatus = paymentsTotal >= total ? 'paid' : paymentsTotal > 0 ? 'partial' : 'unpaid';
        const orderNumber = `STK-${new Date().getFullYear()}-${(0, nanoid_1.nanoid)(6).toUpperCase()}`;
        let order;
        try {
            order = new this.orderModel({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                branchId: branchId ? new mongoose_2.Types.ObjectId(branchId) : undefined,
                userId: new mongoose_2.Types.ObjectId(userId),
                orderNumber,
                items: dto.items.map((item) => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.unitPrice * item.quantity,
                })),
                subtotal,
                tax,
                total,
                status: dto.status ?? 'completed',
                paymentStatus,
                payments: dto.payments ?? [],
                notes: dto.notes,
                customerName: dto.customerName,
                cashierId: dto.cashierId,
                cashierName: dto.cashierName,
                isOffline: dto.isOffline ?? false,
            });
            await order.save();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to create order: ${error?.message || 'Unknown error'}`);
        }
        try {
            await this.activityService.logActivity(shopId, userId, dto.cashierName || 'Unknown Cashier', 'cashier', 'checkout', {
                orderNumber: order.orderNumber,
                total: order.total,
                itemCount: order.items.length,
                paymentStatus: order.paymentStatus,
                branchId: branchId,
                orderItems: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.unitPrice,
                })),
            });
        }
        catch (error) {
            console.error(`Failed to log checkout activity for order ${order.orderNumber}:`, error);
        }
        const stockReductionErrors = [];
        for (const item of dto.items) {
            try {
                const updatedProduct = await this.inventoryService.updateStock(shopId, item.productId, -item.quantity);
                if (!updatedProduct) {
                    stockReductionErrors.push(`Product ${item.productId} not found in shop ${shopId}`);
                    continue;
                }
                await this.inventoryService.createStockAdjustment(shopId, item.productId, -item.quantity, 'sale', userId, `Order ${orderNumber} - ${item.name} x${item.quantity}`);
            }
            catch (error) {
                stockReductionErrors.push(`Failed to reduce stock for ${item.name}: ${error?.message || 'Unknown error'}`);
            }
        }
        if (stockReductionErrors.length > 0) {
            console.error(`Stock reduction errors for order ${orderNumber}:`, stockReductionErrors);
            order.notes = (order.notes || '') +
                `\n⚠️ INVENTORY SYNC WARNING: ${stockReductionErrors.join('; ')}`;
            await order.save();
        }
        return order;
    }
    async validateStockAvailability(shopId, items) {
        const errors = [];
        for (const item of items) {
            try {
                const product = await this.inventoryService.getProductById(shopId, item.productId);
                if (!product) {
                    errors.push(`Product "${item.name}" not found`);
                    continue;
                }
                if ((product.stock || 0) < item.quantity) {
                    errors.push(`${item.name}: Only ${product.stock || 0} available, requested ${item.quantity}`);
                }
            }
            catch (error) {
                errors.push(`Error validating ${item.name}: ${error?.message || 'Unknown error'}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    async listOrders(shopId, limit = 50) {
        return this.orderModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 200))
            .exec();
    }
    async listOrdersByBranch(shopId, branchId, limit = 50) {
        return this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
        })
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 200))
            .exec();
    }
    async findOrderById(shopId, id) {
        return this.orderModel.findOne({ _id: id, shopId: new mongoose_2.Types.ObjectId(shopId) }).exec();
    }
    async findByOrderNumber(shopId, orderNumber) {
        return this.orderModel.findOne({ orderNumber, shopId: new mongoose_2.Types.ObjectId(shopId) }).exec();
    }
    async getDailySales(shopId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed',
        })
            .exec();
        let totalRevenue = 0;
        let totalItems = 0;
        const productMap = new Map();
        orders.forEach((order) => {
            totalRevenue += order.total;
            order.items.forEach((item) => {
                totalItems += item.quantity;
                const existing = productMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
                existing.quantity += item.quantity;
                existing.revenue += item.lineTotal;
                productMap.set(item.productId, existing);
            });
        });
        const topProducts = Array.from(productMap.entries())
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            totalRevenue,
            totalOrders: orders.length,
            completedOrders: orders.length,
            totalItems,
            topProducts,
        };
    }
    async getDailySalesByBranch(shopId, branchId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            branchId: new mongoose_2.Types.ObjectId(branchId),
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed',
        })
            .exec();
        let totalRevenue = 0;
        let totalItems = 0;
        const productMap = new Map();
        orders.forEach((order) => {
            totalRevenue += order.total;
            order.items.forEach((item) => {
                totalItems += item.quantity;
                const existing = productMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
                existing.quantity += item.quantity;
                existing.revenue += item.lineTotal;
                productMap.set(item.productId, existing);
            });
        });
        const topProducts = Array.from(productMap.entries())
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            totalRevenue,
            totalOrders: orders.length,
            completedOrders: orders.length,
            totalItems,
            topProducts,
        };
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        inventory_service_1.InventoryService,
        activity_service_1.ActivityService])
], SalesService);
//# sourceMappingURL=sales.service.js.map