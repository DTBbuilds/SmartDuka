import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reconciliation, ReconciliationSchema } from './reconciliation.schema';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { OrderSchema } from '../sales/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reconciliation.name, schema: ReconciliationSchema },
      { name: 'Order', schema: OrderSchema },
    ]),
  ],
  providers: [ReconciliationService],
  controllers: [ReconciliationController],
  exports: [ReconciliationService],
})
export class FinancialModule {}
