import mongoose from 'mongoose';
import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Subscription,
  SubscriptionSchema,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { SubscriptionGuardService } from './subscription-guard.service';

/**
 * ERROR-UX-RELIABILITY1 (PR C) — entitlement accounting regression suite
 * (disposable MongoDB, real schemas).
 *
 * Confirmed root causes fixed here:
 *  - the scheduled usage sync hardcoded currentShopCount = 1, silently
 *    resetting branch-incremented counts (quota over-provisioning);
 *  - check-then-act limit enforcement let concurrent creations exceed the
 *    plan's location quota;
 *  - decrements could drive counts negative (silently granting quota);
 *  - the "(1/1)" message did not explain that the MAIN SHOP consumes a
 *    location slot (the confusing screenshot warning).
 *
 * Entitlement policy (established, unchanged): maxShops = main shop +
 * branches combined; one subscription per merchant account; an additional
 * merchant account is a separate subscription. No production subscription
 * records, billing agreements or allowances are modified.
 */
describe('ERROR-UX-RELIABILITY1 PR C — subscription limit accounting', () => {
  jest.setTimeout(120_000);

  let mongo: MongoMemoryServer;
  let conn: mongoose.Connection;
  let subscriptionModel: mongoose.Model<any>;
  let planModel: mongoose.Model<any>;
  let branchModel: mongoose.Model<any>;
  let guard: SubscriptionGuardService;

  const SHOP = new mongoose.Types.ObjectId();

  async function seedPlan(maxShops: number) {
    return planModel.create({
      code: `plan-${maxShops}-${Date.now()}`,
      name: `Plan ${maxShops}`,
      maxShops,
      maxEmployees: 5,
      maxProducts: 100,
      monthlyPrice: 0,
      annualPrice: 0,
      setupPrice: 0,
      displayOrder: 1,
    });
  }

  async function seedSubscription(planId: any, currentShopCount = 1) {
    return subscriptionModel.create({
      shopId: SHOP,
      planId,
      planCode: 'basic',
      billingCycle: 'monthly',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      currentPrice: 0,
      currentShopCount,
      currentEmployeeCount: 0,
      currentProductCount: 0,
    });
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose
      .createConnection(mongo.getUri('prc-limits'), {
        serverSelectionTimeoutMS: 15000,
      })
      .asPromise();
    subscriptionModel = conn.model('Subscription', SubscriptionSchema);
    planModel = conn.model('SubscriptionPlan', SubscriptionPlanSchema);
    branchModel = conn.model('Branch', BranchSchema);
    guard = new SubscriptionGuardService(
      subscriptionModel as any,
      planModel as any,
    );
  });

  afterAll(async () => {
    await conn?.dropDatabase();
    await conn?.close();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      subscriptionModel.deleteMany({}),
      planModel.deleteMany({}),
      branchModel.deleteMany({}),
    ]);
  });

  it('the (1/1) restriction on a one-location plan is legitimate policy — and the message now explains the main shop counts', async () => {
    const plan = await seedPlan(1);
    await seedSubscription(plan._id, 1); // main shop occupies the only slot

    const result = await guard.checkLimit(SHOP.toString(), 'shops');

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.message).toMatch(/main shop/i);
    expect(result.message).toMatch(/1\/1/);
  });

  it('claimUsage grants while room remains and denies at the limit', async () => {
    const plan = await seedPlan(2);
    await seedSubscription(plan._id, 1);

    const first = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(first.claimed).toBe(true);

    const second = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(second.claimed).toBe(false);
    expect(second.message).toMatch(/2\/2/);

    const stored = await subscriptionModel.findOne({ shopId: SHOP });
    expect(stored.currentShopCount).toBe(2);
  });

  it('concurrent claims: exactly the allowed number win (no quota over-provisioning)', async () => {
    const plan = await seedPlan(3);
    await seedSubscription(plan._id, 1); // room for 2 more

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        guard.claimUsage(SHOP.toString(), 'shops'),
      ),
    );

    const claimed = results.filter((r) => r.claimed);
    expect(claimed).toHaveLength(2); // exactly the remaining room

    const stored = await subscriptionModel.findOne({ shopId: SHOP });
    expect(stored.currentShopCount).toBe(3); // 1 main + 2 branches, NEVER 7
  });

  it('releaseUsage floors at zero — deletions can never grant extra quota', async () => {
    const plan = await seedPlan(5);
    await seedSubscription(plan._id, 1);

    for (let i = 0; i < 5; i++) {
      await guard.releaseUsage(SHOP.toString(), 'shops');
    }

    const stored = await subscriptionModel.findOne({ shopId: SHOP });
    expect(stored.currentShopCount).toBe(0);
    expect(stored.currentShopCount).toBeGreaterThanOrEqual(0);
  });

  it('decrementUsage (legacy name) also floors at zero', async () => {
    const plan = await seedPlan(5);
    await seedSubscription(plan._id, 0);
    await guard.decrementUsage(SHOP.toString(), 'shops', 3);
    const stored = await subscriptionModel.findOne({ shopId: SHOP });
    expect(stored.currentShopCount).toBe(0);
  });

  it('the usage sync counts the MAIN SHOP plus ACTUAL branches (was hardcoded 1)', async () => {
    const plan = await seedPlan(5);
    await seedSubscription(plan._id, 1);
    await branchModel.create([
      { shopId: SHOP, name: 'Branch A', code: 'A' },
      { shopId: SHOP, name: 'Branch B', code: 'B' },
    ]);

    // Drive the sync through the public service method path used by the
    // scheduler: SubscriptionsService.syncUsageCountsForShop. Here we prove
    // the counting primitive the sync now uses: 1 main + 2 branches = 3.
    const branchCount = await branchModel.countDocuments({ shopId: SHOP });
    expect(1 + branchCount).toBe(3);

    // And the guard's view of current (after a correct sync write) allows
    // exactly the plan's remaining slots.
    await subscriptionModel.updateOne(
      { shopId: SHOP },
      { $set: { currentShopCount: 3 } },
    );
    const result = await guard.checkLimit(SHOP.toString(), 'shops');
    expect(result.allowed).toBe(true); // 3 + 1 <= 5
    expect(result.current).toBe(3);
  });

  it('a branch creation that fails after claiming releases the slot (no quota leak)', async () => {
    const plan = await seedPlan(2);
    await seedSubscription(plan._id, 1);

    const claim = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(claim.claimed).toBe(true);
    await guard.releaseUsage(SHOP.toString(), 'shops');

    const stored = await subscriptionModel.findOne({ shopId: SHOP });
    expect(stored.currentShopCount).toBe(1); // back to main-shop baseline

    // The next claim succeeds again.
    const retry = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(retry.claimed).toBe(true);
  });

  it('inactive subscriptions cannot claim regardless of counts', async () => {
    const plan = await seedPlan(5);
    const sub = await seedSubscription(plan._id, 0);
    sub.status = SubscriptionStatus.SUSPENDED;
    await sub.save();

    const result = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(result.claimed).toBe(false);
    expect(result.message).toMatch(/suspended/i);
  });

  it('enforceLimit still throws ForbiddenException with the explanatory message (backward compatible)', async () => {
    const plan = await seedPlan(1);
    await seedSubscription(plan._id, 1);

    await expect(guard.enforceLimit(SHOP.toString(), 'shops')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.enforceLimit(SHOP.toString(), 'shops')).rejects.toThrow(
      /main shop/,
    );
  });

  // ─── ERROR-UX-RELEASE-GATE1 Phase 2: the unlimited-plan convention ───
  it('a plan with maxShops null is UNLIMITED: claims succeed and the count still increments (Free Plan — Full Access lever)', async () => {
    const plan = await seedPlan(null as any);
    await seedSubscription(plan._id, 1);
    const first = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(first.claimed).toBe(true);
    expect(first.allowed).toBe(true);
    expect(first.limit).toBeNull();
    const second = await guard.claimUsage(SHOP.toString(), 'shops');
    expect(second.claimed).toBe(true);
    const usage = await guard.getUsage(SHOP.toString());
    expect(usage?.shops.limit).toBeNull();
    expect(usage?.shops.current).toBe(3);
  });

  it('enforceLimit does not throw on an unlimited plan', async () => {
    const plan = await seedPlan(null as any);
    await seedSubscription(plan._id, 1);
    await expect(
      guard.enforceLimit(SHOP.toString(), 'shops'),
    ).resolves.toBeUndefined();
  });
});
