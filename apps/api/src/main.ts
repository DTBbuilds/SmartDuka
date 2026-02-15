import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dns from 'dns';

// Fix for networks with slow/unreliable DNS that can't resolve MongoDB Atlas SRV records.
// Uses Google DNS as primary, Cloudflare as fallback, then falls back to system default.
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS FIRST - before any other middleware
  // This ensures preflight requests work correctly
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDev 
      ? true // Allow all origins in development (for mobile testing on same network)
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://smartduka.vercel.app',
          'https://smartduka-eta.vercel.app',
          'https://www.smartduka.org',
          'https://smartduka.org',
          process.env.CORS_ORIGIN,
        ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-CSRF-Token', 'x-csrf-token'],
    exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  });

  // Security: HTTP headers protection (after CORS)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Performance: Response compression
  app.use(compression());

  // Cookie parser for httpOnly cookie support
  app.use(cookieParser());

  // Global validation pipe - validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transformOptions: {
        enableImplicitConversion: true, // Convert query params to proper types
      },
    }),
  );

  // Global exception filter - consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // API versioning - enabled with v1 prefix
  // Excludes health endpoints and docs for direct access
  app.setGlobalPrefix('api/v1', {
    exclude: [
      // Root routes for Render health probes and basic info
      '',
      'robots.txt',
      'favicon.ico',
      // Health endpoints
      'health', 
      'health/ready', 
      'health/live', 
      'api/docs',
      // M-Pesa callback must be accessible without prefix (external webhook)
      'payments/mpesa/callback',
      // Stripe webhook must be accessible without prefix
      'stripe/webhook',
    ],
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('SmartDuka API')
    .setDescription(
      `SmartDuka POS System API Documentation
      
## Features
- Multi-tenant shop management
- Inventory management with barcode support
- Sales and checkout processing
- M-Pesa payment integration
- Branch management
- User roles and permissions
- Real-time updates via WebSocket

## Authentication
All endpoints (except /health and /auth) require JWT authentication.
Include the token in the Authorization header: \`Bearer <token>\`
      `
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Inventory', 'Product and stock management')
    .addTag('Sales', 'Orders and checkout')
    .addTag('Payments', 'Payment processing')
    .addTag('Branches', 'Branch management')
    .addTag('Reports', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'SmartDuka API Docs',
  });

  const port = process.env.PORT ?? 5000;
  
  // Graceful shutdown handling
  app.enableShutdownHooks();
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`, error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  await app.listen(port);
  
  // Signal PM2 that app is ready
  if (process.send) {
    process.send('ready');
  }
  
  logger.log(`🚀 Backend API running on http://localhost:${port}`);
  logger.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
  logger.log(`❤️ Health check at http://localhost:${port}/health`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
