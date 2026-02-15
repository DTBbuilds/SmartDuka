import { Injectable, Logger } from '@nestjs/common';
import { InitiateStkDto } from './dto/initiate-stk.dto';
import { DarajaService, StkPushRequest, StkPushResponse } from './daraja.service';

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
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private darajaService: DarajaService) {}

  async initiateStkPush(dto: InitiateStkDto): Promise<StkResponse> {
    try {
      const request: StkPushRequest = {
        phoneNumber: dto.phoneNumber,
        amount: dto.amount,
        accountReference: dto.accountReference || 'Order',
        transactionDesc: dto.transactionDesc || 'Payment for order',
        callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/payments/callback',
      };

      const response: StkPushResponse = await this.darajaService.initiateStkPush(request);

      return {
        requestId: response.MerchantRequestID,
        responseCode: response.ResponseCode,
        responseDescription: response.ResponseDescription,
        customerMessage: response.CustomerMessage,
      };
    } catch (error: any) {
      this.logger.error('STK Push failed', error?.message);
      throw error;
    }
  }

  async handleCallback(payload: CallbackPayload): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      const { stkCallback } = payload.Body;
      const { ResultCode, CheckoutRequestID, MerchantRequestID, ResultDesc, CallbackMetadata } = stkCallback;

      if (ResultCode === 0) {
        // Payment successful - extract amount and phone from CallbackMetadata
        let amount = 0;
        let mpesaReceiptNumber = '';

        if (CallbackMetadata?.Item) {
          const items = CallbackMetadata.Item;
          const amountItem = items.find((item) => item.Name === 'Amount');
          const receiptItem = items.find((item) => item.Name === 'MpesaReceiptNumber');
          const phoneItem = items.find((item) => item.Name === 'PhoneNumber');

          if (amountItem) amount = Number(amountItem.Value);
          if (receiptItem) mpesaReceiptNumber = String(receiptItem.Value);
        }

        this.logger.log(
          `Payment successful for checkout: ${CheckoutRequestID}, amount: ${amount}, receipt: ${mpesaReceiptNumber}`,
        );

        // TODO: Update Order with payment record
        // await this.ordersService.recordPayment(CheckoutRequestID, {
        //   mpesaReceiptNumber,
        //   amount,
        //   status: 'completed',
        // });

        return { ResultCode: 0, ResultDesc: 'Callback received successfully' };
      } else {
        // Payment failed or cancelled
        this.logger.warn(
          `Payment failed for checkout: ${CheckoutRequestID}, code: ${ResultCode}, desc: ${ResultDesc}`,
        );

        // TODO: Update Order payment status to failed
        // await this.ordersService.recordPayment(CheckoutRequestID, {
        //   status: 'failed',
        //   resultCode: ResultCode,
        //   resultDesc: ResultDesc,
        // });

        return { ResultCode: 0, ResultDesc: 'Callback received successfully' };
      }
    } catch (error: any) {
      this.logger.error('Callback processing failed', error?.message);
      // Always return success to M-Pesa to prevent retries
      return { ResultCode: 0, ResultDesc: 'Callback received' };
    }
  }

  async queryStkStatus(checkoutRequestId: string, merchantRequestId: string) {
    return this.darajaService.queryStkStatus(checkoutRequestId, merchantRequestId);
  }
}
