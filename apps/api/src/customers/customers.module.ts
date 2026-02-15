import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { LoyaltyAccount, LoyaltyAccountSchema } from '../loyalty/schemas/loyalty-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: LoyaltyAccount.name, schema: LoyaltyAccountSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
