import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway],
})
export class EventsModule {}
