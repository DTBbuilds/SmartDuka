import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './schemas/shop.schema';
import { ReceiptSettings, ReceiptSettingsSchema } from './schemas/receipt-settings.schema';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { ReceiptSettingsService } from './services/receipt-settings.service';
import { ReceiptSettingsController } from './controllers/receipt-settings.controller';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: ReceiptSettings.name, schema: ReceiptSettingsSchema },
    ]),
    forwardRef(() => ShopSettingsModule),
  ],
  providers: [ShopsService, ReceiptSettingsService],
  controllers: [ShopsController, ReceiptSettingsController],
  exports: [ShopsService, ReceiptSettingsService],
})
export class ShopsModule {}
