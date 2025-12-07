import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { ShopAuditLog, ShopAuditLogSchema } from '../shops/schemas/shop-audit-log.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionInvoice, SubscriptionInvoiceSchema } from '../subscriptions/schemas/subscription-invoice.schema';
import { PaymentTransaction, PaymentTransactionSchema } from '../payments/schemas/payment-transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SystemAuditLog, SystemAuditLogSchema } from './schemas/system-audit-log.schema';
import { EmailLog, EmailLogSchema } from './schemas/email-log.schema';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { SystemManagementController } from './system-management.controller';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';
import { SystemAuditService } from './services/system-audit.service';
import { EmailLogService } from './services/email-log.service';
import { SystemManagementService } from './services/system-management.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: ShopAuditLog.name, schema: ShopAuditLogSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionInvoice.name, schema: SubscriptionInvoiceSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: SystemAuditLog.name, schema: SystemAuditLogSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
    ]),
    NotificationsModule,
  ],
  providers: [
    SuperAdminService,
    ShopAuditLogService,
    SystemAuditService,
    EmailLogService,
    SystemManagementService,
  ],
  controllers: [SuperAdminController, SystemManagementController],
  exports: [
    SuperAdminService,
    ShopAuditLogService,
    SystemAuditService,
    EmailLogService,
    SystemManagementService,
  ],
})
export class SuperAdminModule {}
