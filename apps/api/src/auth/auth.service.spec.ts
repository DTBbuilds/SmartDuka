import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { LoginHistory } from './schemas/login-history.schema';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: ShopsService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn(() => 't'), verify: jest.fn() } },
        { provide: ShopSettingsService, useValue: {} },
        { provide: getModelToken(LoginHistory.name), useValue: {} },
        { provide: getModelToken('SuperAdmin'), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
