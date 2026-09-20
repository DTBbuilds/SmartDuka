import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DarajaService } from './daraja.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { MpesaService } from './services/mpesa.service';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { MpesaEncryptionService } from './services/mpesa-encryption.service';
import { MpesaReconciliationService } from './services/mpesa-reconciliation.service';
import { PaymentConfigService } from './services/payment-config.service';
import { MpesaTransactionManagerService } from './services/mpesa-transaction-manager.service';
import { MpesaController } from './mpesa.controller';
import { PaymentConfigController } from './payment-config.controller';
import { PaymentReadinessController } from './payment-readiness.controller';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/payment-transaction.schema';
import {
  MpesaTransaction,
  MpesaTransactionSchema,
} from './schemas/mpesa-transaction.schema';
import {
  PaymentConfig,
  PaymentConfigSchema,
} from './schemas/payment-config.schema';
import {
  VerificationLog,
  VerificationLogSchema,
} from './schemas/verification-log.schema';
import {
  ConfigAuditLog,
  ConfigAuditLogSchema,
} from './schemas/config-audit-log.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    LoyaltyModule,
    CustomersModule,
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: MpesaTransaction.name, schema: MpesaTransactionSchema },
      { name: PaymentConfig.name, schema: PaymentConfigSchema },
      { name: VerificationLog.name, schema: VerificationLogSchema },
      { name: ConfigAuditLog.name, schema: ConfigAuditLogSchema },
      { name: Shop.name, schema: ShopSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [
    PaymentsService,
    DarajaService,
    PaymentTransactionService,
    MpesaService,
    MpesaMultiTenantService,
    MpesaEncryptionService,
    MpesaReconciliationService,
    PaymentConfigService,
    MpesaTransactionManagerService,
  ],
  controllers: [
    PaymentsController,
    MpesaController,
    PaymentConfigController,
    PaymentReadinessController,
  ],
  exports: [
    PaymentsService,
    DarajaService,
    PaymentTransactionService,
    MpesaService,
    MpesaMultiTenantService,
    MpesaEncryptionService,
    MpesaReconciliationService,
    PaymentConfigService,
    MpesaTransactionManagerService,
  ],
})
export class PaymentsModule {}
