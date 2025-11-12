import { Model } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
export declare class ShiftsService {
    private shiftModel;
    constructor(shiftModel: Model<ShiftDocument>);
    clockIn(shopId: string, cashierId: string, cashierName: string, openingBalance: number): Promise<Shift>;
    clockOut(shiftId: string, shopId: string): Promise<Shift>;
    getCurrentShift(shopId: string, cashierId: string): Promise<Shift | null>;
    getShiftById(shiftId: string, shopId: string): Promise<Shift | null>;
    reconcileShift(shiftId: string, shopId: string, actualCash: number, reconciliedBy: string, notes?: string): Promise<Shift>;
    getShiftHistory(shopId: string, cashierId?: string, limit?: number): Promise<Shift[]>;
    getShiftsByStatus(shopId: string, status: 'open' | 'closed' | 'reconciled'): Promise<Shift[]>;
    getShiftDuration(shift: Shift): Promise<number>;
    formatDuration(milliseconds: number): Promise<string>;
}
