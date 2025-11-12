import { SalesService } from './sales.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
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
}
