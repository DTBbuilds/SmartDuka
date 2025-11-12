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
exports.ApproveReconciliationDto = exports.InvestigateVarianceDto = exports.GetReconciliationHistoryDto = exports.CreateDailyReconciliationDto = void 0;
const class_validator_1 = require("class-validator");
class CreateDailyReconciliationDto {
    actualCash;
    reconciliationNotes;
}
exports.CreateDailyReconciliationDto = CreateDailyReconciliationDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDailyReconciliationDto.prototype, "actualCash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDailyReconciliationDto.prototype, "reconciliationNotes", void 0);
class GetReconciliationHistoryDto {
    startDate;
    endDate;
    status;
}
exports.GetReconciliationHistoryDto = GetReconciliationHistoryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetReconciliationHistoryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetReconciliationHistoryDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetReconciliationHistoryDto.prototype, "status", void 0);
class InvestigateVarianceDto {
    varianceType;
    investigationNotes;
}
exports.InvestigateVarianceDto = InvestigateVarianceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvestigateVarianceDto.prototype, "varianceType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvestigateVarianceDto.prototype, "investigationNotes", void 0);
class ApproveReconciliationDto {
    notes;
}
exports.ApproveReconciliationDto = ApproveReconciliationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveReconciliationDto.prototype, "notes", void 0);
//# sourceMappingURL=reconciliation.dto.js.map