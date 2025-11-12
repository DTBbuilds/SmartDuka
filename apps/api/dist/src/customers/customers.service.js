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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const customer_schema_1 = require("./schemas/customer.schema");
let CustomersService = class CustomersService {
    customerModel;
    constructor(customerModel) {
        this.customerModel = customerModel;
    }
    async create(dto) {
        const customer = new this.customerModel(dto);
        return customer.save();
    }
    async findAll(shopId) {
        return this.customerModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findById(id) {
        return this.customerModel.findById(id).exec();
    }
    async findByPhone(shopId, phone) {
        return this.customerModel
            .findOne({ shopId: new mongoose_2.Types.ObjectId(shopId), phone })
            .exec();
    }
    async search(shopId, query) {
        return this.customerModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            $or: [
                { phone: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        })
            .limit(10)
            .exec();
    }
    async update(id, dto) {
        return this.customerModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
    }
    async delete(id) {
        return this.customerModel.findByIdAndDelete(id).exec();
    }
    async updatePurchaseStats(id, amount) {
        const customer = await this.customerModel
            .findByIdAndUpdate(id, {
            $inc: { totalPurchases: 1, totalSpent: amount },
            $set: { lastPurchaseDate: new Date(), lastVisit: new Date() },
        }, { new: true })
            .exec();
        if (customer) {
            await this.updateSegment(id);
        }
        return customer;
    }
    async updateSegment(customerId) {
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer)
            return null;
        let segment = 'regular';
        if (customer.totalSpent > 50000) {
            segment = 'vip';
        }
        else if (customer.totalSpent < 10000 ||
            (customer.lastPurchaseDate &&
                new Date().getTime() - customer.lastPurchaseDate.getTime() >
                    90 * 24 * 60 * 60 * 1000)) {
            segment = 'inactive';
        }
        return this.customerModel
            .findByIdAndUpdate(customerId, { segment }, { new: true })
            .exec();
    }
    async getCustomerInsights(customerId) {
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer)
            return null;
        return {
            totalSpent: customer.totalSpent,
            purchaseCount: customer.totalPurchases,
            avgOrderValue: customer.totalPurchases > 0
                ? customer.totalSpent / customer.totalPurchases
                : 0,
            lastVisit: customer.lastVisit || customer.lastPurchaseDate || null,
            segment: customer.segment || 'regular',
        };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CustomersService);
//# sourceMappingURL=customers.service.js.map