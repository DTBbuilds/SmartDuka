import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { Discount, DiscountSchema } from './schemas/discount.schema';
import { DiscountAudit, DiscountAuditSchema } from './schemas/discount-audit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Discount.name, schema: DiscountSchema },
      { name: DiscountAudit.name, schema: DiscountAuditSchema },
    ]),
  ],
  providers: [DiscountsService],
  controllers: [DiscountsController],
  exports: [DiscountsService],
})
export class DiscountsModule {}
