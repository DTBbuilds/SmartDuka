import { Global, Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { RedisService } from './services/redis.service';
import { TransactionService } from './services/transaction.service';

@Global()
@Module({
  providers: [CacheService, RedisService, TransactionService],
  exports: [CacheService, RedisService, TransactionService],
})
export class CommonModule {}
