import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AdjustmentsModule } from './stock/adjustments.module';
import { ShopsModule } from './shops/shops.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { CustomersModule } from './customers/customers.module';
import { ActivityModule } from './activity/activity.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SupportModule } from './support/support.module';
import { ShiftsModule } from './shifts/shifts.module';
import { DiscountsModule } from './discounts/discounts.module';
import { ReturnsModule } from './returns/returns.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { LocationsModule } from './locations/locations.module';
import { FinancialModule } from './financial/financial.module';
import { ShopSettingsModule } from './shop-settings/shop-settings.module';
import { ReorderModule } from './reorder/reorder.module';
import { BranchesModule } from './branches/branches.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StripeModule } from './stripe/stripe.module';
import { MessagingModule } from './messaging/messaging.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/smartduka'),
    // Global rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    SuppliersModule,
    PurchasesModule,
    AdjustmentsModule,
    ShopsModule,
    RealtimeModule,
    ReportsModule,
    CustomersModule,
    DiscountsModule,
    ReturnsModule,
    ReceiptsModule,
    LoyaltyModule,
    LocationsModule,
    FinancialModule,
    ActivityModule,
    SuperAdminModule,
    SupportModule,
    ShiftsModule,
    ShopSettingsModule,
    ReorderModule,
    BranchesModule,
    AuditModule,
    SubscriptionsModule,
    NotificationsModule,
    StripeModule.forRootAsync(),
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enable global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
