import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopSettings, ShopSettingsSchema } from './shop-settings.schema';
import { ShopSettingsService } from './shop-settings.service';
import { ShopSettingsController } from './shop-settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopSettings.name, schema: ShopSettingsSchema },
    ]),
  ],
  controllers: [ShopSettingsController],
  providers: [ShopSettingsService],
  exports: [ShopSettingsService],
})
export class ShopSettingsModule {}
