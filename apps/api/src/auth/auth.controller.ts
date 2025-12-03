import { Controller, Post, Body, Get, UseGuards, Req, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PinRateLimitGuard } from './guards/pin-rate-limit.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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

  // Google OAuth endpoints
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Res() res: Response) {
    // Check if Google OAuth is configured
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'not-configured') {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google login is not configured')}`);
      return;
    }
    // The guard handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    try {
      const result = await this.authService.googleLogin(req.user, ipAddress, userAgent);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      
      if (result.isNewUser) {
        // New user - redirect to shop registration with Google profile
        const profileData = encodeURIComponent(JSON.stringify(result.googleProfile));
        res.redirect(`${frontendUrl}/register-shop?google=${profileData}`);
      } else {
        // Existing user - redirect with token
        res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
      }
    } catch (error: any) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Google login failed')}`);
    }
  }

  @Post('register-shop-google')
  async registerShopWithGoogle(
    @Body() body: {
      googleProfile: { googleId: string; email: string; name: string; avatarUrl?: string; phone?: string };
      shop: { shopName: string; businessType: string; county: string; city: string; address?: string; kraPin?: string; description?: string; phone?: string };
    },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.registerShopWithGoogle(body.googleProfile, body.shop, ipAddress, userAgent);
  }
}
