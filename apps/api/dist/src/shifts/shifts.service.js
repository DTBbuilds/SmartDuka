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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shift_schema_1 = require("./schemas/shift.schema");
let ShiftsService = class ShiftsService {
    shiftModel;
    constructor(shiftModel) {
        this.shiftModel = shiftModel;
    }
    async clockIn(shopId, cashierId, cashierName, openingBalance) {
        const existingShift = await this.shiftModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            cashierId: new mongoose_2.Types.ObjectId(cashierId),
            status: 'open',
        });
        if (existingShift) {
            throw new common_1.BadRequestException('Cashier already has an open shift');
        }
        const shift = new this.shiftModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            cashierId: new mongoose_2.Types.ObjectId(cashierId),
            cashierName,
            startTime: new Date(),
            openingBalance,
            status: 'open',
        });
        return shift.save();
    }
    async clockOut(shiftId, shopId) {
        const shift = await this.shiftModel.findOne({
            _id: new mongoose_2.Types.ObjectId(shiftId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (shift.status !== 'open') {
            throw new common_1.BadRequestException('Shift is not open');
        }
        shift.endTime = new Date();
        shift.status = 'closed';
        return shift.save();
    }
    async getCurrentShift(shopId, cashierId) {
        return this.shiftModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            cashierId: new mongoose_2.Types.ObjectId(cashierId),
            status: 'open',
        });
    }
    async getShiftById(shiftId, shopId) {
        return this.shiftModel.findOne({
            _id: new mongoose_2.Types.ObjectId(shiftId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
    }
    async reconcileShift(shiftId, shopId, actualCash, reconciliedBy, notes) {
        const shift = await this.shiftModel.findOne({
            _id: new mongoose_2.Types.ObjectId(shiftId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (shift.status !== 'closed') {
            throw new common_1.BadRequestException('Shift must be closed before reconciliation');
        }
        const expectedCash = shift.openingBalance;
        const variance = actualCash - expectedCash;
        shift.actualCash = actualCash;
        shift.expectedCash = expectedCash;
        shift.variance = variance;
        shift.status = 'reconciled';
        shift.reconciliedBy = new mongoose_2.Types.ObjectId(reconciliedBy);
        shift.reconciliedAt = new Date();
        shift.notes = notes;
        return shift.save();
    }
    async getShiftHistory(shopId, cashierId, limit = 10) {
        const query = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
        };
        if (cashierId) {
            query.cashierId = new mongoose_2.Types.ObjectId(cashierId);
        }
        return this.shiftModel
            .find(query)
            .sort({ startTime: -1 })
            .limit(limit)
            .exec();
    }
    async getShiftsByStatus(shopId, status) {
        return this.shiftModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status,
        })
            .sort({ startTime: -1 })
            .exec();
    }
    async getShiftDuration(shift) {
        if (!shift.endTime) {
            return Date.now() - new Date(shift.startTime).getTime();
        }
        return new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
    }
    async formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map