import { Model } from 'mongoose';
import { OrderDocument } from './schemas/order.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { PaymentTransactionService } from '../payments/services/payment-transaction.service';
export declare class SalesService {
    private readonly orderModel;
    private readonly inventoryService;
    private readonly activityService;
    private readonly paymentTransactionService;
    constructor(orderModel: Model<OrderDocument>, inventoryService: InventoryService, activityService: ActivityService, paymentTransactionService: PaymentTransactionService);
    checkout(shopId: string, userId: string, branchId: string, dto: CheckoutDto): Promise<OrderDocument>;
    private validateStockAvailability;
    listOrders(shopId: string, limit?: number): Promise<OrderDocument[]>;
    listOrdersByBranch(shopId: string, branchId: string, limit?: number): Promise<OrderDocument[]>;
    findOrderById(shopId: string, id: string): Promise<OrderDocument | null>;
    findByOrderNumber(shopId: string, orderNumber: string): Promise<OrderDocument | null>;
    getDailySales(shopId: string, date: Date): Promise<{
        totalRevenue: number;
        totalOrders: number;
        completedOrders: number;
        totalItems: number;
        topProducts: Array<{
            productId: string;
            name: string;
            quantity: number;
            revenue: number;
        }>;
    }>;
    getDailySalesByBranch(shopId: string, branchId: string, date: Date): Promise<{
        totalRevenue: number;
        totalOrders: number;
        completedOrders: number;
        totalItems: number;
        topProducts: Array<{
            productId: string;
            name: string;
            quantity: number;
            revenue: number;
        }>;
    }>;
    getShopStats(shopId: string): Promise<{
        totalRevenue: number;
        totalOrders: number;
        totalProducts: number;
        totalCustomers: number;
        lowStockProducts: number;
        pendingOrders: number;
        todayRevenue: number;
        todayOrders: number;
    }>;
    getCashierStats(shopId: string, userId: string): Promise<{
        todaySales: number;
        todayTransactions: number;
        totalSales: number;
        totalTransactions: number;
        averageTransaction: number;
        recentOrders: any[];
    }>;
    getAllCashierStats(shopId: string): Promise<Array<{
        userId: string;
        cashierName: string;
        todaySales: number;
        todayTransactions: number;
        totalSales: number;
        totalTransactions: number;
    }>>;
    getSalesAnalytics(shopId: string, range?: string): Promise<{
        todayRevenue: number;
        todayOrders: number;
        yesterdayRevenue: number;
        yesterdayOrders: number;
        weekRevenue: number;
        weekOrders: number;
        monthRevenue: number;
        monthOrders: number;
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        topSellingProducts: {
            name: string;
            quantity: number;
            revenue: number;
        }[];
        hourlyBreakdown: {
            hour: number;
            revenue: number;
            orders: number;
        }[];
        dailyTrend: {
            date: string;
            revenue: number;
            orders: number;
        }[];
        paymentMethods: {
            method: string;
            count: number;
            total: number;
        }[];
    }>;
    getOrdersAnalytics(shopId: string): Promise<{
        todayOrders: number;
        todayRevenue: number;
        weekOrders: number;
        weekRevenue: number;
        monthOrders: number;
        monthRevenue: number;
        averageOrderValue: number;
        completionRate: number;
        averageItemsPerOrder: number;
        peakHour: number;
        statusBreakdown: {
            status: string;
            count: number;
        }[];
        recentOrders: {
            _id: string;
            orderNumber: string;
            total: number;
            status: "pending" | "completed" | "void";
            paymentMethod: string;
            itemCount: number;
            customerName: string | undefined;
            createdAt: any;
            cashierName: string;
        }[];
        ordersByDay: {
            date: string;
            count: number;
            revenue: number;
        }[];
    }>;
}
