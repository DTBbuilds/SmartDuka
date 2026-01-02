import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
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
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { PasswordResetToken, PasswordResetTokenSchema } from './schemas/password-reset-token.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { CookieService } from './services/cookie.service';
import { CsrfService } from './services/csrf.service';
import { CsrfGuard } from './guards/csrf.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';

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
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
      {
        name: PasswordResetToken.name,
        schema: PasswordResetTokenSchema,
      },
      {
        name: Session.name,
        schema: SessionSchema,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'your-secret-key',
        signOptions: { expiresIn: '30m' }, // Short-lived access tokens
      }),
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    CookieService,
    CsrfService,
    JwtStrategy,
    GoogleStrategy,
    SubscriptionStatusGuard,
    CsrfGuard,
    RefreshTokenGuard,
    JwtCookieAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    TokenService,
    CookieService,
    CsrfService,
    SubscriptionStatusGuard,
    CsrfGuard,
    RefreshTokenGuard,
    JwtCookieAuthGuard,
  ],
})
export class AuthModule {}
