import { HydratedDocument, Types } from 'mongoose';
export type OrderDocument = HydratedDocument<Order>;
export declare class OrderItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}
export declare const OrderItemSchema: import("mongoose").Schema<OrderItem, import("mongoose").Model<OrderItem, any, any, any, import("mongoose").Document<unknown, any, OrderItem, any, {}> & OrderItem & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrderItem, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<OrderItem>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<OrderItem> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PaymentRecord {
    method: string;
    amount: number;
    reference?: string;
    status?: string;
    mpesaReceiptNumber?: string;
    reversalReason?: string;
    reversalTime?: Date;
}
export declare const PaymentRecordSchema: import("mongoose").Schema<PaymentRecord, import("mongoose").Model<PaymentRecord, any, any, any, import("mongoose").Document<unknown, any, PaymentRecord, any, {}> & PaymentRecord & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentRecord, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PaymentRecord>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PaymentRecord> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Order {
    shopId: Types.ObjectId;
    branchId?: Types.ObjectId;
    userId: Types.ObjectId;
    orderNumber: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'pending' | 'completed' | 'void';
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    payments: PaymentRecord[];
    notes?: string;
    customerName?: string;
    customerPhone?: string;
    cashierId?: string;
    cashierName?: string;
    isOffline?: boolean;
    transactionType?: 'sale' | 'void' | 'return' | 'refund';
    voidReason?: string;
    voidApprovedBy?: Types.ObjectId;
    voidApprovedAt?: Date;
    discountAmount?: number;
    discountReason?: string;
    discountApprovedBy?: Types.ObjectId;
    refundAmount?: number;
    refundReason?: string;
    refundApprovedBy?: Types.ObjectId;
    refundApprovedAt?: Date;
    shiftId?: Types.ObjectId;
}
export declare const OrderSchema: import("mongoose").Schema<Order, import("mongoose").Model<Order, any, any, any, import("mongoose").Document<unknown, any, Order, any, {}> & Order & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Order, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Order>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Order> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
