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
var SupportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const support_ticket_schema_1 = require("./schemas/support-ticket.schema");
let SupportService = SupportService_1 = class SupportService {
    ticketModel;
    logger = new common_1.Logger(SupportService_1.name);
    constructor(ticketModel) {
        this.ticketModel = ticketModel;
    }
    async createTicket(dto) {
        try {
            const ticket = new this.ticketModel({
                shopId: new mongoose_2.Types.ObjectId(dto.shopId),
                createdBy: new mongoose_2.Types.ObjectId(dto.createdBy),
                subject: dto.subject,
                description: dto.description,
                priority: dto.priority || 'medium',
                status: 'open',
                messages: [
                    {
                        sender: new mongoose_2.Types.ObjectId(dto.createdBy),
                        message: dto.description,
                        createdAt: new Date(),
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return await ticket.save();
        }
        catch (error) {
            this.logger.error(`Failed to create support ticket: ${error.message}`);
            throw error;
        }
    }
    async getTickets(filters, limit = 50, skip = 0) {
        const query = {};
        if (filters?.shopId) {
            query.shopId = new mongoose_2.Types.ObjectId(filters.shopId);
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.priority) {
            query.priority = filters.priority;
        }
        if (filters?.assignedTo) {
            query.assignedTo = new mongoose_2.Types.ObjectId(filters.assignedTo);
        }
        return this.ticketModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async getTicketById(ticketId) {
        const ticket = await this.ticketModel.findById(new mongoose_2.Types.ObjectId(ticketId)).exec();
        if (!ticket) {
            throw new common_1.NotFoundException('Support ticket not found');
        }
        return ticket;
    }
    async getShopTickets(shopId, limit = 50, skip = 0) {
        return this.ticketModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async addMessage(ticketId, dto) {
        const ticket = await this.getTicketById(ticketId);
        const updatedTicket = await this.ticketModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(ticketId), {
            $push: {
                messages: {
                    sender: new mongoose_2.Types.ObjectId(dto.sender),
                    message: dto.message,
                    createdAt: new Date(),
                },
            },
            updatedAt: new Date(),
        }, { new: true })
            .exec();
        this.logger.log(`Message added to ticket ${ticketId}`);
        if (!updatedTicket) {
            throw new common_1.NotFoundException('Support ticket not found after update');
        }
        return updatedTicket;
    }
    async updateStatus(ticketId, status, resolutionNotes) {
        const ticket = await this.getTicketById(ticketId);
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        if (status === 'resolved' || status === 'closed') {
            updateData.resolvedAt = new Date();
            if (resolutionNotes) {
                updateData.resolutionNotes = resolutionNotes;
            }
        }
        const updatedTicket = await this.ticketModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(ticketId), updateData, { new: true })
            .exec();
        this.logger.log(`Ticket ${ticketId} status updated to ${status}`);
        if (!updatedTicket) {
            throw new common_1.NotFoundException('Support ticket not found after update');
        }
        return updatedTicket;
    }
    async assignTicket(ticketId, assignedTo) {
        const ticket = await this.getTicketById(ticketId);
        const updatedTicket = await this.ticketModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(ticketId), {
            assignedTo: new mongoose_2.Types.ObjectId(assignedTo),
            status: 'in-progress',
            updatedAt: new Date(),
        }, { new: true })
            .exec();
        this.logger.log(`Ticket ${ticketId} assigned to ${assignedTo}`);
        if (!updatedTicket) {
            throw new common_1.NotFoundException('Support ticket not found after update');
        }
        return updatedTicket;
    }
    async getOpenTicketsCount() {
        return this.ticketModel.countDocuments({ status: 'open' });
    }
    async getShopOpenTicketsCount(shopId) {
        return this.ticketModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'open',
        });
    }
    async getAssignedTicketsCount(assignedTo) {
        return this.ticketModel.countDocuments({
            assignedTo: new mongoose_2.Types.ObjectId(assignedTo),
            status: { $in: ['open', 'in-progress'] },
        });
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = SupportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(support_ticket_schema_1.SupportTicket.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SupportService);
//# sourceMappingURL=support.service.js.map