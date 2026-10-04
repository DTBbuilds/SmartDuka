import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InitiateStkDto } from './dto/initiate-stk.dto';
import {
  DarajaService,
  StkPushRequest,
  StkPushResponse,
} from './daraja.service';
import { OrderPaymentAuthorityService } from './services/order-payment-authority.service';

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

  constructor(
    private darajaService: DarajaService,
    private readonly orderPaymentAuthority: OrderPaymentAuthorityService,
  ) {}

  async initiateStkPush(
    shopId: string,
    dto: InitiateStkDto,
  ): Promise<StkResponse> {
    // P0-10C/D: ORDER AUTHORITY — resolve the order by {dto.orderId,
    // authenticated shopId}, reject void/voiding/non-payable orders, and
    // atomically claim the pending M-Pesa allocation BEFORE the provider
    // call (void interlock). Amount and account reference are derived from
    // the order — the client-supplied values are never charged/trusted.
    const claim = await this.orderPaymentAuthority.claimExternalPaymentIntent(
      shopId,
      dto.orderId,
      'mpesa',
      { expectedAmount: dto.amount, amountUnit: 'major' },
    );

    if (!claim.claimed) {
      // An earlier initiation is still unresolved — NEVER send a second STK
      // push. The caller must query the existing attempt's status.
      throw new ConflictException(
        'An M-Pesa payment is already awaiting settlement for this order. Check its status instead of retrying.',
      );
    }

    try {
      const request: StkPushRequest = {
        phoneNumber: dto.phoneNumber,
        amount: claim.amount,
        accountReference: claim.orderNumber.slice(0, 12) || 'Order',
        transactionDesc:
          dto.transactionDesc || `Payment for ${claim.orderNumber}`,
        callbackUrl:
          process.env.MPESA_CALLBACK_URL ||
          'https://your-domain.com/payments/callback',
      };

      const response: StkPushResponse =
        await this.darajaService.initiateStkPush(request);

      if (response.ResponseCode && response.ResponseCode !== '0') {
        // Definitive provider rejection → release the claim to terminal
        // 'failed' so the order becomes voidable/retryable.
        await this.orderPaymentAuthority.markIntentFailed(
          shopId,
          dto.orderId,
          'mpesa',
        );
      }

      return {
        requestId: response.MerchantRequestID,
        responseCode: response.ResponseCode,
        responseDescription: response.ResponseDescription,
        customerMessage: response.CustomerMessage,
      };
    } catch (error: any) {
      // Ambiguous (network/timeout — request may have reached Daraja):
      // retain the unresolved intent; void stays blocked, no second push.
      this.logger.error('STK Push failed', error?.message);
      throw error;
    }
  }

  async handleCallback(
    payload: CallbackPayload,
  ): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      const { stkCallback } = payload.Body;
      const {
        ResultCode,
        CheckoutRequestID,
        MerchantRequestID,
        ResultDesc,
        CallbackMetadata,
      } = stkCallback;

      if (ResultCode === 0) {
        // Payment successful - extract amount and phone from CallbackMetadata
        let amount = 0;
        let mpesaReceiptNumber = '';

        if (CallbackMetadata?.Item) {
          const items = CallbackMetadata.Item;
          const amountItem = items.find((item) => item.Name === 'Amount');
          const receiptItem = items.find(
            (item) => item.Name === 'MpesaReceiptNumber',
          );
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
    return this.darajaService.queryStkStatus(
      checkoutRequestId,
      merchantRequestId,
    );
  }
}
