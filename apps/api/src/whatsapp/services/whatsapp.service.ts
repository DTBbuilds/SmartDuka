/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { WhatsAppMessage, WhatsAppMessageDocument, MessageCategory, ReportType, AlertType } from '../schemas/whatsapp-message.schema';
import { WhatsAppConfig, WhatsAppConfigDocument } from '../schemas/whatsapp-config.schema';
import { WhatsAppProviderService } from './whatsapp-provider.service';
import { WhatsAppTemplateService, DailyReportData, WeeklyReportData, MonthlyReportData, LowStockAlertData, CashVarianceAlertData, SalesAnomalyAlertData } from './whatsapp-template.service';
import { QueueService } from '../../queue/queue.service';

/**
 * WhatsApp Service
 * 
 * Main service for WhatsApp messaging. Handles:
 * - Message sending and queuing
 * - Configuration management
 * - Phone verification
 * - Rate limiting
 * - Opt-in/opt-out
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly senderNumber: string;

  constructor(
    @InjectModel(WhatsAppMessage.name) private readonly messageModel: Model<WhatsAppMessageDocument>,
    @InjectModel(WhatsAppConfig.name) private readonly configModel: Model<WhatsAppConfigDocument>,
    private readonly providerService: WhatsAppProviderService,
    private readonly templateService: WhatsAppTemplateService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.senderNumber = this.configService.get<string>('WHATSAPP_SENDER_NUMBER', '+254700000000');
  }

  // ==================== CONFIGURATION MANAGEMENT ====================

  /**
   * Get WhatsApp config for a shop
   */
  async getConfig(shopId: string): Promise<WhatsAppConfigDocument | null> {
    return this.configModel.findOne({ shopId: new Types.ObjectId(shopId) });
  }

  /**
   * Create or update WhatsApp config
   */
  async upsertConfig(shopId: string, data: Partial<WhatsAppConfig>): Promise<WhatsAppConfigDocument> {
    return this.configModel.findOneAndUpdate(
      { shopId: new Types.ObjectId(shopId) },
      { $set: { ...data, shopId: new Types.ObjectId(shopId) } },
      { upsert: true, new: true },
    );
  }

  /**
   * Check if shop is opted in and verified
   */
  async isEnabledForShop(shopId: string): Promise<boolean> {
    const config = await this.getConfig(shopId);
    return !!(config?.isOptedIn && config?.isVerified);
  }

  // ==================== PHONE VERIFICATION ====================

  /**
   * Send verification OTP to phone number
   */
  async sendVerificationOtp(shopId: string, phoneNumber: string, shopName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.providerService.isAvailable()) {
      return { success: false, error: 'WhatsApp service not available' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save verification code
    await this.configModel.findOneAndUpdate(
      { shopId: new Types.ObjectId(shopId) },
      {
        $set: {
          shopId: new Types.ObjectId(shopId),
          adminPhone: phoneNumber,
          verificationCode: otp,
          verificationExpiresAt: expiresAt,
          isVerified: false,
        },
      },
      { upsert: true },
    );

    // Send OTP message
    const message = this.templateService.formatVerificationOtp(shopName, otp);
    const result = await this.providerService.sendTextMessage(phoneNumber, message);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log the message
    await this.createMessageLog({
      shopId,
      to: phoneNumber,
      content: '[OTP Verification]',
      category: 'verification',
    });

    return { success: true };
  }

  /**
   * Confirm verification OTP
   */
  async confirmVerification(shopId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(shopId);

    if (!config) {
      return { success: false, error: 'No pending verification found' };
    }

    if (!config.verificationCode || !config.verificationExpiresAt) {
      return { success: false, error: 'No pending verification found' };
    }

    if (new Date() > config.verificationExpiresAt) {
      return { success: false, error: 'Verification code expired' };
    }

    if (config.verificationCode !== otp) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Mark as verified and opted in
    await this.configModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      {
        $set: {
          isVerified: true,
          verifiedAt: new Date(),
          isOptedIn: true,
          optedInAt: new Date(),
        },
        $unset: {
          verificationCode: 1,
          verificationExpiresAt: 1,
        },
      },
    );

    return { success: true };
  }

  /**
   * Opt out of WhatsApp messages
   */
  async optOut(shopId: string): Promise<void> {
    await this.configModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      {
        $set: {
          isOptedIn: false,
          optedOutAt: new Date(),
        },
      },
    );
  }

  // ==================== REPORT SENDING ====================

  /**
   * Send daily report
   */
  async sendDailyReport(shopId: string, data: DailyReportData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendReport(config, 'daily')) return;

    const messages = this.templateService.formatDailyReport(data);
    await this.sendMultiPartMessage(shopId, config!.adminPhone, messages, 'report', 'daily');
  }

  /**
   * Send weekly report
   */
  async sendWeeklyReport(shopId: string, data: WeeklyReportData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendReport(config, 'weekly')) return;

    const messages = this.templateService.formatWeeklyReport(data);
    await this.sendMultiPartMessage(shopId, config!.adminPhone, messages, 'report', 'weekly');
  }

  /**
   * Send monthly report
   */
  async sendMonthlyReport(shopId: string, data: MonthlyReportData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendReport(config, 'monthly')) return;

    const messages = this.templateService.formatMonthlyReport(data);
    await this.sendMultiPartMessage(shopId, config!.adminPhone, messages, 'report', 'monthly');
  }

  // ==================== ALERT SENDING ====================

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(shopId: string, data: LowStockAlertData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendAlert(config, 'lowStock')) return;

    if (this.isQuietHours(config!)) {
      this.logger.debug(`Skipping low stock alert for ${shopId} - quiet hours`);
      return;
    }

    const message = this.templateService.formatLowStockAlert(data);
    await this.queueMessage(shopId, config!.adminPhone, message, 'alert', undefined, 'low_stock');
  }

  /**
   * Send cash variance alert
   */
  async sendCashVarianceAlert(shopId: string, data: CashVarianceAlertData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendAlert(config, 'cashVariance')) return;

    // Cash variance is important - send even during quiet hours
    const message = this.templateService.formatCashVarianceAlert(data);
    await this.queueMessage(shopId, config!.adminPhone, message, 'alert', undefined, 'cash_variance');
  }

  /**
   * Send sales anomaly alert
   */
  async sendSalesAnomalyAlert(shopId: string, data: SalesAnomalyAlertData): Promise<void> {
    const config = await this.getConfig(shopId);
    if (!this.shouldSendAlert(config, 'salesAnomaly')) return;

    if (this.isQuietHours(config!) && data.severity !== 'high') {
      return;
    }

    const message = this.templateService.formatSalesAnomalyAlert(data);
    await this.queueMessage(shopId, config!.adminPhone, message, 'alert', undefined, 'sales_anomaly');
  }

  // ==================== MESSAGE QUEUING ====================

  /**
   * Queue a message for sending
   */
  async queueMessage(
    shopId: string,
    to: string,
    content: string,
    category: MessageCategory,
    reportType?: ReportType,
    alertType?: AlertType,
  ): Promise<WhatsAppMessageDocument | null> {
    // Check rate limit
    const config = await this.getConfig(shopId);
    if (config && config.messagesSentToday >= config.maxMessagesPerDay) {
      this.logger.warn(`Rate limit reached for shop ${shopId}`);
      return null;
    }

    // Create message record
    const message = await this.messageModel.create({
      shopId: new Types.ObjectId(shopId),
      to,
      from: this.senderNumber,
      messageType: 'text',
      content,
      status: 'queued',
      provider: this.providerService.getProviderName(),
      category,
      reportType,
      alertType,
    });

    // Add to queue for async processing
    await this.queueService.addWhatsAppMessage({
      messageId: message._id.toString(),
      shopId,
      to,
      content,
    });

    return message;
  }

  /**
   * Send a message immediately (called by queue processor)
   */
  async sendMessageNow(messageId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      this.logger.error(`Message not found: ${messageId}`);
      return;
    }

    const result = await this.providerService.sendTextMessage(message.to, message.content);

    if (result.success) {
      await this.messageModel.updateOne(
        { _id: message._id },
        {
          $set: {
            status: 'sent',
            providerMessageId: result.messageId,
            sentAt: new Date(),
          },
        },
      );

      // Update daily counter
      await this.incrementMessageCount(message.shopId.toString());
    } else {
      const shouldRetry = message.retryCount < message.maxRetries;
      
      await this.messageModel.updateOne(
        { _id: message._id },
        {
          $set: {
            status: shouldRetry ? 'queued' : 'failed',
            errorMessage: result.error,
            errorCode: result.errorCode,
            nextRetryAt: shouldRetry ? new Date(Date.now() + 60000 * (message.retryCount + 1)) : undefined,
          },
          $inc: { retryCount: 1 },
        },
      );

      if (!shouldRetry) {
        await this.incrementFailedCount(message.shopId.toString());
      }
    }
  }

  /**
   * Update message status from webhook
   */
  async updateMessageStatus(
    providerMessageId: string,
    status: 'delivered' | 'read' | 'failed',
    timestamp?: Date,
    error?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    
    if (status === 'delivered') {
      updateData.deliveredAt = timestamp || new Date();
      await this.messageModel.updateOne({ providerMessageId }, { $set: updateData });
      
      // Update delivered count
      const message = await this.messageModel.findOne({ providerMessageId });
      if (message) {
        const shopIdStr = message.shopId?.toString?.() ?? String(message.shopId);
        await this.incrementDeliveredCount(shopIdStr);
      }
    } else if (status === 'read') {
      updateData.readAt = timestamp || new Date();
      await this.messageModel.updateOne({ providerMessageId }, { $set: updateData });
    } else if (status === 'failed') {
      updateData.errorMessage = error;
      await this.messageModel.updateOne({ providerMessageId }, { $set: updateData });
    }
  }

  // ==================== MESSAGE HISTORY ====================

  /**
   * Get message history for a shop
   */
  async getMessageHistory(
    shopId: string,
    options: { category?: string; limit?: number; skip?: number } = {},
  ): Promise<WhatsAppMessageDocument[]> {
    const query: Record<string, unknown> = { shopId: new Types.ObjectId(shopId) };
    if (options.category) query.category = options.category;

    return this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  /**
   * Get message statistics for a shop
   */
  async getMessageStats(shopId: string, days: number = 30): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    byCategory: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await this.messageModel.find({
      shopId: new Types.ObjectId(shopId),
      createdAt: { $gte: startDate },
    });

    const stats = {
      total: messages.length,
      sent: messages.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
      delivered: messages.filter(m => m.status === 'delivered' || m.status === 'read').length,
      failed: messages.filter(m => m.status === 'failed').length,
      byCategory: {} as Record<string, number>,
    };

    for (const message of messages) {
      stats.byCategory[message.category] = (stats.byCategory[message.category] || 0) + 1;
    }

    return stats;
  }

  // ==================== PRIVATE HELPERS ====================

  private shouldSendReport(config: WhatsAppConfigDocument | null, reportType: ReportType): boolean {
    if (!config?.isOptedIn || !config?.isVerified) return false;
    if (config.deliveryChannel === 'email') return false;
    return config.reportSchedule?.[reportType] ?? true;
  }

  private shouldSendAlert(config: WhatsAppConfigDocument | null, alertType: keyof WhatsAppConfig['alertPreferences']): boolean {
    if (!config?.isOptedIn || !config?.isVerified) return false;
    if (config.deliveryChannel === 'email') return false;
    return config.alertPreferences?.[alertType] ?? true;
  }

  private isQuietHours(config: WhatsAppConfig): boolean {
    if (!config.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = config.quietHours.start;
    const end = config.quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  }

  private async sendMultiPartMessage(
    shopId: string,
    to: string,
    messages: string[],
    category: MessageCategory,
    reportType?: ReportType,
  ): Promise<void> {
    for (const content of messages) {
      await this.queueMessage(shopId, to, content, category, reportType);
      // Small delay between parts
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async createMessageLog(data: {
    shopId: string;
    to: string;
    content: string;
    category: MessageCategory;
  }): Promise<void> {
    await this.messageModel.create({
      shopId: new Types.ObjectId(data.shopId),
      to: data.to,
      from: this.senderNumber,
      messageType: 'text',
      content: data.content,
      status: 'sent',
      provider: this.providerService.getProviderName(),
      category: data.category,
      sentAt: new Date(),
    });
  }

  private async incrementMessageCount(shopId: string): Promise<void> {
    await this.configModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      {
        $inc: { messagesSentToday: 1, totalMessagesSent: 1 },
        $set: { lastMessageSentAt: new Date() },
      },
    );
  }

  private async incrementDeliveredCount(shopId: string): Promise<void> {
    await this.configModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      { $inc: { totalMessagesDelivered: 1 } },
    );
  }

  private async incrementFailedCount(shopId: string): Promise<void> {
    await this.configModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      { $inc: { totalMessagesFailed: 1 } },
    );
  }
}
