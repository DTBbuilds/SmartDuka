import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReportPreferences, ReportPreferencesDocument, ReportFrequencyPreference } from './schemas/report-preferences.schema';
import { Shop } from '../shops/schemas/shop.schema';
import { User } from '../users/schemas/user.schema';

/**
 * EMAIL-REPORTS-CORE1 (Phase C) — RECIPIENT RESOLUTION & ELIGIBILITY.
 *
 * Consent: preferences default OFF; enabling requires an explicit
 * shop-admin action. Registration/OAuth NEVER implies consent.
 *
 * Recipient identity: only VERIFIED shop accounts — the shop owner
 * (shops.ownerId) or users with the admin role IN THIS SHOP. Google-login
 * accounts are ordinary verified users (their email arrives verified from
 * Google) and are supported through the same identity path. Recipients are
 * deduplicated and every address is re-resolved at send time so a changed
 * account email is never stale.
 */
@Injectable()
export class ReportPreferencesService {
  private readonly logger = new Logger(ReportPreferencesService.name);

  constructor(
    @InjectModel(ReportPreferences.name)
    private readonly prefsModel: Model<ReportPreferencesDocument>,
    @InjectModel(Shop.name) private readonly shopModel: Model<any>,
    @InjectModel(User.name) private readonly userModel: Model<any>,
  ) {}

  async getOrCreate(shopId: string): Promise<ReportPreferencesDocument> {
    const existing = await this.prefsModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });
    if (existing) return existing;
    try {
      return await this.prefsModel.create({ shopId: new Types.ObjectId(shopId) });
    } catch (error: any) {
      if (error?.code === 11000) {
        const raced = await this.prefsModel.findOne({
          shopId: new Types.ObjectId(shopId),
        });
        if (raced) return raced;
      }
      throw error;
    }
  }

  /**
   * Update preferences. Tenant-scoped: the caller must be an admin OF THIS
   * SHOP (enforced by the controller's role guard + shop scoping).
   */
  async update(
    shopId: string,
    patch: {
      daily?: Partial<ReportFrequencyPreference>;
      weekly?: Partial<ReportFrequencyPreference>;
      monthly?: Partial<ReportFrequencyPreference>;
      timezone?: string;
      recipientUserIds?: string[];
      paused?: boolean;
    },
  ): Promise<ReportPreferencesDocument> {
    const prefs = await this.getOrCreate(shopId);

    if (patch.timezone) {
      // Validate the IANA timezone by probing it.
      try {
        new Intl.DateTimeFormat('en-CA', { timeZone: patch.timezone });
      } catch {
        throw new ForbiddenException('Unknown timezone');
      }
      prefs.timezone = patch.timezone;
    }
    for (const key of ['daily', 'weekly', 'monthly'] as const) {
      if (patch[key]) Object.assign(prefs[key], patch[key]);
    }
    if (patch.paused !== undefined) {
      prefs.paused = patch.paused;
      if (patch.paused === false) {
        // Resuming clears a prior unsubscribe (an explicit re-consent).
        prefs.unsubscribedAt = undefined;
        prefs.unsubscribeReason = undefined;
      }
    }
    if (patch.recipientUserIds) {
      await this.assertRecipientsBelongToShop(shopId, patch.recipientUserIds);
      prefs.recipientUserIds = patch.recipientUserIds.map((id) => new Types.ObjectId(id));
    }

    prefs.updatedAt = new Date();
    return prefs.save();
  }

  async unsubscribeAll(shopId: string, reason?: string): Promise<void> {
    const prefs = await this.getOrCreate(shopId);
    prefs.paused = true;
    prefs.unsubscribedAt = new Date();
    prefs.unsubscribeReason = reason || 'owner request';
    await prefs.save();
  }

  /**
   * Resolve the CURRENT verified recipient emails for a shop. Re-resolved
   * at send time (never cached identities). Deduplicated; skips users
   * without an email.
   */
  async resolveRecipients(shopId: string): Promise<Array<{ userId: string; email: string; name?: string }>> {
    const prefs = await this.getOrCreate(shopId);
    const shopObjectId = new Types.ObjectId(shopId);

    let candidateIds: Types.ObjectId[] = [];
    if (prefs.recipientUserIds.length > 0) {
      candidateIds = prefs.recipientUserIds;
    } else {
      const shop = (await this.shopModel
        .findById(shopObjectId)
        .select('ownerId')
        .lean()
        .exec()) as any;
      if (shop?.ownerId) candidateIds = [new Types.ObjectId(shop.ownerId)];
    }

    if (candidateIds.length === 0) return [];

    const users = await this.userModel
      .find({
        _id: { $in: candidateIds },
        shopId: shopObjectId, // tenant scope: a recipient must belong to THIS shop
      })
      .select('email name role emailVerified')
      .lean()
      .exec();

    const seen = new Set<string>();
    const recipients: Array<{ userId: string; email: string; name?: string }> = [];
    for (const u of users) {
      const email = String(u.email || '').toLowerCase().trim();
      if (!email || seen.has(email)) continue;
      // Optional reports go to verified identities only.
      if (u.emailVerified === false) continue;
      // RELEASE-GATE1: role is re-checked at RESOLVE time — an admin who was
      // downgraded or removed after being added to the recipient list stops
      // receiving immediately.
      if (u.role !== 'admin') continue;
      seen.add(email);
      recipients.push({ userId: String(u._id), email, name: u.name });
    }
    return recipients;
  }

  /**
   * Delivery eligibility for an OPTIONAL report right now: global flag and
   * shop flag handled by the scheduler; here — not paused, not
   * unsubscribed, at least one eligible recipient.
   */
  async isEligible(shopId: string): Promise<{ eligible: boolean; reason?: string }> {
    const prefs = await this.getOrCreate(shopId);
    if (prefs.unsubscribedAt) {
      return { eligible: false, reason: 'unsubscribed' };
    }
    if (prefs.paused) {
      return { eligible: false, reason: 'paused' };
    }
    const recipients = await this.resolveRecipients(shopId);
    if (recipients.length === 0) {
      return { eligible: false, reason: 'no_verified_recipients' };
    }
    return { eligible: true };
  }

  private async assertRecipientsBelongToShop(shopId: string, userIds: string[]): Promise<void> {
    const shopObjectId = new Types.ObjectId(shopId);
    const users = await this.userModel
      .find({
        _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        shopId: shopObjectId,
      })
      .select('role')
      .lean()
      .exec();
    if (users.length !== new Set(userIds).size) {
      throw new ForbiddenException('All recipients must be users of this shop');
    }
    for (const u of users) {
      if (u.role !== 'admin') {
        throw new ForbiddenException('Report recipients must be shop admins or the owner');
      }
    }
  }
}
