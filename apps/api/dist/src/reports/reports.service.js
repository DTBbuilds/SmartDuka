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
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ReportsService = ReportsService_1 = class ReportsService {
    orderModel;
    logger = new common_1.Logger(ReportsService_1.name);
    constructor(orderModel) {
        this.orderModel = orderModel;
    }
    async getDailySalesReport(shopId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .exec();
        let revenue = 0;
        let itemsSold = 0;
        const productMap = new Map();
        orders.forEach((order) => {
            revenue += order.total || 0;
            order.items?.forEach((item) => {
                itemsSold += item.quantity || 0;
                const key = item.productId?.toString() || 'unknown';
                if (!productMap.has(key)) {
                    productMap.set(key, { name: item.productName || 'Unknown', quantity: 0, revenue: 0 });
                }
                const prod = productMap.get(key);
                if (prod) {
                    prod.quantity += item.quantity || 0;
                    prod.revenue += (item.price || 0) * (item.quantity || 0);
                }
            });
        });
        const topProducts = Array.from(productMap.entries())
            .map(([productId, data]) => ({
            productId,
            productName: data.name,
            quantity: data.quantity,
            revenue: data.revenue,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            date: date.toISOString().split('T')[0],
            revenue,
            orders: orders.length,
            itemsSold,
            averageOrderValue: orders.length > 0 ? revenue / orders.length : 0,
            topProducts,
        };
    }
    async getWeeklySalesReport(shopId, startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        const dailyReports = [];
        let totalRevenue = 0;
        let totalOrders = 0;
        let totalItemsSold = 0;
        const productMap = new Map();
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dailyReport = await this.getDailySalesReport(shopId, date);
            dailyReports.push(dailyReport);
            totalRevenue += dailyReport.revenue;
            totalOrders += dailyReport.orders;
            totalItemsSold += dailyReport.itemsSold;
            dailyReport.topProducts.forEach((prod) => {
                const key = prod.productId;
                if (!productMap.has(key)) {
                    productMap.set(key, { name: prod.productName, quantity: 0, revenue: 0 });
                }
                const p = productMap.get(key);
                if (p) {
                    p.quantity += prod.quantity;
                    p.revenue += prod.revenue;
                }
            });
        }
        const topProducts = Array.from(productMap.entries())
            .map(([productId, data]) => ({
            productId,
            productName: data.name,
            quantity: data.quantity,
            revenue: data.revenue,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const weekNumber = Math.ceil(startDate.getDate() / 7);
        return {
            week: `Week ${weekNumber}`,
            startDate,
            endDate,
            revenue: totalRevenue,
            orders: totalOrders,
            itemsSold: totalItemsSold,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            dailyBreakdown: dailyReports,
            topProducts,
        };
    }
    async getMonthlySalesReport(shopId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startDate, $lte: endDate },
        })
            .exec();
        let totalRevenue = 0;
        let totalItemsSold = 0;
        const productMap = new Map();
        orders.forEach((order) => {
            totalRevenue += order.total || 0;
            order.items?.forEach((item) => {
                totalItemsSold += item.quantity || 0;
                const key = item.productId?.toString() || 'unknown';
                if (!productMap.has(key)) {
                    productMap.set(key, { name: item.productName || 'Unknown', quantity: 0, revenue: 0 });
                }
                const prod = productMap.get(key);
                if (prod) {
                    prod.quantity += item.quantity || 0;
                    prod.revenue += (item.price || 0) * (item.quantity || 0);
                }
            });
        });
        const topProducts = Array.from(productMap.entries())
            .map(([productId, data]) => ({
            productId,
            productName: data.name,
            quantity: data.quantity,
            revenue: data.revenue,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const weeklyReports = [];
        for (let week = 0; week < 5; week++) {
            const weekStart = new Date(year, month - 1, 1 + week * 7);
            if (weekStart <= endDate) {
                const weeklyReport = await this.getWeeklySalesReport(shopId, weekStart);
                weeklyReports.push(weeklyReport);
            }
        }
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        return {
            month: monthNames[month - 1],
            year,
            revenue: totalRevenue,
            orders: orders.length,
            itemsSold: totalItemsSold,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            weeklyBreakdown: weeklyReports,
            topProducts,
        };
    }
    async getSalesMetrics(shopId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startDate },
        })
            .exec();
        let totalRevenue = 0;
        let totalItemsSold = 0;
        orders.forEach((order) => {
            totalRevenue += order.total || 0;
            order.items?.forEach((item) => {
                totalItemsSold += item.quantity || 0;
            });
        });
        return {
            totalRevenue,
            totalOrders: orders.length,
            totalItemsSold,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            averageItemsPerOrder: orders.length > 0 ? totalItemsSold / orders.length : 0,
            conversionRate: 0,
        };
    }
    async getTrendAnalysis(shopId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const orders = await this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startDate },
        })
            .sort({ createdAt: 1 })
            .exec();
        const dailyData = {};
        orders.forEach((order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { revenue: 0, orders: 0 };
            }
            dailyData[date].revenue += order.total || 0;
            dailyData[date].orders += 1;
        });
        return {
            period: `Last ${days} days`,
            startDate,
            endDate: new Date(),
            dailyData: Object.entries(dailyData).map(([date, data]) => ({
                date,
                ...data,
            })),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ReportsService);
//# sourceMappingURL=reports.service.js.map