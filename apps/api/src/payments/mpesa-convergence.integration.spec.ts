import { Test, TestingModule } from '@nestjs/testing';
import {
  MongooseModule,
  getModelToken,
  getConnectionToken,
} from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { MpesaService } from './services/mpesa.service';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { MpesaReconciliationService } from './services/mpesa-reconciliation.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { OrderPaymentAuthorityService } from './services/order-payment-authority.service';
import { DarajaService } from './daraja.service';
import { MpesaEncryptionService } from './services/mpesa-encryption.service';
import {
  MpesaTransaction,
  MpesaTransactionSchema,
  MpesaTransactionStatus,
} from './schemas/mpesa-transaction.schema';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/payment-transaction.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';

/**
 * MPESA-P0 CONVERGENCE1 — DATABASE-BACKED INTEGRATION SUITE
 *
 * Disposable in-memory MongoDB + mocked Daraja HTTP responses (no real
 * provider traffic, no secrets). Exercises the REAL services, schemas and
 * indexes end-to-end:
 *
 *   initiation (MpesaMultiTenantService.initiateSTKPush)
 *     → callback (MpesaService.processCallback, provider-verified)
 *     → scheduled reconciliation (MpesaReconciliationService, shop
 *       credentials, atomic settlement)
 *     → convergence (PaymentTransactionService → canonical Order)
 *
 * Proven for: successful payment, rejected payment, delayed payment,
 * duplicate callback, forged callback, failed provider lookup, missing
 * receipt, reconciliation retry, pending expiry + post-expiry rescue,
 * double-credit prevention and tenant isolation.
 */
