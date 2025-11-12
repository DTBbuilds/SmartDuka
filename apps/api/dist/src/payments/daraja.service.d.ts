import { ConfigService } from '@nestjs/config';
export interface DarajaConfig {
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    passKey: string;
    environment: 'sandbox' | 'production';
}
export interface StkPushRequest {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
    callbackUrl: string;
}
export interface StkPushResponse {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
}
export interface MpesaTransaction {
    _id?: string;
    merchantRequestId: string;
    checkoutRequestId: string;
    phoneNumber: string;
    amount: number;
    accountReference: string;
    status: 'pending' | 'completed' | 'failed';
    mpesaReceiptNumber?: string;
    resultCode?: number;
    resultDesc?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DarajaService {
    private configService;
    private readonly logger;
    private client;
    private config;
    private accessToken;
    private tokenExpiry;
    constructor(configService: ConfigService);
    private getBaseUrl;
    private getAccessToken;
    initiateStkPush(request: StkPushRequest): Promise<StkPushResponse>;
    queryStkStatus(checkoutRequestId: string, merchantRequestId: string): Promise<{
        status: string;
        resultCode: number;
        resultDesc: string;
    }>;
    reverseTransaction(receiptNumber: string, amount: number, reason: string): Promise<{
        reversalId: string;
        status: string;
    }>;
    validateCallback(signature: string, body: string): boolean;
    private getTimestamp;
    private generatePassword;
    private formatPhoneNumber;
}
