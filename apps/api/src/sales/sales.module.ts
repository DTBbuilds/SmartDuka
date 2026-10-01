import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { Receipt, ReceiptSchema } from './schemas/receipt.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import {
  StockAdjustment,
  StockAdjustmentSchema,
} from '../inventory/schemas/stock-adjustment.schema';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from '../payments/schemas/payment-transaction.schema';
import { TransactionControlsController } from './transaction-controls.controller';
import { TransactionControlsService } from './transaction-controls.service';
import { ReceiptService } from './services/receipt.service';
import { InvoiceService } from './services/invoice.service';
import { InventoryModule } from '../inventory/inventory.module';
import { ActivityModule } from '../activity/activity.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Receipt.name, schema: ReceiptSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: StockAdjustment.name, schema: StockAdjustmentSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
    InventoryModule,
    ActivityModule,
    PaymentsModule,
    NotificationsModule,
    ShopSettingsModule,
    forwardRef(() => LoyaltyModule),
    forwardRef(() => CustomersModule),
    ShiftsModule,
  ],
  providers: [
    SalesService,
    ReceiptService,
    InvoiceService,
    TransactionControlsService,
  ],
  controllers: [SalesController, TransactionControlsController],
  exports: [
    SalesService,
    ReceiptService,
    InvoiceService,
    TransactionControlsService,
  ],
})
export class SalesModule {}
