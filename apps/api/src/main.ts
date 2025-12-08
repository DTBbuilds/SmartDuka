import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security: HTTP headers protection
  app.use(helmet());

  // Performance: Response compression
  app.use(compression());

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

  // Note: API prefix disabled for backward compatibility with existing frontend
  // TODO: Enable API versioning after updating all frontend API calls to use centralized config
  // app.setGlobalPrefix('api/v1', {
  //   exclude: ['health', 'health/ready', 'health/live', 'api/docs'],
  // });

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

  // Enable CORS with explicit configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://smartduka.vercel.app',
      'https://smartduka-eta.vercel.app',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
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
