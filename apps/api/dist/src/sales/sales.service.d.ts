import { Model } from 'mongoose';
import { OrderDocument } from './schemas/order.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
export declare class SalesService {
    private readonly orderModel;
    private readonly inventoryService;
    private readonly activityService;
    constructor(orderModel: Model<OrderDocument>, inventoryService: InventoryService, activityService: ActivityService);
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
}
