import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/smartduka'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
