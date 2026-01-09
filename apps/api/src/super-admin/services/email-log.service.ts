import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { EmailLog, EmailLogDocument } from '../schemas/email-log.schema';

export interface CreateEmailLogDto {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  templateName?: string;
  templateVariables?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  from?: string;
  replyTo?: string;
  shopId?: string;
  shopName?: string;
  userId?: string;
  userName?: string;
  category?: string;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export interface EmailLogQueryOptions {
  to?: string;
  shopId?: string;
  status?: string;
  category?: string;
  templateName?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}

@Injectable()
export class EmailLogService {
  private readonly logger = new Logger(EmailLogService.name);

  constructor(
    @InjectModel(EmailLog.name)
    private readonly emailLogModel: Model<EmailLogDocument>,
  ) {}

  /**
   * Create an email log entry
   */
  async create(dto: CreateEmailLogDto): Promise<EmailLogDocument> {
    try {
      const emailLog = new this.emailLogModel({
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        templateName: dto.templateName,
        templateVariables: dto.templateVariables,
        htmlContent: dto.htmlContent?.substring(0, 1000), // Store first 1000 chars
        textContent: dto.textContent?.substring(0, 500),
        from: dto.from || 'SmartDuka <smartdukainfo@gmail.com>',
        replyTo: dto.replyTo,
        shopId: dto.shopId ? new Types.ObjectId(dto.shopId) : undefined,
        shopName: dto.shopName,
        userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
        userName: dto.userName,
        category: dto.category || 'other',
        status: 'pending',
        triggeredBy: dto.triggeredBy,
        metadata: dto.metadata,
      });

      return await emailLog.save();
    } catch (error: any) {
      this.logger.error(`Failed to create email log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update email status to sent
   */
  async markSent(
    emailLogId: string,
    messageId?: string,
    provider?: string,
    providerResponse?: Record<string, any>,
  ): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findByIdAndUpdate(
      new Types.ObjectId(emailLogId),
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          messageId,
          provider,
          providerResponse,
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Update email status to failed
   */
  async markFailed(
    emailLogId: string,
    errorMessage: string,
    errorCode?: string,
  ): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findByIdAndUpdate(
      new Types.ObjectId(emailLogId),
      {
        $set: {
          status: 'failed',
          failedAt: new Date(),
          errorMessage,
          errorCode,
        },
        $inc: { retryCount: 1 },
      },
      { new: true },
    ).exec();
  }

  /**
   * Update email status to delivered
   */
  async markDelivered(emailLogId: string): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findByIdAndUpdate(
      new Types.ObjectId(emailLogId),
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date(),
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Track email open
   */
  async trackOpen(messageId: string): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findOneAndUpdate(
      { messageId },
      {
        $set: {
          opened: true,
          openedAt: new Date(),
        },
        $inc: { openCount: 1 },
      },
      { new: true },
    ).exec();
  }

  /**
   * Track link click
   */
  async trackClick(messageId: string, link: string): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findOneAndUpdate(
      { messageId },
      {
        $set: {
          clicked: true,
          clickedAt: new Date(),
        },
        $addToSet: { clickedLinks: link },
      },
      { new: true },
    ).exec();
  }

  /**
   * Query email logs with filters
   */
  async query(options: EmailLogQueryOptions): Promise<{
    emails: EmailLogDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: FilterQuery<EmailLog> = {};

    if (options.to) query.to = { $regex: options.to, $options: 'i' };
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.status) query.status = options.status;
    if (options.category) query.category = options.category;
    if (options.templateName) query.templateName = options.templateName;

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const [emails, total] = await Promise.all([
      this.emailLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.emailLogModel.countDocuments(query).exec(),
    ]);

    return {
      emails,
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
    };
  }

  /**
   * Get recent emails
   */
  async getRecent(limit = 20): Promise<EmailLogDocument[]> {
    return this.emailLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get failed emails
   */
  async getFailed(limit = 50, skip = 0): Promise<EmailLogDocument[]> {
    return this.emailLogModel
      .find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get email statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    openRate: number;
    clickRate: number;
    byCategory: Record<string, number>;
    byTemplate: Record<string, number>;
  }> {
    const dateQuery: any = {};
    if (startDate) dateQuery.$gte = startDate;
    if (endDate) dateQuery.$lte = endDate;

    const matchStage = Object.keys(dateQuery).length > 0 
      ? { createdAt: dateQuery } 
      : {};

    const [
      total,
      byStatus,
      byCategory,
      byTemplate,
      openedCount,
      clickedCount,
    ] = await Promise.all([
      this.emailLogModel.countDocuments(matchStage).exec(),
      this.emailLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.emailLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).exec(),
      this.emailLogModel.aggregate([
        { $match: { ...matchStage, templateName: { $exists: true } } },
        { $group: { _id: '$templateName', count: { $sum: 1 } } },
      ]).exec(),
      this.emailLogModel.countDocuments({ ...matchStage, opened: true }).exec(),
      this.emailLogModel.countDocuments({ ...matchStage, clicked: true }).exec(),
    ]);

    const statusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const sentCount = (statusMap.sent || 0) + (statusMap.delivered || 0);

    return {
      total,
      sent: statusMap.sent || 0,
      delivered: statusMap.delivered || 0,
      failed: statusMap.failed || 0,
      pending: statusMap.pending || 0,
      openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
      clickRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byTemplate: byTemplate.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get emails by shop
   */
  async getByShop(shopId: string, limit = 50, skip = 0): Promise<EmailLogDocument[]> {
    return this.emailLogModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Retry failed email (mark as pending for retry)
   */
  async retryEmail(emailLogId: string): Promise<EmailLogDocument | null> {
    return this.emailLogModel.findByIdAndUpdate(
      new Types.ObjectId(emailLogId),
      {
        $set: {
          status: 'pending',
          lastRetryAt: new Date(),
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Delete an email log entry
   */
  async delete(emailLogId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.emailLogModel.findByIdAndDelete(
        new Types.ObjectId(emailLogId)
      ).exec();
      
      if (!result) {
        return { success: false, message: 'Email log not found' };
      }
      
      this.logger.log(`Deleted email log: ${emailLogId}`);
      return { success: true, message: 'Email log deleted successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to delete email log ${emailLogId}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
