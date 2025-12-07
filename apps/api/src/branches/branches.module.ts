import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from './branch.schema';
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { StaffAssignmentService } from './staff-assignment.service';
import { StaffAssignmentController } from './staff-assignment.controller';
import { BranchValidationMiddleware } from './branch-validation.middleware';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => SubscriptionsModule),
  ],
  providers: [BranchesService, StaffAssignmentService, BranchValidationMiddleware],
  controllers: [BranchesController, StaffAssignmentController],
  exports: [BranchesService, StaffAssignmentService, BranchValidationMiddleware],
})
export class BranchesModule {}
