import { Model } from 'mongoose';
export interface DailySalesReport {
    date: string;
    revenue: number;
    orders: number;
    itemsSold: number;
    averageOrderValue: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }>;
}
export interface WeeklySalesReport {
    week: string;
    startDate: Date;
    endDate: Date;
    revenue: number;
    orders: number;
    itemsSold: number;
    averageOrderValue: number;
    dailyBreakdown: DailySalesReport[];
    topProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }>;
}
export interface MonthlySalesReport {
    month: string;
    year: number;
    revenue: number;
    orders: number;
    itemsSold: number;
    averageOrderValue: number;
    weeklyBreakdown: WeeklySalesReport[];
    topProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }>;
}
export interface SalesMetrics {
    totalRevenue: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    averageItemsPerOrder: number;
    conversionRate: number;
}
export declare class ReportsService {
    private readonly orderModel;
    private readonly logger;
    constructor(orderModel: Model<any>);
    getDailySalesReport(shopId: string, date: Date): Promise<DailySalesReport>;
    getWeeklySalesReport(shopId: string, startDate: Date): Promise<WeeklySalesReport>;
    getMonthlySalesReport(shopId: string, year: number, month: number): Promise<MonthlySalesReport>;
    getSalesMetrics(shopId: string, days?: number): Promise<SalesMetrics>;
    getTrendAnalysis(shopId: string, days?: number): Promise<any>;
}
