import { Global, Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { RedisService } from './services/redis.service';
import { TransactionService } from './services/transaction.service';
import { BarcodeService } from './barcode.service';

@Global()
@Module({
  providers: [CacheService, RedisService, TransactionService, BarcodeService],
  exports: [CacheService, RedisService, TransactionService, BarcodeService],
})
export class CommonModule {}
