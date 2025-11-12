import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DarajaService } from './daraja.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PaymentTransaction, PaymentTransactionSchema } from './schemas/payment-transaction.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
  ],
  providers: [PaymentsService, DarajaService, PaymentTransactionService],
  controllers: [PaymentsController],
  exports: [PaymentsService, DarajaService, PaymentTransactionService],
})
export class PaymentsModule {}
