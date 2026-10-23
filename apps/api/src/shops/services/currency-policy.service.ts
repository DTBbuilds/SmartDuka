import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../../sales/schemas/order.schema';
import { PaymentTransaction } from '../../payments/schemas/payment-transaction.schema';
import { Purchase } from '../../purchases/purchase.schema';
import { Shift } from '../../shifts/schemas/shift.schema';

export interface CurrencyActivityEvidence {
  orders: boolean;
  paymentTransactions: boolean;
  purchases: boolean;
  shifts: boolean;
}

export interface CurrencyActivityStatus {
  hasActivity: boolean;
  evidence: CurrencyActivityEvidence;
}

/**
 * QUALITY-CORE1 P1-B — BASE-CURRENCY IMMUTABILITY POLICY
 *
 * Rule:
 *   - The base currency is chosen at shop creation.
 *   - It may be changed through normal interfaces ONLY while the shop has no
 *     currency-denominated financial records.
 *   - Once financial records exist, the base currency is immutable through
 *     normal APIs — no role (including super_admin) may override it, because
 *     every persisted amount (orders, payments, purchases, shift cash) would
 *     silently change meaning. A shop that must operate in another currency
 *     creates a new shop; existing records and reports stay unchanged.
 *
 * Why the evidence set is broad (the task explicitly rejects a
 * "completed sales > 0" check):
 *   - orders: ANY order record (pending included — payment allocations and
 *     totals are already denominated; void included — the record remains and
 *     reports may reference it).
 *   - paymentTransactions: any settlement/reversal/failed record.
 *   - purchases: supplier bills and stock costs are denominated.
 *   - shifts: only shifts that carry money facts (opening float, sales,
 *     transaction counts) — a bare opened shift is operational, not financial.
 *
 * No automatic historical currency conversion is performed, now or ever.
 */
@Injectable()
export class CurrencyPolicyService {
  private readonly logger = new Logger(CurrencyPolicyService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<any>,
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTransactionModel: Model<any>,
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<any>,
    @InjectModel(Shift.name) private readonly shiftModel: Model<any>,
  ) {}

  async getCurrencyActivityStatus(
    shopId: string,
  ): Promise<CurrencyActivityStatus> {
    const shopObjectId = new Types.ObjectId(shopId);

    const [orders, paymentTransactions, purchases, shifts] = await Promise.all([
      this.orderModel.exists({ shopId: shopObjectId }),
      this.paymentTransactionModel.exists({ shopId: shopObjectId }),
      this.purchaseModel.exists({ shopId: shopObjectId }),
      // Only shifts that actually carry currency-denominated money facts.
      this.shiftModel.exists({
        shopId: shopObjectId,
        $or: [
          { openingBalance: { $gt: 0 } },
          { totalSales: { $gt: 0 } },
          { transactionCount: { $gt: 0 } },
        ],
      }),
    ]);

    const evidence: CurrencyActivityEvidence = {
      orders: !!orders,
      paymentTransactions: !!paymentTransactions,
      purchases: !!purchases,
      shifts: !!shifts,
    };

    return {
      hasActivity: Object.values(evidence).some(Boolean),
      evidence,
    };
  }

  /**
   * Guard for currency CHANGES. Same-currency writes are always allowed (they
   * are not a change). A change is allowed only before financial activity.
   */
  async assertCurrencyChangeAllowed(
    shopId: string,
    currentCurrency: string | undefined,
    requestedCurrency: string | undefined,
  ): Promise<void> {
    if (
      requestedCurrency === undefined ||
      !currentCurrency ||
      requestedCurrency === currentCurrency
    ) {
      return;
    }

    const status = await this.getCurrencyActivityStatus(shopId);
    if (!status.hasActivity) return;

    this.logger.warn(
      `Currency change blocked for shop ${shopId}: ${currentCurrency} → ${requestedCurrency} (financial records exist)`,
    );
    throw new BadRequestException(
      'The shop currency can no longer be changed because financial records ' +
        `(orders, payments, purchases or cash shifts) already exist in ${currentCurrency}. ` +
        'Changing it would silently change the meaning of every recorded amount. ' +
        'To operate in another currency, create a new shop — existing records and reports stay unchanged.',
    );
  }
}
