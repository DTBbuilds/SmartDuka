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
var SuppliersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const supplier_schema_1 = require("./supplier.schema");
let SuppliersService = SuppliersService_1 = class SuppliersService {
    supplierModel;
    logger = new common_1.Logger(SuppliersService_1.name);
    constructor(supplierModel) {
        this.supplierModel = supplierModel;
    }
    async create(shopId, dto) {
        const supplier = new this.supplierModel({
            ...dto,
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        });
        return supplier.save();
    }
    async findAll(shopId) {
        return this.supplierModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ name: 1 })
            .exec();
    }
    async findById(supplierId, shopId) {
        return this.supplierModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(supplierId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
    }
    async update(supplierId, shopId, dto) {
        return this.supplierModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(supplierId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }, { ...dto, updatedAt: new Date() }, { new: true })
            .exec();
    }
    async delete(supplierId, shopId) {
        const result = await this.supplierModel
            .deleteOne({
            _id: new mongoose_2.Types.ObjectId(supplierId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
        return result.deletedCount > 0;
    }
    async getActive(shopId) {
        return this.supplierModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        })
            .sort({ name: 1 })
            .exec();
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = SuppliersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(supplier_schema_1.Supplier.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map