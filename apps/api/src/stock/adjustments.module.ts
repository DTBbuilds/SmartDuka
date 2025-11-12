import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Adjustment, AdjustmentSchema } from './adjustment.schema';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentsController } from './adjustments.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Adjustment.name, schema: AdjustmentSchema }])],
  providers: [AdjustmentsService],
  controllers: [AdjustmentsController],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
