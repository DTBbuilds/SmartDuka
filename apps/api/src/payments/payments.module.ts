import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DarajaService } from './daraja.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { MpesaService } from './services/mpesa.service';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { MpesaController } from './mpesa.controller';
import { PaymentTransaction, PaymentTransactionSchema } from './schemas/payment-transaction.schema';
import { MpesaTransaction, MpesaTransactionSchema } from './schemas/mpesa-transaction.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: MpesaTransaction.name, schema: MpesaTransactionSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  providers: [
    PaymentsService,
    DarajaService,
    PaymentTransactionService,
    MpesaService,
    MpesaMultiTenantService,
  ],
  controllers: [PaymentsController, MpesaController],
  exports: [
    PaymentsService,
    DarajaService,
    PaymentTransactionService,
    MpesaService,
    MpesaMultiTenantService,
  ],
})
export class PaymentsModule {}
