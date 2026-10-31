import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { Return, ReturnSchema } from './schemas/return.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Return.name, schema: ReturnSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [ReturnsService],
  controllers: [ReturnsController],
  exports: [ReturnsService],
})
export class ReturnsModule {}
