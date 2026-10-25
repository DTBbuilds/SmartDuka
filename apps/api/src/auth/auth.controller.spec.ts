import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OtpService } from './services/otp.service';
import { OAuthExchangeService } from './services/oauth-exchange.service';
import { CookieService } from './services/cookie.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: TokenService, useValue: {} },
        { provide: OtpService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: OAuthExchangeService, useValue: {} },
        { provide: CookieService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
