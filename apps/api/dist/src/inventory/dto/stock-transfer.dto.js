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
exports.GetTransferHistoryDto = exports.RejectStockTransferDto = exports.ApproveStockTransferDto = exports.RequestStockTransferDto = void 0;
const class_validator_1 = require("class-validator");
class RequestStockTransferDto {
    fromLocationId;
    toLocationId;
    productId;
    quantity;
    reason;
    notes;
}
exports.RequestStockTransferDto = RequestStockTransferDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestStockTransferDto.prototype, "fromLocationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestStockTransferDto.prototype, "toLocationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestStockTransferDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RequestStockTransferDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestStockTransferDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestStockTransferDto.prototype, "notes", void 0);
class ApproveStockTransferDto {
    notes;
}
exports.ApproveStockTransferDto = ApproveStockTransferDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveStockTransferDto.prototype, "notes", void 0);
class RejectStockTransferDto {
    reason;
    notes;
}
exports.RejectStockTransferDto = RejectStockTransferDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectStockTransferDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectStockTransferDto.prototype, "notes", void 0);
class GetTransferHistoryDto {
    locationId;
    status;
    startDate;
    endDate;
}
exports.GetTransferHistoryDto = GetTransferHistoryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTransferHistoryDto.prototype, "locationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTransferHistoryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTransferHistoryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTransferHistoryDto.prototype, "endDate", void 0);
//# sourceMappingURL=stock-transfer.dto.js.map