import { Controller, Get, Head, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): object {
    return {
      name: 'SmartDuka API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        api: '/api/v1',
      },
    };
  }

  @Head()
  headRoot(): void {
    // HEAD request for health probes - returns 200 with no body
    return;
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
