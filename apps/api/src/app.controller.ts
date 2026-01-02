import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobotsTxt(): string {
    return `User-agent: *
Allow: /health
Disallow: /api/
Disallow: /auth/
Disallow: /users/
Disallow: /inventory/
Disallow: /sales/
Disallow: /payments/
Disallow: /shops/
Disallow: /stripe/
Disallow: /subscriptions/

# SmartDuka API - No indexing needed for API endpoints
# Only health check is allowed for monitoring services
`;
  }

  @Get('favicon.ico')
  @Header('Content-Type', 'image/x-icon')
  getFavicon(): string {
    // Return empty response for favicon requests to prevent 404 errors
    return '';
  }
}
