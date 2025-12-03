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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const sales_service_1 = require("./sales.service");
const receipt_service_1 = require("./services/receipt.service");
const invoice_service_1 = require("./services/invoice.service");
const checkout_dto_1 = require("./dto/checkout.dto");
const orders_query_dto_1 = require("./dto/orders-query.dto");
const receipt_dto_1 = require("./dto/receipt.dto");
const invoice_dto_1 = require("./dto/invoice.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SalesController = class SalesController {
    salesService;
    receiptService;
    invoiceService;
    constructor(salesService, receiptService, invoiceService) {
        this.salesService = salesService;
        this.receiptService = receiptService;
        this.invoiceService = invoiceService;
    }
    async getStats(user) {
        return this.salesService.getShopStats(user.shopId);
    }
    async getTodaySales(user) {
        return this.salesService.getDailySales(user.shopId, new Date());
    }
    async getCashierStats(user) {
        return this.salesService.getCashierStats(user.shopId, user.sub);
    }
    async getCashierStatsById(cashierId, user) {
        return this.salesService.getCashierStats(user.shopId, cashierId);
    }
    async getAllCashierStats(user) {
        return this.salesService.getAllCashierStats(user.shopId);
    }
    checkout(dto, user) {
        return this.salesService.checkout(user.shopId, user.sub, user.branchId, dto);
    }
    listOrders(query, user) {
        return this.salesService.listOrders(user.shopId, query.limit);
    }
    async getOrdersAnalytics(user) {
        if (!user?.shopId) {
            console.error('[OrdersAnalytics] No shopId in user token:', user);
            throw new common_1.BadRequestException('Shop ID not found in authentication token. Please log in again.');
        }
        return this.salesService.getOrdersAnalytics(user.shopId);
    }
    findOrder(id, user) {
        return this.salesService.findOrderById(user.shopId, id);
    }
    dailySales(dateStr, user) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        return this.salesService.getDailySales(user.shopId, date);
    }
    listOrdersByBranch(branchId, query, user) {
        return this.salesService.listOrdersByBranch(user.shopId, branchId, query.limit);
    }
    dailySalesByBranch(branchId, dateStr, user) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        return this.salesService.getDailySalesByBranch(user.shopId, branchId, date);
    }
    async getSalesAnalytics(range = 'month', user) {
        return this.salesService.getSalesAnalytics(user.shopId, range);
    }
    async createReceipt(dto, user) {
        return this.receiptService.createFromOrder(user.shopId, user.branchId, dto);
    }
    async getReceipts(from, to, paymentMethod, status, limit, skip, user) {
        return this.receiptService.getReceipts(user.shopId, {
            from,
            to,
            paymentMethod,
            status,
            limit: limit ? parseInt(limit) : undefined,
            skip: skip ? parseInt(skip) : undefined,
        });
    }
    async getReceiptStats(from, to, user) {
        return this.receiptService.getStats(user.shopId, from, to);
    }
    async getReceipt(id, user) {
        return this.receiptService.getById(user.shopId, id);
    }
    async getReceiptByOrder(orderId, user) {
        return this.receiptService.getByOrderId(user.shopId, orderId);
    }
    async getReceiptText(id, width, user) {
        const receipt = await this.receiptService.getById(user.shopId, id);
        const w = width === '42' ? 42 : 32;
        return { text: this.receiptService.generateReceiptText(receipt, w) };
    }
    async trackReprint(id, user) {
        return this.receiptService.trackReprint(user.shopId, id);
    }
    async voidReceipt(id, reason, user) {
        return this.receiptService.voidReceipt(user.shopId, id, user.sub, reason);
    }
    async createInvoice(dto, user) {
        if (dto.orderId) {
            return this.invoiceService.createFromOrder(user.shopId, user.branchId, dto);
        }
        return this.invoiceService.create(user.shopId, user.branchId, user.sub, dto);
    }
    async getInvoices(from, to, status, paymentStatus, type, limit, skip, user) {
        return this.invoiceService.getInvoices(user.shopId, {
            from,
            to,
            status,
            paymentStatus,
            type,
            limit: limit ? parseInt(limit) : undefined,
            skip: skip ? parseInt(skip) : undefined,
        });
    }
    async getInvoiceStats(from, to, user) {
        return this.invoiceService.getStats(user.shopId, from, to);
    }
    async getOverdueInvoices(user) {
        return this.invoiceService.getOverdueInvoices(user.shopId);
    }
    async getInvoice(id, user) {
        return this.invoiceService.getById(user.shopId, id);
    }
    async getInvoiceHTML(id, user, res) {
        const invoice = await this.invoiceService.getById(user.shopId, id);
        const html = this.invoiceService.generateInvoiceHTML(invoice);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }
    async sendInvoice(id, user) {
        return this.invoiceService.sendInvoice(user.shopId, id);
    }
    async recordInvoicePayment(id, dto, user) {
        return this.invoiceService.recordPayment(user.shopId, id, dto);
    }
    async cancelInvoice(id, reason, user) {
        return this.invoiceService.cancelInvoice(user.shopId, id, reason);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('today'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getTodaySales", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('cashier-stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getCashierStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('cashier-stats/:cashierId'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getCashierStatsById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('all-cashier-stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getAllCashierStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('checkout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [checkout_dto_1.CheckoutDto, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "checkout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [orders_query_dto_1.OrdersQueryDto, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "listOrders", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('orders/analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getOrdersAnalytics", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findOrder", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('daily-sales/:date'),
    __param(0, (0, common_1.Param)('date')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "dailySales", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('branch/:branchId/orders'),
    __param(0, (0, common_1.Param)('branchId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, orders_query_dto_1.OrdersQueryDto, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "listOrdersByBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('branch/:branchId/daily-sales/:date'),
    __param(0, (0, common_1.Param)('branchId')),
    __param(1, (0, common_1.Param)('date')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "dailySalesByBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Query)('range')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getSalesAnalytics", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('receipts'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receipt_dto_1.CreateReceiptDto, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createReceipt", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('receipts'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('paymentMethod')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('skip')),
    __param(6, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceipts", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('receipts/stats'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceiptStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('receipts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceipt", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('receipts/order/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceiptByOrder", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('receipts/:id/text'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('width')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceiptText", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('receipts/:id/reprint'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "trackReprint", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('receipts/:id/void'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "voidReceipt", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('invoices'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invoice_dto_1.CreateInvoiceDto, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('invoices'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('paymentStatus')),
    __param(4, (0, common_1.Query)('type')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('skip')),
    __param(7, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('invoices/stats'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getInvoiceStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('invoices/overdue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getOverdueInvoices", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('invoices/:id/html'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getInvoiceHTML", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('invoices/:id/send'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "sendInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('invoices/:id/payment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_dto_1.RecordPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "recordInvoicePayment", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('invoices/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "cancelInvoice", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)('sales'),
    __metadata("design:paramtypes", [sales_service_1.SalesService,
        receipt_service_1.ReceiptService,
        invoice_service_1.InvoiceService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map