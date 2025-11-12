"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
        exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    });
    await app.listen(process.env.PORT ?? 5000);
    console.log(`🚀 Backend API running on http://localhost:${process.env.PORT ?? 5000}`);
}
bootstrap();
//# sourceMappingURL=main.js.map