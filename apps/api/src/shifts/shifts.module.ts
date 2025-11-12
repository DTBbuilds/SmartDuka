import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { Shift, ShiftSchema } from './schemas/shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Shift.name,
        schema: ShiftSchema,
      },
    ]),
  ],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
