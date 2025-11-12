import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ShopsModule } from '../shops/shops.module';
import { ActivityModule } from '../activity/activity.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SuperAdmin, SuperAdminSchema } from './schemas/super-admin.schema';

@Module({
  imports: [
    UsersModule,
    ShopsModule,
    ActivityModule,
    PassportModule,
    MongooseModule.forFeature([
      {
        name: 'SuperAdmin',
        schema: SuperAdminSchema,
        collection: 'super_admins',
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
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