describe('MPESA-P0 CONVERGENCE1 integration (disposable MongoDB)', () => {
  jest.setTimeout(300_000);

  const CASHIER_ID = '507f1f77bcf86cd7994390a2';
  const AMOUNT = 1000;

  let mongo: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;

  // Controllable config store — lets individual tests flip operational
  // switches (e.g. MPESA_PAYMENTS_PAUSED) without rebuilding the module.
  const configValues: Record<string, string> = {
    MPESA_ENV: 'sandbox',
    MPESA_PAYMENTS_PAUSED: 'false',
    MPESA_RECONCILIATION_ENABLED: 'true',
  };

  let shopModel: any;
  let orderModel: any;
  let mpesaTxnModel: any;
  let payTxnModel: any;

  let mpesaService: MpesaService;
  let multiTenant: MpesaMultiTenantService;
  let reconciliation: MpesaReconciliationService;

  // ---- mocked Daraja surface ---------------------------------------------
  let fetchMock: jest.SpyInstance;
  let pushCounter = 0;
  const stagedQueries = new Map<
    string,
    {
      resultCode?: number | string;
      metadata?: Array<{ Name: string; Value?: string | number }>;
      reject?: Error;
    }
  >();
  const oauthCredentialsUsed: string[] = [];

  const jsonRes = (data: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => data,
    }) as Response;

  const stageQuery = (
    crx: string,
    scenario: {
      resultCode?: number | string;
      metadata?: Array<{ Name: string; Value?: string | number }>;
      reject?: Error;
    },
  ) => stagedQueries.set(crx, scenario);

  const successCallback = (
    crx: string,
    receipt = 'SGR51YAB3C',
    amount = AMOUNT,
  ) => ({
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-TEST-1',
        CheckoutRequestID: crx,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: amount },
            { Name: 'MpesaReceiptNumber', Value: receipt },
            { Name: 'Balance' }, // real Daraja sends this with no Value
            { Name: 'TransactionDate', Value: 20260101120000 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
      },
    },
  });

  const failureCallback = (crx: string, code = 1032) => ({
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-TEST-1',
        CheckoutRequestID: crx,
        ResultCode: code,
        ResultDesc: 'Request cancelled by user',
      },
    },
  });

  const receiptMetadata = (receipt = 'SGR51YAB3C', amount = AMOUNT) => [
    { Name: 'Amount', Value: amount },
    { Name: 'MpesaReceiptNumber', Value: receipt },
    { Name: 'TransactionDate', Value: 20260101120000 },
    { Name: 'PhoneNumber', Value: 254712345678 },
  ];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri('smartduka-mpesa-convergence');

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          {
            name: PaymentTransaction.name,
            schema: PaymentTransactionSchema,
          },
          { name: MpesaTransaction.name, schema: MpesaTransactionSchema },
          { name: Shop.name, schema: ShopSchema },
          { name: Order.name, schema: OrderSchema },
        ]),
      ],
      providers: [
        PaymentTransactionService,
        OrderPaymentAuthorityService,
        MpesaMultiTenantService,
        MpesaReconciliationService,
        MpesaService,
        MpesaEncryptionService,
        DarajaService,
        {
          provide: LoyaltyService,
          useValue: {
            earnPoints: jest.fn().mockResolvedValue({}),
            redeemPoints: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: CustomersService,
          useValue: { updatePurchaseStats: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: ConfigService,
          useFactory: () => ({
            get: (key: string, def?: unknown) =>
              key in configValues ? configValues[key] : def,
          }),
        },
      ],
    }).compile();

    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken(), {
      strict: false,
    });
    shopModel = moduleRef.get(getModelToken(Shop.name), { strict: false });
    orderModel = moduleRef.get(getModelToken(Order.name), { strict: false });
    mpesaTxnModel = moduleRef.get(getModelToken(MpesaTransaction.name), {
      strict: false,
    });
    payTxnModel = moduleRef.get(getModelToken(PaymentTransaction.name), {
      strict: false,
    });

    mpesaService = moduleRef.get(MpesaService, { strict: false });
    multiTenant = moduleRef.get(MpesaMultiTenantService, { strict: false });
    reconciliation = moduleRef.get(MpesaReconciliationService, {
      strict: false,
    });

    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: any, init?: any) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(init.body) : {};

        if (url.includes('/oauth/v1/generate')) {
          oauthCredentialsUsed.push(
            Buffer.from(
              (init?.headers?.Authorization || '').replace('Basic ', ''),
              'base64',
            ).toString('utf8'),
          );
          return jsonRes({ access_token: 'test-token', expires_in: '3599' });
        }

        if (url.includes('/mpesa/stkpush/v1/processrequest')) {
          const crx = `ws_CO_TEST_${++pushCounter}`;
          return jsonRes({
            MerchantRequestID: `MR_TEST_${pushCounter}`,
            CheckoutRequestID: crx,
            ResponseCode: '0',
            ResponseDescription: 'Success. Request accepted for processing',
            CustomerMessage: 'ok',
          });
        }

        if (url.includes('/mpesa/stkpushquery/v1/query')) {
          const scenario = stagedQueries.get(body.CheckoutRequestID) ?? {};
          if (scenario.reject) throw scenario.reject;
          const code = scenario.resultCode;
          return jsonRes({
            ...(code !== undefined ? { ResultCode: code } : {}),
            ResultDesc:
              Number(code) === 0
                ? 'The service request is processed successfully.'
                : 'Request cancelled by user',
            ...(scenario.metadata
              ? { CallbackMetadata: { Item: scenario.metadata } }
              : {}),
          });
        }

        throw new Error(`Unexpected fetch in test: ${url}`);
      });
  });

  afterAll(async () => {
    fetchMock?.mockRestore();
    await connection?.close();
    await mongo?.stop();
    await moduleRef?.close();
  });

  beforeEach(async () => {
    stagedQueries.clear();
    oauthCredentialsUsed.length = 0;
    await Promise.all([
      mpesaTxnModel.deleteMany({}),
      payTxnModel.deleteMany({}),
      orderModel.deleteMany({}),
      shopModel.deleteMany({}),
    ]);
  });

  // ---- fixture helpers ----------------------------------------------------

  async function createShopWithMpesa(suffix: string): Promise<any> {
    return shopModel.create({
      name: `Shop ${suffix}`,
      email: `shop-${suffix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}@test.ke`,
      phone: `+25470000${suffix}`,
      shopId: `SHP-TEST-${suffix}-${Date.now()}`,
      city: 'Nairobi',
      businessType: 'retail',
      mpesaConfig: {
        type: 'paybill',
        shortCode: '174379',
        // Plaintext credentials (no IV/tag) — the encryption service passes
        // them through when no key is configured, keeping the real code path.
        consumerKey: `key-${suffix}`,
        consumerSecret: `secret-${suffix}`,
        passkey: `passkey-${suffix}`,
        enabled: true,
        verificationStatus: 'verified',
      },
    });
  }

  async function createPendingOrder(shopId: any, suffix: string): Promise<any> {
    return orderModel.create({
      shopId,
      userId: new Types.ObjectId(CASHIER_ID),
      orderNumber: `STK-CONV1-${suffix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      items: [],
      subtotal: AMOUNT,
      tax: 0,
      total: AMOUNT,
      status: 'pending',
      paymentStatus: 'unpaid',
      payments: [
        {
          method: 'mpesa',
          amount: AMOUNT,
          status: 'pending',
          initiatedAt: new Date(),
        },
      ],
    });
  }

  async function initiateFor(shop: any, order: any) {
    const result = await multiTenant.initiateSTKPush({
      shopId: shop._id.toString(),
      phoneNumber: '254712345678',
      amount: AMOUNT,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      cashierId: CASHIER_ID,
      cashierName: 'Alice',
    });
    expect(result.success).toBe(true);
    expect(result.checkoutRequestId).toBeTruthy();
    return result;
  }

  async function backdateStkPush(transactionId: any, msAgo = 60_000) {
    await mpesaTxnModel.updateOne(
      { _id: transactionId },
      { $set: { stkPushSentAt: new Date(Date.now() - msAgo) } },
    );
  }

  const reloadTxn = async (id: any) => mpesaTxnModel.findById(id).exec();
  const reloadOrder = async (id: any) => orderModel.findById(id).exec();
  void reloadTxn;
  const paymentRecords = (crx: string) =>
    payTxnModel.find({ mpesaTransactionId: crx }).exec();

  // ---- tests --------------------------------------------------------------

  it('initiation persists a resolvable transaction record (root-cause regression: uppercase PENDING enum save)', async () => {
    const shop = await createShopWithMpesa('A');
    const order = await createPendingOrder(shop._id, 'A');

    const result = await initiateFor(shop, order);

    const txn = await mpesaTxnModel
      .findOne({ checkoutRequestId: result.checkoutRequestId })
      .exec();
    expect(txn).toBeTruthy();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(txn.shopId.toString()).toBe(shop._id.toString());
    expect(txn.orderId.toString()).toBe(order._id.toString());
    expect(txn.cashierId.toString()).toBe(CASHIER_ID);
    expect(txn.amount).toBe(AMOUNT);
    expect(txn.stkPushSentAt).toBeTruthy();
    expect(txn.expiresAt).toBeTruthy();
  });

  it('callback-driven success converges transaction + payment record + order with correct merchant/cashier attribution', async () => {
    const shop = await createShopWithMpesa('B');
    const order = await createPendingOrder(shop._id, 'B');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata() });

    const ack = await mpesaService.processCallback(successCallback(crx));
    expect(ack.ResultCode).toBe(0);

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(txn.mpesaReceiptNumber).toBe('SGR51YAB3C');

    const [payment] = await paymentRecords(crx);
    expect(payment).toBeTruthy();
    expect(payment.shopId.toString()).toBe(shop._id.toString());
    expect(payment.orderId.toString()).toBe(order._id.toString());
    expect(payment.cashierId.toString()).toBe(CASHIER_ID);
    expect(payment.cashierName).toBe('Alice');
    expect(payment.paymentMethod).toBe('mpesa');
    expect(payment.amount).toBe(AMOUNT);
    expect(payment.status).toBe('completed');
    expect(payment.mpesaReceiptNumber).toBe('SGR51YAB3C');

    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
    expect(reloaded.status).toBe('completed');
    expect(reloaded.payments[0].status).toBe('completed');
    expect(reloaded.payments[0].mpesaReceiptNumber).toBe('SGR51YAB3C');
  });

  it('duplicate callback is idempotent — the same financial transaction cannot be credited twice', async () => {
    const shop = await createShopWithMpesa('C');
    const order = await createPendingOrder(shop._id, 'C');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata() });

    await mpesaService.processCallback(successCallback(crx));
    const secondAck = await mpesaService.processCallback(successCallback(crx));
    expect(secondAck.ResultDesc).toBe('Already processed');

    const records = await paymentRecords(crx);
    expect(records).toHaveLength(1);

    const reloaded = await reloadOrder(order._id);
    expect(reloaded.status).toBe('completed');
    expect(reloaded.payments).toHaveLength(1);
  });

  it('forged success callback is rejected by provider verification — no credit, intent released', async () => {
    const shop = await createShopWithMpesa('D');
    const order = await createPendingOrder(shop._id, 'D');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 1032 });

    const ack = await mpesaService.processCallback(successCallback(crx));
    expect(ack.ResultCode).toBe(0);

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.FAILED);
    expect(txn.errorCategory).toBe('callback_verification_failed');

    expect(await paymentRecords(crx)).toHaveLength(0);

    const reloaded = await reloadOrder(order._id);
    expect(reloaded.status).toBe('pending');
    expect(reloaded.paymentStatus).toBe('unpaid');
    expect(reloaded.payments[0].status).toBe('failed');
  });

  it('callback for an unknown CheckoutRequestID is acknowledged without any state change', async () => {
    const shop = await createShopWithMpesa('E');
    await createPendingOrder(shop._id, 'E');

    const ack = await mpesaService.processCallback(
      successCallback('ws_CO_UNKNOWN'),
    );
    expect(ack.ResultCode).toBe(0);
    expect(await mpesaTxnModel.countDocuments({})).toBe(0);
    expect(await payTxnModel.countDocuments({})).toBe(0);
  });

  it('rejected payment (provider-confirmed failure callback) settles FAILED and releases the order intent', async () => {
    const shop = await createShopWithMpesa('F');
    const order = await createPendingOrder(shop._id, 'F');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 1032 });

    await mpesaService.processCallback(failureCallback(crx, 1032));

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.FAILED);
    expect(txn.mpesaResultCode).toBe(1032);
    expect(await paymentRecords(crx)).toHaveLength(0);

    const reloaded = await reloadOrder(order._id);
    expect(reloaded.payments[0].status).toBe('failed');
    expect(reloaded.status).toBe('pending');
  });

  it('delayed payment: unverified success claim stays pending, scheduled reconciliation settles it later', async () => {
    const shop = await createShopWithMpesa('G');
    const order = await createPendingOrder(shop._id, 'G');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    // Provider still deciding when the callback arrives (DS timeout verdict)
    stageQuery(crx, { resultCode: 1037 });
    await mpesaService.processCallback(successCallback(crx));

    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(txn.errorCategory).toBe('callback_unverified');
    expect(await paymentRecords(crx)).toHaveLength(0);

    // Later, the scheduled reconciliation queries the provider: success.
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('RECONC01') });
    await backdateStkPush(txn._id);
    await reconciliation.reconcilePendingTransactions();

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(txn.mpesaReceiptNumber).toBe('RECONC01');
    expect(txn.recoveredViaQuery).toBe(true);

    const [payment] = await paymentRecords(crx);
    expect(payment.mpesaReceiptNumber).toBe('RECONC01');
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
    expect(reloaded.status).toBe('completed');
  });

  it('failed provider lookup keeps the transaction pending; a later reconciliation retry settles it', async () => {
    const shop = await createShopWithMpesa('H');
    const order = await createPendingOrder(shop._id, 'H');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    stageQuery(crx, { reject: new Error('network unreachable') });
    await mpesaService.processCallback(successCallback(crx));

    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(await paymentRecords(crx)).toHaveLength(0);

    await backdateStkPush(txn._id);
    await reconciliation.reconcilePendingTransactions();
    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(txn.queryCount).toBe(1);

    // Retry succeeds
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('RETRY01') });
    await reconciliation.reconcilePendingTransactions();

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    const [payment] = await paymentRecords(crx);
    expect(payment.mpesaReceiptNumber).toBe('RETRY01');
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
  });

  it('missing receipt: reconciliation converges without a receipt; the late callback backfills it', async () => {
    const shop = await createShopWithMpesa('I');
    const order = await createPendingOrder(shop._id, 'I');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    // Provider confirms success but the query response carries NO metadata
    stageQuery(crx, { resultCode: 0 });
    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    await backdateStkPush(txn._id);
    await reconciliation.reconcilePendingTransactions();

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(txn.mpesaReceiptNumber).toBeFalsy();

    // Convergence happened WITHOUT the receipt — money→order binding intact
    const [payment] = await paymentRecords(crx);
    expect(payment).toBeTruthy();
    expect(payment.mpesaReceiptNumber).toBeFalsy();
    let reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
    expect(reloaded.status).toBe('completed');

    // The late callback delivers the receipt — bookkeeping backfilled,
    // still exactly one payment record.
    const ack = await mpesaService.processCallback(successCallback(crx));
    expect(ack.ResultDesc).toBe('Already processed');

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.mpesaReceiptNumber).toBe('SGR51YAB3C');
    const records = await paymentRecords(crx);
    expect(records).toHaveLength(1);
    expect(records[0].mpesaReceiptNumber).toBe('SGR51YAB3C');
    reloaded = await reloadOrder(order._id);
    expect(reloaded.payments[0].mpesaReceiptNumber).toBe('SGR51YAB3C');
  });

  it('ambiguous provider outcome (missing ResultCode) is never treated as success or failure', async () => {
    const shop = await createShopWithMpesa('J');
    const order = await createPendingOrder(shop._id, 'J');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    stageQuery(crx, {}); // no ResultCode at all
    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    await backdateStkPush(txn._id);
    await reconciliation.reconcilePendingTransactions();

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(await paymentRecords(crx)).toHaveLength(0);
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('unpaid');
    expect(reloaded.payments[0].status).toBe('pending');
  });

  it('expired transaction is rescued by post-expiry reconciliation when the provider confirms success', async () => {
    const shop = await createShopWithMpesa('K');
    const order = await createPendingOrder(shop._id, 'K');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    // Expire without any callback
    await mpesaTxnModel.updateOne(
      { checkoutRequestId: crx },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );
    await reconciliation.expireOldTransactions();
    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.EXPIRED);

    // The customer actually paid just before expiry — provider confirms.
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('LATE001') });
    await reconciliation.reconcileRecentlyExpiredTransactions();

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    expect(txn.mpesaReceiptNumber).toBe('LATE001');

    const [payment] = await paymentRecords(crx);
    expect(payment.mpesaReceiptNumber).toBe('LATE001');
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
    expect(reloaded.status).toBe('completed');
  });

  it('post-expiry reconciliation marks a definitive provider failure as FAILED and releases the intent', async () => {
    const shop = await createShopWithMpesa('L');
    const order = await createPendingOrder(shop._id, 'L');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);

    await mpesaTxnModel.updateOne(
      { checkoutRequestId: crx },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );
    await reconciliation.expireOldTransactions();

    stageQuery(crx, { resultCode: 1032 });
    await reconciliation.reconcileRecentlyExpiredTransactions();

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.FAILED);
    expect(await paymentRecords(crx)).toHaveLength(0);
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.payments[0].status).toBe('failed');
  });

  it('concurrent callback + reconciliation settlement cannot double-credit (unique provider index)', async () => {
    const shop = await createShopWithMpesa('M');
    const order = await createPendingOrder(shop._id, 'M');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('RACE001') });

    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    await backdateStkPush(txn._id);

    await Promise.all([
      mpesaService.processCallback(successCallback(crx, 'RACE001')),
      reconciliation.reconcilePendingTransactions(),
    ]);

    const records = await paymentRecords(crx);
    expect(records).toHaveLength(1);
    expect(records[0].mpesaReceiptNumber).toBe('RACE001');

    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
    expect(reloaded.status).toBe('completed');
  });

  it("settlement queries the provider with the SHOP's own Daraja credentials (merchant-specific)", async () => {
    const shop = await createShopWithMpesa('N');
    const order = await createPendingOrder(shop._id, 'N');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata() });

    let txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    await backdateStkPush(txn._id);
    await reconciliation.reconcilePendingTransactions();

    // OAuth Basic credentials used by the STK query must be the shop's own
    expect(oauthCredentialsUsed).toContain('key-N:secret-N');
    txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
  });

  it("tenant isolation: another shop's query can never settle a foreign transaction", async () => {
    const shopA = await createShopWithMpesa('P');
    const shopB = await createShopWithMpesa('Q');
    const orderA = await createPendingOrder(shopA._id, 'P');
    const { checkoutRequestId: crx } = await initiateFor(shopA, orderA);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata() });

    const verdict = await multiTenant.querySTKStatus(
      shopB._id.toString(),
      crx,
      { converge: true },
    );

    expect(verdict.success).toBe(false);
    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.PENDING);
    expect(await paymentRecords(crx)).toHaveLength(0);
    const reloaded = await reloadOrder(orderA._id);
    expect(reloaded.paymentStatus).toBe('unpaid');
  });

  it('manual reconciliation (reconcileTransaction) settles a pending transaction with full convergence', async () => {
    const shop = await createShopWithMpesa('R');
    const order = await createPendingOrder(shop._id, 'R');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('MANUAL01') });

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    const result = await reconciliation.reconcileTransaction(
      txn._id.toString(),
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe(MpesaTransactionStatus.COMPLETED);

    const [payment] = await paymentRecords(crx);
    expect(payment.mpesaReceiptNumber).toBe('MANUAL01');
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
  });

  it('MPESA_PAYMENTS_PAUSED=true blocks NEW initiation; existing pending payments still settle', async () => {
    const shop = await createShopWithMpesa('S');
    const order = await createPendingOrder(shop._id, 'S');
    const { checkoutRequestId: crx } = await initiateFor(shop, order);
    await backdateStkPush(
      (await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec())._id,
    );

    configValues.MPESA_PAYMENTS_PAUSED = 'true';
    try {
      const pausedOrder = await createPendingOrder(shop._id, 'S2');
      await expect(
        multiTenant.initiateSTKPush({
          shopId: shop._id.toString(),
          phoneNumber: '254712345678',
          amount: AMOUNT,
          orderId: pausedOrder._id.toString(),
          orderNumber: pausedOrder.orderNumber,
          cashierId: CASHIER_ID,
          cashierName: 'Alice',
        }),
      ).rejects.toThrow(/paused/i);
      expect(await mpesaTxnModel.countDocuments({})).toBe(1); // no new record
    } finally {
      configValues.MPESA_PAYMENTS_PAUSED = 'false';
    }

    // The already-pending payment still settles while initiation is paused.
    stageQuery(crx, { resultCode: 0, metadata: receiptMetadata('PAUSED01') });
    await reconciliation.reconcilePendingTransactions();

    const txn = await mpesaTxnModel.findOne({ checkoutRequestId: crx }).exec();
    expect(txn.status).toBe(MpesaTransactionStatus.COMPLETED);
    const reloaded = await reloadOrder(order._id);
    expect(reloaded.paymentStatus).toBe('paid');
  });
});
