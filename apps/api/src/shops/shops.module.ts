import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './shop.schema';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }])],
  providers: [ShopsService],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}
