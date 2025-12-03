import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { Receipt, ReceiptSchema } from './schemas/receipt.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { ReceiptService } from './services/receipt.service';
import { InvoiceService } from './services/invoice.service';
import { InventoryModule } from '../inventory/inventory.module';
import { ActivityModule } from '../activity/activity.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Receipt.name, schema: ReceiptSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    InventoryModule,
    ActivityModule,
    PaymentsModule,
  ],
  providers: [SalesService, ReceiptService, InvoiceService],
  controllers: [SalesController],
  exports: [SalesService, ReceiptService, InvoiceService],
})
export class SalesModule {}
