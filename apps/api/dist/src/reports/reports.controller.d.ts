import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDailySalesReport(dateStr: string, user: Record<string, any>): Promise<import("./reports.service").DailySalesReport>;
    getWeeklySalesReport(startDateStr: string, user: Record<string, any>): Promise<import("./reports.service").WeeklySalesReport>;
    getMonthlySalesReport(yearStr: string, monthStr: string, user: Record<string, any>): Promise<import("./reports.service").MonthlySalesReport>;
    getSalesMetrics(daysStr: string | undefined, user: Record<string, any>): Promise<import("./reports.service").SalesMetrics>;
    getTrendAnalysis(daysStr: string | undefined, user: Record<string, any>): Promise<any>;
}
