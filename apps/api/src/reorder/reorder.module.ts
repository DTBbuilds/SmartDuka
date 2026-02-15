import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReorderService } from './reorder.service';
import { ReorderController } from './reorder.controller';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';

/**
 * PHASE 3: REORDER AUTOMATION MODULE
 * 
 * Provides automatic purchase order creation when stock falls below reorder point
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  providers: [ReorderService],
  controllers: [ReorderController],
  exports: [ReorderService],
})
export class ReorderModule {}
