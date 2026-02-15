import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { KeepAliveService } from './keep-alive.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [TerminusModule, MongooseModule],
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class HealthModule {}
