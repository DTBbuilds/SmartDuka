"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterShopDto = exports.AdminInfoDto = exports.ShopInfoDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const KENYA_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
    "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
    "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
    "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
    "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu",
    "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana",
    "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];
class ShopInfoDto {
    shopName;
    businessType;
    county;
    city;
    address;
    kraPin;
    description;
    subscriptionPlanCode;
    billingCycle;
}
exports.ShopInfoDto = ShopInfoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Shop name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Shop name must not exceed 100 characters' }),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "shopName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Business type is required' }),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "businessType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(KENYA_COUNTIES, { message: 'Please select a valid county' }),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "county", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'City/Town is required' }),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'string') {
            const trimmed = value.trim().toUpperCase();
            return trimmed || undefined;
        }
        return undefined;
    }),
    (0, class_validator_1.ValidateIf)((o) => o.kraPin !== undefined && o.kraPin !== null && o.kraPin !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Z][0-9]{9}[A-Z]$/, {
        message: 'Invalid KRA PIN format (e.g., A123456789B)',
    }),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "kraPin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "subscriptionPlanCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['monthly', 'annual']),
    __metadata("design:type", String)
], ShopInfoDto.prototype, "billingCycle", void 0);
class AdminInfoDto {
    name;
    email;
    phone;
    password;
}
exports.AdminInfoDto = AdminInfoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Admin name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AdminInfoDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], AdminInfoDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, { message: 'Phone number must be at least 10 digits' }),
    (0, class_validator_1.MaxLength)(15),
    __metadata("design:type", String)
], AdminInfoDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6, { message: 'Password must be at least 6 characters' }),
    __metadata("design:type", String)
], AdminInfoDto.prototype, "password", void 0);
class RegisterShopDto {
    shop;
    admin;
}
exports.RegisterShopDto = RegisterShopDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ShopInfoDto),
    __metadata("design:type", ShopInfoDto)
], RegisterShopDto.prototype, "shop", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdminInfoDto),
    __metadata("design:type", AdminInfoDto)
], RegisterShopDto.prototype, "admin", void 0);
//# sourceMappingURL=register-shop.dto.js.map