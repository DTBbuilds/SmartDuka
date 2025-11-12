import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { StockAdjustment, StockAdjustmentSchema } from './schemas/stock-adjustment.schema';
import { StockReconciliation, StockReconciliationSchema } from './schemas/stock-reconciliation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: StockAdjustment.name, schema: StockAdjustmentSchema },
      { name: StockReconciliation.name, schema: StockReconciliationSchema },
    ]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
