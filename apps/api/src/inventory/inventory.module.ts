import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { CategorySuggestionService } from './services/category-suggestion.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { StockAdjustment, StockAdjustmentSchema } from './schemas/stock-adjustment.schema';
import { StockReconciliation, StockReconciliationSchema } from './schemas/stock-reconciliation.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: StockAdjustment.name, schema: StockAdjustmentSchema },
      { name: StockReconciliation.name, schema: StockReconciliationSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    forwardRef(() => SubscriptionsModule),
    CloudinaryModule,
  ],
  providers: [InventoryService, CategorySuggestionService],
  controllers: [InventoryController],
  exports: [InventoryService, CategorySuggestionService],
})
export class InventoryModule {}
