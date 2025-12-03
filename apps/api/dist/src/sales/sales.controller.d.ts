import type { Response } from 'express';
import { SalesService } from './sales.service';
import { ReceiptService } from './services/receipt.service';
import { InvoiceService } from './services/invoice.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { CreateReceiptDto } from './dto/receipt.dto';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/invoice.dto';
export declare class SalesController {
    private readonly salesService;
    private readonly receiptService;
    private readonly invoiceService;
    constructor(salesService: SalesService, receiptService: ReceiptService, invoiceService: InvoiceService);
    getStats(user: any): Promise<{
        totalRevenue: number;
        totalOrders: number;
        totalProducts: number;
        totalCustomers: number;
        lowStockProducts: number;
        pendingOrders: number;
        todayRevenue: number;
        todayOrders: number;
    }>;
    getTodaySales(user: any): Promise<{
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
    getCashierStats(user: any): Promise<{
        todaySales: number;
        todayTransactions: number;
        totalSales: number;
        totalTransactions: number;
        averageTransaction: number;
        recentOrders: any[];
    }>;
    getCashierStatsById(cashierId: string, user: any): Promise<{
        todaySales: number;
        todayTransactions: number;
        totalSales: number;
        totalTransactions: number;
        averageTransaction: number;
        recentOrders: any[];
    }>;
    getAllCashierStats(user: any): Promise<{
        userId: string;
        cashierName: string;
        todaySales: number;
        todayTransactions: number;
        totalSales: number;
        totalTransactions: number;
    }[]>;
    checkout(dto: CheckoutDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/order.schema").Order, {}, {}> & import("./schemas/order.schema").Order & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    listOrders(query: OrdersQueryDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/order.schema").Order, {}, {}> & import("./schemas/order.schema").Order & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getOrdersAnalytics(user: any): Promise<{
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
    findOrder(id: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/order.schema").Order, {}, {}> & import("./schemas/order.schema").Order & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    dailySales(dateStr: string, user: any): Promise<{
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
    listOrdersByBranch(branchId: string, query: OrdersQueryDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/order.schema").Order, {}, {}> & import("./schemas/order.schema").Order & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    dailySalesByBranch(branchId: string, dateStr: string, user: any): Promise<{
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
    getSalesAnalytics(range: string | undefined, user: any): Promise<{
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
    createReceipt(dto: CreateReceiptDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getReceipts(from: string, to: string, paymentMethod: string, status: string, limit: string, skip: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getReceiptStats(from: string, to: string, user: any): Promise<any>;
    getReceipt(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getReceiptByOrder(orderId: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getReceiptText(id: string, width: string, user: any): Promise<{
        text: string;
    }>;
    trackReprint(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    voidReceipt(id: string, reason: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/receipt.schema").Receipt, {}, {}> & import("./schemas/receipt.schema").Receipt & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createInvoice(dto: CreateInvoiceDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getInvoices(from: string, to: string, status: string, paymentStatus: string, type: string, limit: string, skip: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getInvoiceStats(from: string, to: string, user: any): Promise<any>;
    getOverdueInvoices(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getInvoice(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getInvoiceHTML(id: string, user: any, res: Response): Promise<void>;
    sendInvoice(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordInvoicePayment(id: string, dto: RecordPaymentDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    cancelInvoice(id: string, reason: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/invoice.schema").Invoice, {}, {}> & import("./schemas/invoice.schema").Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
