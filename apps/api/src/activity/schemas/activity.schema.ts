import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  userName: string;

  @Prop({ required: true, enum: ['admin', 'cashier'] })
  userRole: 'admin' | 'cashier';

  @Prop({
    required: true,
    enum: [
      'login',
      'login_pin',
      'logout',
      'heartbeat',
      'status_change',
      'checkout',
      'product_view',
      'inventory_view',
      'report_view',
      'product_add',
      'product_edit',
      'product_delete',
      'stock_update',
      'cashier_add',
      'cashier_delete',
      'cashier_disable',
      'cashier_enable',
      'settings_change',
      'shift_start',
      'shift_end',
      'shift_reconcile',
      'transaction_void',
      'transaction_refund',
      'transaction_discount',
    ],
  })
  action: string;

  @Prop({ type: Object, default: {} })
  details: {
    transactionId?: string;
    amount?: number;
    items?: number;
    paymentMethod?: string;
    productId?: string;
    productName?: string;
    quantity?: number;
    [key: string]: any;
  };

  @Prop({ default: null })
  ipAddress?: string;

  @Prop({ default: null })
  userAgent?: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Create indexes for better query performance
ActivitySchema.index({ shopId: 1, createdAt: -1 });
ActivitySchema.index({ shopId: 1, userId: 1, createdAt: -1 });
ActivitySchema.index({ shopId: 1, action: 1 });
ActivitySchema.index({ userId: 1, action: 1 });
ActivitySchema.index({ shopId: 1, 'details.branchId': 1, createdAt: -1 }); // Branch activity queries
ActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // TTL: 90 days auto-cleanup
