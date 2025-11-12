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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const daraja_service_1 = require("./daraja.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    darajaService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(darajaService) {
        this.darajaService = darajaService;
    }
    async initiateStkPush(dto) {
        try {
            const request = {
                phoneNumber: dto.phoneNumber,
                amount: dto.amount,
                accountReference: dto.accountReference || 'Order',
                transactionDesc: dto.transactionDesc || 'Payment for order',
                callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/payments/callback',
            };
            const response = await this.darajaService.initiateStkPush(request);
            return {
                requestId: response.MerchantRequestID,
                responseCode: response.ResponseCode,
                responseDescription: response.ResponseDescription,
                customerMessage: response.CustomerMessage,
            };
        }
        catch (error) {
            this.logger.error('STK Push failed', error?.message);
            throw error;
        }
    }
    async handleCallback(payload) {
        try {
            const { stkCallback } = payload.Body;
            const { ResultCode, CheckoutRequestID, MerchantRequestID, ResultDesc, CallbackMetadata } = stkCallback;
            if (ResultCode === 0) {
                let amount = 0;
                let mpesaReceiptNumber = '';
                if (CallbackMetadata?.Item) {
                    const items = CallbackMetadata.Item;
                    const amountItem = items.find((item) => item.Name === 'Amount');
                    const receiptItem = items.find((item) => item.Name === 'MpesaReceiptNumber');
                    const phoneItem = items.find((item) => item.Name === 'PhoneNumber');
                    if (amountItem)
                        amount = Number(amountItem.Value);
                    if (receiptItem)
                        mpesaReceiptNumber = String(receiptItem.Value);
                }
                this.logger.log(`Payment successful for checkout: ${CheckoutRequestID}, amount: ${amount}, receipt: ${mpesaReceiptNumber}`);
                return { ResultCode: 0, ResultDesc: 'Callback received successfully' };
            }
            else {
                this.logger.warn(`Payment failed for checkout: ${CheckoutRequestID}, code: ${ResultCode}, desc: ${ResultDesc}`);
                return { ResultCode: 0, ResultDesc: 'Callback received successfully' };
            }
        }
        catch (error) {
            this.logger.error('Callback processing failed', error?.message);
            return { ResultCode: 0, ResultDesc: 'Callback received' };
        }
    }
    async queryStkStatus(checkoutRequestId, merchantRequestId) {
        return this.darajaService.queryStkStatus(checkoutRequestId, merchantRequestId);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [daraja_service_1.DarajaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map