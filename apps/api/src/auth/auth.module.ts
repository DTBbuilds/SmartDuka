import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ShopsModule } from '../shops/shops.module';
import { ActivityModule } from '../activity/activity.module';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { SubscriptionStatusGuard } from './guards/subscription-status.guard';
import { SuperAdmin, SuperAdminSchema } from './schemas/super-admin.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';

@Module({
  imports: [
    UsersModule,
    ShopsModule,
    ActivityModule,
    ShopSettingsModule,
    NotificationsModule,
    forwardRef(() => SubscriptionsModule),
    PassportModule,
    MongooseModule.forFeature([
      {
        name: 'SuperAdmin',
        schema: SuperAdminSchema,
        collection: 'super_admins',
      },
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'your-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy, SubscriptionStatusGuard],
  controllers: [AuthController],
  exports: [AuthService, SubscriptionStatusGuard],
})
export class AuthModule {}
