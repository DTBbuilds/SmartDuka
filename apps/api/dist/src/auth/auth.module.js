"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const users_module_1 = require("../users/users.module");
const shops_module_1 = require("../shops/shops.module");
const activity_module_1 = require("../activity/activity.module");
const shop_settings_module_1 = require("../shop-settings/shop-settings.module");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const super_admin_schema_1 = require("./schemas/super-admin.schema");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            shops_module_1.ShopsModule,
            activity_module_1.ActivityModule,
            shop_settings_module_1.ShopSettingsModule,
            passport_1.PassportModule,
            mongoose_1.MongooseModule.forFeature([
                {
                    name: 'SuperAdmin',
                    schema: super_admin_schema_1.SuperAdminSchema,
                    collection: 'super_admins',
                },
            ]),
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET') ?? 'your-secret-key',
                    signOptions: { expiresIn: '7d' },
                }),
            }),
        ],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, google_strategy_1.GoogleStrategy],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map