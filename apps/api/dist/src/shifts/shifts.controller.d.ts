import { ShiftsService } from './shifts.service';
export declare class ShiftsController {
    private readonly shiftsService;
    constructor(shiftsService: ShiftsService);
    clockIn(body: {
        shopId: string;
        openingBalance: number;
    }, user: any): Promise<import("./schemas/shift.schema").Shift>;
    clockOut(body: {
        shiftId: string;
    }, user: any): Promise<import("./schemas/shift.schema").Shift>;
    getCurrentShift(user: any): Promise<import("./schemas/shift.schema").Shift | null>;
    getShift(shiftId: string, user: any): Promise<import("./schemas/shift.schema").Shift | null>;
    reconcileShift(shiftId: string, body: {
        actualCash: number;
        notes?: string;
    }, user: any): Promise<import("./schemas/shift.schema").Shift>;
    getShiftHistory(user: any, limit?: string, cashierId?: string): Promise<import("./schemas/shift.schema").Shift[]>;
    getShiftSales(shiftId: string, user: any): Promise<{
        totalSales: number;
        transactionCount: number;
        expectedCash: number;
    }>;
    getShiftsByStatus(status: 'open' | 'closed' | 'reconciled', user: any): Promise<import("./schemas/shift.schema").Shift[]>;
}
