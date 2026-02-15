import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { ReceiptTemplate, ReceiptTemplateSchema } from './schemas/receipt-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReceiptTemplate.name, schema: ReceiptTemplateSchema },
    ]),
  ],
  providers: [ReceiptsService],
  controllers: [ReceiptsController],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
