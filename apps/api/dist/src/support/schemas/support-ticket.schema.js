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
exports.SupportTicketSchema = exports.SupportTicket = exports.SupportTicketMessage = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SupportTicketMessage = class SupportTicketMessage {
    sender;
    message;
    createdAt;
};
exports.SupportTicketMessage = SupportTicketMessage;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SupportTicketMessage.prototype, "sender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SupportTicketMessage.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], SupportTicketMessage.prototype, "createdAt", void 0);
exports.SupportTicketMessage = SupportTicketMessage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SupportTicketMessage);
let SupportTicket = class SupportTicket {
    shopId;
    createdBy;
    subject;
    description;
    status;
    priority;
    assignedTo;
    messages;
    resolvedAt;
    resolutionNotes;
    createdAt;
    updatedAt;
};
exports.SupportTicket = SupportTicket;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SupportTicket.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SupportTicket.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "subject", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "priority", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SupportTicket.prototype, "assignedTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], SupportTicket.prototype, "messages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "resolvedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "resolutionNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "updatedAt", void 0);
exports.SupportTicket = SupportTicket = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SupportTicket);
exports.SupportTicketSchema = mongoose_1.SchemaFactory.createForClass(SupportTicket);
exports.SupportTicketSchema.index({ shopId: 1 });
exports.SupportTicketSchema.index({ status: 1 });
exports.SupportTicketSchema.index({ priority: 1 });
exports.SupportTicketSchema.index({ createdAt: -1 });
exports.SupportTicketSchema.index({ assignedTo: 1 });
//# sourceMappingURL=support-ticket.schema.js.map