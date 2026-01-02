import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from './branch.schema';
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { StockTransfer, StockTransferSchema } from './schemas/stock-transfer.schema';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { StaffAssignmentService } from './staff-assignment.service';
import { StaffAssignmentController } from './staff-assignment.controller';
import { StockTransferService } from './services/stock-transfer.service';
import { StockTransferController } from './controllers/stock-transfer.controller';
import { BranchValidationMiddleware } from './branch-validation.middleware';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: StockTransfer.name, schema: StockTransferSchema },
    ]),
    forwardRef(() => SubscriptionsModule),
  ],
  providers: [BranchesService, StaffAssignmentService, StockTransferService, BranchValidationMiddleware],
  controllers: [BranchesController, StaffAssignmentController, StockTransferController],
  exports: [BranchesService, StaffAssignmentService, StockTransferService, BranchValidationMiddleware],
})
export class BranchesModule {}
