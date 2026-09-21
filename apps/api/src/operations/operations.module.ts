import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';
import {
  StockTransfer,
  StockTransferSchema,
} from '../branches/schemas/stock-transfer.schema';
import { PurchasesModule } from '../purchases/purchases.module';
import { BranchesModule } from '../branches/branches.module';
import { OperationalRecoveryService } from './operational-recovery.service';
import { OperationalRecoveryController } from './operational-recovery.controller';

/**
 * P0-7C — operational claim convergence. Consumes the canonical
 * PurchasesService/StockTransferService so recovery executes the exact
 * same claim/converge/finalize paths as live requests.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
      { name: StockTransfer.name, schema: StockTransferSchema },
    ]),
    PurchasesModule,
    BranchesModule,
  ],
  providers: [OperationalRecoveryService],
  controllers: [OperationalRecoveryController],
  exports: [OperationalRecoveryService],
})
export class OperationsModule {}
