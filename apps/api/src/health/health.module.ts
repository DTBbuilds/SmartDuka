import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PingController } from './ping.controller';
import { KeepAliveService } from './keep-alive.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [TerminusModule, MongooseModule],
  controllers: [HealthController, PingController],
  providers: [KeepAliveService],
})
export class HealthModule {}
