import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeConnectController } from './stripe-connect.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeCustomerService } from './services/stripe-customer.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { StripeAnalyticsService } from './services/stripe-analytics.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { OrderPaymentAuthorityService } from '../payments/services/order-payment-authority.service';
import { PaymentsModule } from '../payments/payments.module';
import {
  StripeCustomer,
  StripeCustomerSchema,
} from './schemas/stripe-customer.schema';
import {
  StripePayment,
  StripePaymentSchema,
} from './schemas/stripe-payment.schema';
import {
  StripeSubscription,
  StripeSubscriptionSchema,
} from './schemas/stripe-subscription.schema';
import {
  StripeWebhookEvent,
  StripeWebhookEventSchema,
} from './schemas/stripe-webhook-event.schema';

@Global()
@Module({})
export class StripeModule {
  static forRootAsync(): DynamicModule {
    return {
      module: StripeModule,
      imports: [
        ConfigModule,
        // PaymentTransactionService (canonical order convergence on trusted
        // provider truth) is provided + exported by PaymentsModule.
        PaymentsModule,
        MongooseModule.forFeature([
          { name: StripeCustomer.name, schema: StripeCustomerSchema },
          { name: StripePayment.name, schema: StripePaymentSchema },
          { name: StripeSubscription.name, schema: StripeSubscriptionSchema },
          { name: StripeWebhookEvent.name, schema: StripeWebhookEventSchema },
          { name: Shop.name, schema: ShopSchema },
          { name: Order.name, schema: OrderSchema },
        ]),
      ],
      controllers: [
        StripeController,
        StripeConnectController,
        StripeWebhookController,
      ],
      providers: [
        {
          provide: 'STRIPE_API_KEY',
          useFactory: (configService: ConfigService) => {
            return configService.get<string>('STRIPE_SECRET_KEY');
          },
          inject: [ConfigService],
        },
        {
          provide: 'STRIPE_WEBHOOK_SECRET',
          useFactory: (configService: ConfigService) => {
            return configService.get<string>('STRIPE_WEBHOOK_SECRET');
          },
          inject: [ConfigService],
        },
        StripeService,
        StripeCustomerService,
        StripePaymentService,
        StripeSubscriptionService,
        StripeAnalyticsService,
        StripeConnectService,
        OrderPaymentAuthorityService,
      ],
      exports: [
        StripeService,
        StripeCustomerService,
        StripePaymentService,
        StripeSubscriptionService,
        StripeAnalyticsService,
        StripeConnectService,
        'STRIPE_API_KEY',
      ],
    };
  }
}
