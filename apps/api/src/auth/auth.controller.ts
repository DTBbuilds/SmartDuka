import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PinRateLimitGuard } from './guards/pin-rate-limit.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-shop')
  async registerShop(@Body() dto: RegisterShopDto) {
    return this.authService.registerShop(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @UseGuards(PinRateLimitGuard)
  @Post('login-pin')
  async loginWithPin(
    @Body() body: { pin: string; shopId: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginWithPin(body.pin, body.shopId, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-pin')
  async setPin(
    @Body() body: { pin: string },
    @CurrentUser() user: any,
  ) {
    await this.authService.setPin(user.sub, body.pin);
    return { message: 'PIN set successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
