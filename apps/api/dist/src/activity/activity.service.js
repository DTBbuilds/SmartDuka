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
var ActivityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const activity_schema_1 = require("./schemas/activity.schema");
let ActivityService = ActivityService_1 = class ActivityService {
    activityModel;
    logger = new common_1.Logger(ActivityService_1.name);
    constructor(activityModel) {
        this.activityModel = activityModel;
    }
    async logActivity(shopId, userId, userName, userRole, action, details, ipAddress, userAgent) {
        try {
            if (userRole === 'super_admin' || !shopId) {
                return null;
            }
            const activity = new this.activityModel({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                userId: new mongoose_2.Types.ObjectId(userId),
                userName,
                userRole,
                action,
                details: details || {},
                ipAddress,
                userAgent,
                timestamp: new Date(),
            });
            return await activity.save();
        }
        catch (error) {
            this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
            return null;
        }
    }
    async getActivityLog(shopId, branchId, limit = 50, skip = 0) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (branchId) {
            query['details.branchId'] = branchId;
        }
        return this.activityModel
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getShopActivityLog(shopId, limit = 50, skip = 0) {
        return this.activityModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getCashierActivityLog(shopId, cashierId, limit = 50, skip = 0) {
        return this.activityModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(cashierId),
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getShopActivityCount(shopId) {
        return this.activityModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
    }
    async getActivityByAction(shopId, action, limit = 50) {
        return this.activityModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            action,
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .exec();
    }
    async getCashierTransactions(shopId, cashierId, limit = 50) {
        return this.activityModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(cashierId),
            action: 'checkout',
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .exec();
    }
    async getTodayActivity(shopId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.activityModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            timestamp: {
                $gte: today,
                $lt: tomorrow,
            },
        })
            .sort({ timestamp: -1 })
            .exec();
    }
    async getCashierSessions(shopId, cashierId, limit = 50) {
        return this.activityModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(cashierId),
            action: { $in: ['login', 'logout'] },
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .exec();
    }
    async cleanupOldLogs() {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return this.activityModel.deleteMany({
            timestamp: { $lt: ninetyDaysAgo },
        });
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = ActivityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(activity_schema_1.Activity.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ActivityService);
//# sourceMappingURL=activity.service.js.map