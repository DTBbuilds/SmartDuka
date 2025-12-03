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
const payment_transaction_service_1 = require("../payments/services/payment-transaction.service");
let SalesService = class SalesService {
    orderModel;
    inventoryService;
    activityService;
    paymentTransactionService;
    constructor(orderModel, inventoryService, activityService, paymentTransactionService) {
        this.orderModel = orderModel;
        this.inventoryService = inventoryService;
        this.activityService = activityService;
        this.paymentTransactionService = paymentTransactionService;
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
                customerPhone: dto.customerPhone,
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
        if (dto.payments && dto.payments.length > 0) {
            for (const payment of dto.payments) {
                try {
                    await this.paymentTransactionService.createTransaction({
                        shopId,
                        orderId: order._id.toString(),
                        orderNumber: order.orderNumber,
                        cashierId: userId,
                        cashierName: dto.cashierName || 'Unknown',
                        branchId: branchId,
                        paymentMethod: payment.method,
                        amount: payment.amount,
                        status: 'completed',
                        customerName: dto.customerName,
                        customerPhone: payment.customerPhone,
                        mpesaReceiptNumber: payment.mpesaReceiptNumber,
                        mpesaTransactionId: payment.mpesaTransactionId,
                        amountTendered: payment.amountTendered,
                        change: payment.change,
                        referenceNumber: payment.reference,
                        notes: payment.notes,
                    });
                }
                catch (error) {
                    console.error(`Failed to record payment transaction for order ${orderNumber}:`, error);
                }
            }
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
    async getShopStats(shopId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const allOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'completed',
        })
            .exec();
        const todayOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'completed',
            createdAt: { $gte: today, $lte: endOfToday },
        })
            .exec();
        const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        let totalProducts = 0;
        let lowStockProducts = 0;
        try {
            const products = await this.inventoryService.listProducts(shopId, { limit: 1000 });
            totalProducts = products.length;
            lowStockProducts = products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold || 5)).length;
        }
        catch (err) {
            console.error('Failed to get product stats:', err);
        }
        const uniqueCustomers = new Set(allOrders
            .filter(o => o.customerName)
            .map(o => o.customerName?.toLowerCase()));
        return {
            totalRevenue,
            totalOrders: allOrders.length,
            totalProducts,
            totalCustomers: uniqueCustomers.size,
            lowStockProducts,
            pendingOrders: 0,
            todayRevenue,
            todayOrders: todayOrders.length,
        };
    }
    async getCashierStats(shopId, userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const todayOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(userId),
            status: 'completed',
            createdAt: { $gte: today, $lte: endOfToday },
        })
            .sort({ createdAt: -1 })
            .exec();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const allOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(userId),
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
        })
            .sort({ createdAt: -1 })
            .exec();
        const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalSales = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const averageTransaction = allOrders.length > 0 ? totalSales / allOrders.length : 0;
        const recentOrders = todayOrders.slice(0, 10).map(order => ({
            id: order._id,
            orderNumber: order.orderNumber,
            total: order.total,
            items: order.items.length,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
        }));
        return {
            todaySales,
            todayTransactions: todayOrders.length,
            totalSales,
            totalTransactions: allOrders.length,
            averageTransaction: Math.round(averageTransaction),
            recentOrders,
        };
    }
    async getAllCashierStats(shopId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const todayOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'completed',
            createdAt: { $gte: today, $lte: endOfToday },
        })
            .exec();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const allOrders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
        })
            .exec();
        const cashierMap = new Map();
        todayOrders.forEach(order => {
            const id = order.userId.toString();
            const existing = cashierMap.get(id) || {
                userId: id,
                cashierName: order.cashierName || 'Unknown',
                todaySales: 0,
                todayTransactions: 0,
                totalSales: 0,
                totalTransactions: 0,
            };
            existing.todaySales += order.total || 0;
            existing.todayTransactions += 1;
            if (order.cashierName)
                existing.cashierName = order.cashierName;
            cashierMap.set(id, existing);
        });
        allOrders.forEach(order => {
            const id = order.userId.toString();
            const existing = cashierMap.get(id) || {
                userId: id,
                cashierName: order.cashierName || 'Unknown',
                todaySales: 0,
                todayTransactions: 0,
                totalSales: 0,
                totalTransactions: 0,
            };
            existing.totalSales += order.total || 0;
            existing.totalTransactions += 1;
            if (order.cashierName)
                existing.cashierName = order.cashierName;
            cashierMap.set(id, existing);
        });
        return Array.from(cashierMap.values()).sort((a, b) => b.todaySales - a.todaySales);
    }
    async getSalesAnalytics(shopId, range = 'month') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [todayOrders, yesterdayOrders, weekOrders, monthOrders, allOrders] = await Promise.all([
            this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'completed',
                createdAt: { $gte: today },
            }).exec(),
            this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'completed',
                createdAt: { $gte: yesterday, $lt: today },
            }).exec(),
            this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'completed',
                createdAt: { $gte: weekAgo },
            }).exec(),
            this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'completed',
                createdAt: { $gte: monthAgo },
            }).exec(),
            this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                status: 'completed',
            }).exec(),
        ]);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const averageOrderValue = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;
        const productSales = new Map();
        monthOrders.forEach(order => {
            (order.items || []).forEach((item) => {
                const key = item.productId?.toString() || item.name;
                const existing = productSales.get(key) || { name: item.name || 'Unknown', quantity: 0, revenue: 0 };
                existing.quantity += item.quantity || 0;
                existing.revenue += (item.unitPrice || 0) * (item.quantity || 0);
                productSales.set(key, existing);
            });
        });
        const topSellingProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        const hourlyBreakdown = Array.from({ length: 12 }, (_, i) => {
            const hour = 8 + i;
            const hourOrders = todayOrders.filter(o => {
                const doc = o;
                const orderHour = doc.createdAt ? new Date(doc.createdAt).getHours() : 0;
                return orderHour === hour;
            });
            return {
                hour,
                revenue: hourOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                orders: hourOrders.length,
            };
        });
        const dailyTrend = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
            const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
            const dayOrders = monthOrders.filter(o => {
                const doc = o;
                if (!doc.createdAt)
                    return false;
                const orderDate = new Date(doc.createdAt);
                return orderDate >= date && orderDate < nextDate;
            });
            return {
                date: date.toISOString().split('T')[0],
                revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                orders: dayOrders.length,
            };
        });
        const paymentMethods = new Map();
        monthOrders.forEach(order => {
            const method = order.payments?.[0]?.method || 'cash';
            const existing = paymentMethods.get(method) || { count: 0, total: 0 };
            existing.count += 1;
            existing.total += order.total || 0;
            paymentMethods.set(method, existing);
        });
        return {
            todayRevenue,
            todayOrders: todayOrders.length,
            yesterdayRevenue,
            yesterdayOrders: yesterdayOrders.length,
            weekRevenue,
            weekOrders: weekOrders.length,
            monthRevenue,
            monthOrders: monthOrders.length,
            totalRevenue,
            totalOrders: allOrders.length,
            averageOrderValue,
            topSellingProducts,
            hourlyBreakdown,
            dailyTrend,
            paymentMethods: Array.from(paymentMethods.entries()).map(([method, data]) => ({
                method: method.charAt(0).toUpperCase() + method.slice(1),
                count: data.count,
                total: data.total,
            })),
        };
    }
    async getOrdersAnalytics(shopId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required for analytics');
        }
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            const monthOrders = await this.orderModel.find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                createdAt: { $gte: monthAgo },
            }).sort({ createdAt: -1 }).exec();
            const todayOrders = monthOrders.filter(o => {
                const doc = o;
                return doc.createdAt && new Date(doc.createdAt) >= today;
            });
            const weekOrders = monthOrders.filter(o => {
                const doc = o;
                return doc.createdAt && new Date(doc.createdAt) >= weekAgo;
            });
            const completedOrders = monthOrders.filter(o => o.status === 'completed');
            const pendingOrders = monthOrders.filter(o => o.status === 'pending');
            const voidedOrders = monthOrders.filter(o => o.status === 'void');
            const refundedOrders = monthOrders.filter(o => o.transactionType === 'refund');
            const todayRevenue = todayOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
            const weekRevenue = weekOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
            const monthRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const completionRate = monthOrders.length > 0
                ? Math.round((completedOrders.length / monthOrders.length) * 1000) / 10
                : 100;
            const averageOrderValue = completedOrders.length > 0
                ? Math.round(monthRevenue / completedOrders.length)
                : 0;
            const totalItems = completedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
            const averageItemsPerOrder = completedOrders.length > 0
                ? Math.round((totalItems / completedOrders.length) * 10) / 10
                : 0;
            const hourCounts = new Map();
            todayOrders.forEach(o => {
                const doc = o;
                const hour = doc.createdAt ? new Date(doc.createdAt).getHours() : 12;
                hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
            });
            let peakHour = 12;
            let maxCount = 0;
            hourCounts.forEach((count, hour) => {
                if (count > maxCount) {
                    maxCount = count;
                    peakHour = hour;
                }
            });
            const ordersByDay = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                const dayOrders = weekOrders.filter(o => {
                    const doc = o;
                    if (!doc.createdAt)
                        return false;
                    const orderDate = new Date(doc.createdAt);
                    return orderDate >= date && orderDate < nextDate;
                });
                const dayCompleted = dayOrders.filter(o => o.status === 'completed');
                return {
                    date: date.toISOString().split('T')[0],
                    count: dayOrders.length,
                    revenue: dayCompleted.reduce((sum, o) => sum + (o.total || 0), 0),
                };
            });
            const recentOrders = monthOrders.slice(0, 10).map(o => {
                const doc = o;
                return {
                    _id: o._id.toString(),
                    orderNumber: o.orderNumber,
                    total: o.total || 0,
                    status: o.status,
                    paymentMethod: o.payments?.[0]?.method || 'cash',
                    itemCount: o.items?.length || 0,
                    customerName: o.customerName,
                    createdAt: doc.createdAt,
                    cashierName: o.cashierName || 'Unknown',
                };
            });
            return {
                todayOrders: todayOrders.length,
                todayRevenue,
                weekOrders: weekOrders.length,
                weekRevenue,
                monthOrders: monthOrders.length,
                monthRevenue,
                averageOrderValue,
                completionRate,
                averageItemsPerOrder,
                peakHour,
                statusBreakdown: [
                    { status: 'completed', count: completedOrders.length },
                    { status: 'pending', count: pendingOrders.length },
                    { status: 'voided', count: voidedOrders.length },
                    { status: 'refunded', count: refundedOrders.length },
                ],
                recentOrders,
                ordersByDay,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to load orders analytics: ${error.message}`);
        }
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        inventory_service_1.InventoryService,
        activity_service_1.ActivityService,
        payment_transaction_service_1.PaymentTransactionService])
], SalesService);
//# sourceMappingURL=sales.service.js.map