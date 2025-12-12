import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionGuardService } from './subscription-guard.service';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { SubscriptionMigrationService } from './subscription-migration.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { SubscriptionInvoice, SubscriptionInvoiceSchema } from './schemas/subscription-invoice.schema';
import { PaymentAttempt, PaymentAttemptSchema } from './schemas/payment-attempt.schema';
import { PaymentAttemptService } from './services/payment-attempt.service';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SystemConfig, SystemConfigSchema } from '../super-admin/schemas/system-config.schema';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SubscriptionInvoice.name, schema: SubscriptionInvoiceSchema },
      { name: Shop.name, schema: ShopSchema },
      { name: User.name, schema: UserSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
    ]),
    PaymentsModule,
  ],
  controllers: [SubscriptionsController, SubscriptionPaymentController],
  providers: [
    SubscriptionsService, 
    SubscriptionGuardService, 
    SubscriptionMpesaService,
    SubscriptionSchedulerService,
    SubscriptionMigrationService,
    PaymentAttemptService,
  ],
  exports: [SubscriptionsService, SubscriptionGuardService, SubscriptionMpesaService, SubscriptionMigrationService, PaymentAttemptService],
})
export class SubscriptionsModule implements OnModuleInit {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async onModuleInit() {
    // Seed default subscription plans on startup
    await this.subscriptionsService.seedPlans();
    
    // Update existing plans with new setup pricing (KES 3,000, 1 month training & support, optional)
    await this.subscriptionsService.updatePlansSetupPricing();
    
    // Note: Migration runs automatically via SubscriptionMigrationService.onModuleInit()
  }
}
