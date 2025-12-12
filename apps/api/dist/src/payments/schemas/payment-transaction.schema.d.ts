import { HydratedDocument, Types } from 'mongoose';
export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;
export declare class PaymentTransaction {
    shopId: Types.ObjectId;
    orderId: Types.ObjectId;
    orderNumber: string;
    cashierId: Types.ObjectId;
    cashierName: string;
    branchId?: Types.ObjectId;
    paymentMethod: 'cash' | 'card' | 'mpesa' | 'qr' | 'stripe' | 'bank' | 'other';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    mpesaReceiptNumber?: string;
    mpesaTransactionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeCustomerId?: string;
    stripeReceiptUrl?: string;
    amountTendered?: number;
    change?: number;
    referenceNumber?: string;
    errorCode?: string;
    errorMessage?: string;
    processedAt?: Date;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const PaymentTransactionSchema: import("mongoose").Schema<PaymentTransaction, import("mongoose").Model<PaymentTransaction, any, any, any, import("mongoose").Document<unknown, any, PaymentTransaction, any, {}> & PaymentTransaction & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentTransaction, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PaymentTransaction>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PaymentTransaction> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
