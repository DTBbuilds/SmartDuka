import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './schemas/shop.schema';
import { ReceiptSettings, ReceiptSettingsSchema } from './schemas/receipt-settings.schema';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { ReceiptSettingsService } from './services/receipt-settings.service';
import { ReceiptSettingsController } from './controllers/receipt-settings.controller';
import { CurrencyPolicyService } from './services/currency-policy.service';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { PaymentTransaction, PaymentTransactionSchema } from '../payments/schemas/payment-transaction.schema';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: ReceiptSettings.name, schema: ReceiptSettingsSchema },
      // QUALITY-CORE1 P1-B: financial-record evidence for the currency policy
      { name: Order.name, schema: OrderSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
    forwardRef(() => ShopSettingsModule),
  ],
  providers: [ShopsService, ReceiptSettingsService, CurrencyPolicyService],
  controllers: [ShopsController, ReceiptSettingsController],
  exports: [ShopsService, ReceiptSettingsService, CurrencyPolicyService],
})
export class ShopsModule {}
