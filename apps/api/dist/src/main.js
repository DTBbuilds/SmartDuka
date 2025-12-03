"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('SmartDuka API')
        .setDescription(`SmartDuka POS System API Documentation
      
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
      `)
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management')
        .addTag('Inventory', 'Product and stock management')
        .addTag('Sales', 'Orders and checkout')
        .addTag('Payments', 'Payment processing')
        .addTag('Branches', 'Branch management')
        .addTag('Reports', 'Analytics and reporting')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'SmartDuka API Docs',
    });
    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://smartduka.vercel.app',
            process.env.CORS_ORIGIN,
        ].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
        exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    });
    const port = process.env.PORT ?? 5000;
    await app.listen(port);
    console.log(`🚀 Backend API running on http://localhost:${port}`);
    console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
    console.log(`❤️ Health check at http://localhost:${port}/health`);
}
bootstrap();
//# sourceMappingURL=main.js.map