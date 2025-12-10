import { Model } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
import { Order } from '../sales/schemas/order.schema';
export declare class ShiftsService {
    private shiftModel;
    private orderModel;
    constructor(shiftModel: Model<ShiftDocument>, orderModel: Model<Order>);
    clockIn(shopId: string, cashierId: string, cashierName: string, openingBalance: number): Promise<Shift>;
    clockOut(shiftId: string, shopId: string): Promise<Shift>;
    getCurrentShift(shopId: string, cashierId: string): Promise<Shift | null>;
    getShiftSalesData(shiftId: string, shopId: string): Promise<{
        totalSales: number;
        transactionCount: number;
        expectedCash: number;
    }>;
    getShiftById(shiftId: string, shopId: string): Promise<Shift | null>;
    reconcileShift(shiftId: string, shopId: string, actualCash: number, reconciliedBy: string, notes?: string): Promise<Shift>;
    getShiftHistory(shopId: string, cashierId?: string, limit?: number): Promise<Shift[]>;
    getShiftsByStatus(shopId: string, status: 'open' | 'closed' | 'reconciled'): Promise<Shift[]>;
    getShiftDuration(shift: Shift): Promise<number>;
    formatDuration(milliseconds: number): Promise<string>;
}
