import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopSettings, ShopSettingsSchema } from './shop-settings.schema';
import { ShopSettingsService } from './shop-settings.service';
import { ShopSettingsController } from './shop-settings.controller';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopSettings.name, schema: ShopSettingsSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  controllers: [ShopSettingsController],
  providers: [ShopSettingsService],
  exports: [ShopSettingsService],
})
export class ShopSettingsModule {}
