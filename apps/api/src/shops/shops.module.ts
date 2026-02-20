import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './shop.schema';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }]),
    forwardRef(() => ShopSettingsModule),
  ],
  providers: [ShopsService],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}
