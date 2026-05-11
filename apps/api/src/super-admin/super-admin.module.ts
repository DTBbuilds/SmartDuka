import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { ShopAuditLog, ShopAuditLogSchema } from '../shops/schemas/shop-audit-log.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { SubscriptionInvoice, SubscriptionInvoiceSchema } from '../subscriptions/schemas/subscription-invoice.schema';
import { PaymentTransaction, PaymentTransactionSchema } from '../payments/schemas/payment-transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SystemAuditLog, SystemAuditLogSchema } from './schemas/system-audit-log.schema';
import { EmailLog, EmailLogSchema } from './schemas/email-log.schema';
import { SystemConfig, SystemConfigSchema } from './schemas/system-config.schema';
import { Invoice, InvoiceSchema } from '../sales/schemas/invoice.schema';
import { PaymentAttempt, PaymentAttemptSchema } from '../subscriptions/schemas/payment-attempt.schema';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { SystemManagementController } from './system-management.controller';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';
import { SystemAuditService } from './services/system-audit.service';
import { EmailLogService } from './services/email-log.service';
import { SystemManagementService } from './services/system-management.service';
import { SystemConfigService } from './services/system-config.service';
import { SuperAdminCommunicationsService } from './services/super-admin-communications.service';
import { SuperAdminCommunicationsController } from './super-admin-communications.controller';
import { SuperAdminPaymentsController } from './super-admin-payments.controller';
import { LoginHistoryController } from './login-history.controller';
import { LoginHistoryService } from './services/login-history.service';
import { ActivityMonitorController } from './activity-monitor.controller';
import { ActivityMonitorService } from './services/activity-monitor.service';
import { SuperAdminDevicesController } from './super-admin-devices.controller';
import { ActivityGateway } from './gateway/activity.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoginHistory, LoginHistorySchema } from '../auth/schemas/login-history.schema';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: ShopAuditLog.name, schema: ShopAuditLogSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SubscriptionInvoice.name, schema: SubscriptionInvoiceSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: SystemAuditLog.name, schema: SystemAuditLogSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
    NotificationsModule,
    PaymentsModule,
    SubscriptionsModule,
    EventsModule,
    AuthModule,
    JwtModule.register({}),
  ],
  providers: [
    SuperAdminService,
    ShopAuditLogService,
    SystemAuditService,
    EmailLogService,
    SystemManagementService,
    SystemConfigService,
    SuperAdminCommunicationsService,
    LoginHistoryService,
    ActivityMonitorService,
    ActivityGateway,
  ],
  controllers: [SuperAdminController, SystemManagementController, SuperAdminCommunicationsController, SuperAdminPaymentsController, LoginHistoryController, ActivityMonitorController, SuperAdminDevicesController],
  exports: [
    SuperAdminService,
    ShopAuditLogService,
    SystemAuditService,
    EmailLogService,
    SystemManagementService,
    SystemConfigService,
    SuperAdminCommunicationsService,
  ],
})
export class SuperAdminModule {}
