import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private userSockets;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleOrderCreated(client: Socket, data: any): void;
    handleOrderUpdated(client: Socket, data: any): void;
    handleInventoryUpdated(client: Socket, data: any): void;
    handleLowStock(client: Socket, data: any): void;
    handlePaymentReceived(client: Socket, data: any): void;
    handlePaymentFailed(client: Socket, data: any): void;
    handleSupplierUpdated(client: Socket, data: any): void;
    handlePurchaseCreated(client: Socket, data: any): void;
    handlePurchaseReceived(client: Socket, data: any): void;
    broadcastOrderCreated(shopId: string, order: any): void;
    broadcastOrderUpdated(shopId: string, order: any): void;
    broadcastInventoryUpdated(shopId: string, product: any): void;
    broadcastLowStock(shopId: string, product: any): void;
    broadcastPaymentReceived(shopId: string, payment: any): void;
    broadcastPaymentFailed(shopId: string, payment: any): void;
    broadcastSupplierUpdated(shopId: string, supplier: any): void;
    broadcastPurchaseCreated(shopId: string, purchase: any): void;
    broadcastPurchaseReceived(shopId: string, purchase: any): void;
    getConnectedUsersCount(shopId: string): number;
}
