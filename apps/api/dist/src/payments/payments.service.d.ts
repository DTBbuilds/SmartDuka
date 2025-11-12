import { InitiateStkDto } from './dto/initiate-stk.dto';
import { DarajaService } from './daraja.service';
export type StkResponse = {
    requestId: string;
    responseCode: string;
    responseDescription: string;
    customerMessage: string;
};
export type CallbackPayload = {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: Array<{
                    Name: string;
                    Value: string | number;
                }>;
            };
        };
    };
};
export declare class PaymentsService {
    private darajaService;
    private readonly logger;
    constructor(darajaService: DarajaService);
    initiateStkPush(dto: InitiateStkDto): Promise<StkResponse>;
    handleCallback(payload: CallbackPayload): Promise<{
        ResultCode: number;
        ResultDesc: string;
    }>;
    queryStkStatus(checkoutRequestId: string, merchantRequestId: string): Promise<{
        status: string;
        resultCode: number;
        resultDesc: string;
    }>;
}
