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
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    server;
    logger = new common_1.Logger(EventsGateway_1.name);
    userSockets = new Map();
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client) {
        const userId = client.handshake.query.userId;
        const shopId = client.handshake.query.shopId;
        if (userId && shopId) {
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)?.add(client.id);
            client.join(`shop:${shopId}`);
            client.join(`user:${userId}`);
            this.logger.log(`Client ${client.id} connected (user: ${userId}, shop: ${shopId})`);
        }
    }
    handleDisconnect(client) {
        const userId = client.handshake.query.userId;
        if (userId && this.userSockets.has(userId)) {
            const userSet = this.userSockets.get(userId);
            userSet?.delete(client.id);
            if (userSet?.size === 0) {
                this.userSockets.delete(userId);
            }
        }
        this.logger.log(`Client ${client.id} disconnected`);
    }
    handleOrderCreated(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('order:created', data);
        this.logger.log(`Order created event broadcast to shop ${shopId}`);
    }
    handleOrderUpdated(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('order:updated', data);
        this.logger.log(`Order updated event broadcast to shop ${shopId}`);
    }
    handleInventoryUpdated(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('inventory:updated', data);
        this.logger.log(`Inventory updated event broadcast to shop ${shopId}`);
    }
    handleLowStock(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('stock:low', data);
        this.logger.log(`Low stock alert broadcast to shop ${shopId}`);
    }
    handlePaymentReceived(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('payment:received', data);
        this.logger.log(`Payment received event broadcast to shop ${shopId}`);
    }
    handlePaymentFailed(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('payment:failed', data);
        this.logger.log(`Payment failed event broadcast to shop ${shopId}`);
    }
    handleSupplierUpdated(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('supplier:updated', data);
    }
    handlePurchaseCreated(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('purchase:created', data);
    }
    handlePurchaseReceived(client, data) {
        const shopId = client.handshake.query.shopId;
        this.server.to(`shop:${shopId}`).emit('purchase:received', data);
    }
    broadcastOrderCreated(shopId, order) {
        this.server.to(`shop:${shopId}`).emit('order:created', order);
    }
    broadcastOrderUpdated(shopId, order) {
        this.server.to(`shop:${shopId}`).emit('order:updated', order);
    }
    broadcastInventoryUpdated(shopId, product) {
        this.server.to(`shop:${shopId}`).emit('inventory:updated', product);
    }
    broadcastLowStock(shopId, product) {
        this.server.to(`shop:${shopId}`).emit('stock:low', product);
    }
    broadcastPaymentReceived(shopId, payment) {
        this.server.to(`shop:${shopId}`).emit('payment:received', payment);
    }
    broadcastPaymentFailed(shopId, payment) {
        this.server.to(`shop:${shopId}`).emit('payment:failed', payment);
    }
    broadcastSupplierUpdated(shopId, supplier) {
        this.server.to(`shop:${shopId}`).emit('supplier:updated', supplier);
    }
    broadcastPurchaseCreated(shopId, purchase) {
        this.server.to(`shop:${shopId}`).emit('purchase:created', purchase);
    }
    broadcastPurchaseReceived(shopId, purchase) {
        this.server.to(`shop:${shopId}`).emit('purchase:received', purchase);
    }
    getConnectedUsersCount(shopId) {
        const room = this.server.sockets.adapter.rooms.get(`shop:${shopId}`);
        return room ? room.size : 0;
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('order:created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOrderCreated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('order:updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOrderUpdated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('inventory:updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleInventoryUpdated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stock:low'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleLowStock", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('payment:received'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePaymentReceived", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('payment:failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePaymentFailed", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('supplier:updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSupplierUpdated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('purchase:created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePurchaseCreated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('purchase:received'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePurchaseReceived", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    })
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map