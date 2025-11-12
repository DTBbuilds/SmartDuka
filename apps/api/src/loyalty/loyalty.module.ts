import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyProgram, LoyaltyProgramSchema } from './schemas/loyalty-program.schema';
import { LoyaltyAccount, LoyaltyAccountSchema } from './schemas/loyalty-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoyaltyProgram.name, schema: LoyaltyProgramSchema },
      { name: LoyaltyAccount.name, schema: LoyaltyAccountSchema },
    ]),
  ],
  providers: [LoyaltyService],
  controllers: [LoyaltyController],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
