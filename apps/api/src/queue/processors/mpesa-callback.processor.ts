import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * M-Pesa Callback Queue Processor
 * 
 * Processes M-Pesa callbacks asynchronously to:
 * 1. Prevent blocking the callback endpoint
 * 2. Enable automatic retries on failure
 * 3. Handle high callback volumes
 */
@Processor('mpesa-callbacks')
export class MpesaCallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(MpesaCallbackProcessor.name);

  async process(job: Job<MpesaCallbackJobData>): Promise<MpesaCallbackResult> {
    const { callbackData, shopId, transactionId } = job.data;
    
    this.logger.log(`Processing M-Pesa callback for transaction ${transactionId}`);

    try {
      // The actual processing logic will be injected via the MpesaService
      // This processor just handles the queue mechanics
      
      // Extract callback details
      const { Body } = callbackData;
      const stkCallback = Body?.stkCallback;
      
      if (!stkCallback) {
        throw new Error('Invalid callback structure - missing stkCallback');
      }

      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const merchantRequestId = stkCallback.MerchantRequestID;

      this.logger.log(
        `Callback for ${checkoutRequestId}: ResultCode=${resultCode}, ResultDesc=${resultDesc}`
      );

      // Return the parsed data for the service to handle
      return {
        success: true,
        checkoutRequestId,
        merchantRequestId,
        resultCode,
        resultDesc,
        callbackMetadata: stkCallback.CallbackMetadata,
        processedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to process M-Pesa callback for ${transactionId}: ${error.message}`
      );
      throw error; // Will trigger retry based on job options
    }
  }
}

/**
 * Job data structure for M-Pesa callbacks
 */
export interface MpesaCallbackJobData {
  callbackData: {
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
  shopId: string;
  transactionId: string;
  receivedAt: string;
}

/**
 * Result structure from processing
 */
export interface MpesaCallbackResult {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  callbackMetadata?: any;
  processedAt: string;
}
