"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DarajaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DarajaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let DarajaService = DarajaService_1 = class DarajaService {
    configService;
    logger = new common_1.Logger(DarajaService_1.name);
    client;
    config;
    accessToken = '';
    tokenExpiry = 0;
    constructor(configService) {
        this.configService = configService;
        this.config = {
            consumerKey: this.configService.get('MPESA_CONSUMER_KEY', ''),
            consumerSecret: this.configService.get('MPESA_CONSUMER_SECRET', ''),
            shortCode: this.configService.get('MPESA_SHORTCODE', '174379'),
            passKey: this.configService.get('MPESA_PASSKEY', ''),
            environment: this.configService.get('MPESA_ENV', 'sandbox') || 'sandbox',
        };
        this.client = axios_1.default.create({
            baseURL: this.getBaseUrl(),
            timeout: 30000,
        });
    }
    getBaseUrl() {
        return this.config.environment === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        try {
            const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
            const response = await axios_1.default.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            });
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + 3500 * 1000;
            return this.accessToken;
        }
        catch (error) {
            this.logger.error('Failed to get access token', error?.message);
            throw new Error('Failed to authenticate with M-Pesa');
        }
    }
    async initiateStkPush(request) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword(timestamp);
            const payload = {
                BusinessShortCode: this.config.shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(request.amount),
                PartyA: this.formatPhoneNumber(request.phoneNumber),
                PartyB: this.config.shortCode,
                PhoneNumber: this.formatPhoneNumber(request.phoneNumber),
                CallBackURL: request.callbackUrl,
                AccountReference: request.accountReference,
                TransactionDesc: request.transactionDesc,
            };
            const response = await this.client.post('/mpesa/stkpush/v1/processrequest', payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            this.logger.log(`STK Push initiated: ${response.data.CheckoutRequestID}`);
            return {
                MerchantRequestID: response.data.MerchantRequestID,
                CheckoutRequestID: response.data.CheckoutRequestID,
                ResponseCode: response.data.ResponseCode,
                ResponseDescription: response.data.ResponseDescription,
                CustomerMessage: response.data.CustomerMessage,
            };
        }
        catch (error) {
            this.logger.error('STK Push failed', error?.response?.data || error?.message);
            throw new Error(error?.response?.data?.errorMessage ||
                error?.message ||
                'Failed to initiate STK push');
        }
    }
    async queryStkStatus(checkoutRequestId, merchantRequestId) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword(timestamp);
            const payload = {
                BusinessShortCode: this.config.shortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId,
            };
            const response = await this.client.post('/mpesa/stkpushquery/v1/query', payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const resultCode = response.data.ResultCode || 0;
            const status = resultCode === 0 ? 'completed' : 'failed';
            return {
                status,
                resultCode,
                resultDesc: response.data.ResultDesc,
            };
        }
        catch (error) {
            this.logger.error('STK Query failed', error?.response?.data || error?.message);
            throw new Error(error?.response?.data?.errorMessage ||
                error?.message ||
                'Failed to query STK status');
        }
    }
    async reverseTransaction(receiptNumber, amount, reason) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const payload = {
                Initiator: 'testapi',
                SecurityCredential: 'test',
                CommandID: 'TransactionReversal',
                TransactionID: receiptNumber,
                Amount: Math.round(amount),
                ReceiverParty: this.config.shortCode,
                RecieverIdentifierType: '4',
                ResultURL: process.env.MPESA_RESULT_URL || 'https://your-domain.com/payments/reversal-result',
                QueueTimeOutURL: process.env.MPESA_TIMEOUT_URL || 'https://your-domain.com/payments/reversal-timeout',
                Remarks: reason,
            };
            const response = await this.client.post('/mpesa/reversal/v1/submit', payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            this.logger.log(`Transaction reversal initiated: ${receiptNumber}`);
            return {
                reversalId: response.data.ConversationID || '',
                status: response.data.ResponseCode === '0' ? 'pending' : 'failed',
            };
        }
        catch (error) {
            this.logger.error('Transaction reversal failed', error?.response?.data || error?.message);
            throw new Error(error?.response?.data?.errorMessage ||
                error?.message ||
                'Failed to reverse transaction');
        }
    }
    validateCallback(signature, body) {
        try {
            const hash = crypto
                .createHmac('sha256', this.config.passKey)
                .update(body)
                .digest('base64');
            return hash === signature;
        }
        catch (error) {
            this.logger.error('Callback validation failed', error);
            return false;
        }
    }
    getTimestamp() {
        return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    }
    generatePassword(timestamp) {
        const data = `${this.config.shortCode}${this.config.passKey}${timestamp}`;
        return Buffer.from(data).toString('base64');
    }
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        }
        if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        return cleaned;
    }
};
exports.DarajaService = DarajaService;
exports.DarajaService = DarajaService = DarajaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DarajaService);
//# sourceMappingURL=daraja.service.js.map