import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Purchase, PurchaseSchema } from './purchase.schema';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    InventoryModule,
  ],
  providers: [PurchasesService],
  controllers: [PurchasesController],
  exports: [PurchasesService],
})
export class PurchasesModule {}
