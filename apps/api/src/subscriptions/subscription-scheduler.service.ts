import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionDunningService } from './subscription-dunning.service';

/**
 * Subscription Scheduler Service
 * 
 * Handles all scheduled tasks related to subscriptions:
 * - Processing expiring subscriptions
 * - Sending renewal reminders (dunning)
 * - Suspending overdue subscriptions
 * - Generating recurring invoices
 */
@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dunningService: SubscriptionDunningService,
  ) {}

  /**
   * Process expiring subscriptions (runs daily at 9 AM)
   * 
   * This handles:
   * - Subscriptions expiring in 7 days (send reminder)
   * - Expired subscriptions (create renewal invoice, set to PAST_DUE)
   * - Past grace period subscriptions (set to SUSPENDED)
   */
  @Cron('0 9 * * *')
  async processExpiringSubscriptions(): Promise<void> {
    this.logger.log('Starting daily subscription expiration check...');
    
    try {
      await this.subscriptionsService.processExpiringSubscriptions();
      this.logger.log('Completed subscription expiration check');
    } catch (error) {
      this.logger.error('Failed to process expiring subscriptions:', error);
    }
  }

  /**
   * Send dunning notifications (runs daily at 10 AM)
   * This handles:
   * - Expiry warnings (7, 3, 1 days before)
   * - Grace period reminders (day 1, 3, 5)
   * - Suspension notices
   */
  @Cron('0 10 * * *')
  async sendDunningNotifications(): Promise<void> {
    this.logger.log('Processing dunning notifications...');
    
    try {
      const results = await this.dunningService.processDunningNotifications();
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      this.logger.log(`Dunning notifications completed: ${successful} successful, ${failed} failed`);
      
      // Log any failures
      results.filter(r => !r.success).forEach(r => {
        this.logger.warn(`Failed dunning for ${r.shopName}: ${r.action} - ${r.error}`);
      });
    } catch (error) {
      this.logger.error('Failed to process dunning notifications:', error);
    }
  }

  /**
   * Generate monthly invoices for active subscriptions (runs on 1st of each month at 1 AM)
   */
  @Cron('0 1 1 * *')
  async generateMonthlyInvoices(): Promise<void> {
    this.logger.log('Generating monthly subscription invoices...');
    
    try {
      await this.subscriptionsService.generateRecurringInvoices();
      this.logger.log('Completed monthly invoice generation');
    } catch (error) {
      this.logger.error('Failed to generate monthly invoices:', error);
    }
  }

  /**
   * Sync usage counts to ensure data integrity (runs weekly on Sunday at 2 AM)
   */
  @Cron('0 2 * * 0')
  async syncUsageCounts(): Promise<void> {
    this.logger.log('Syncing subscription usage counts...');
    
    try {
      await this.subscriptionsService.syncAllUsageCounts();
      this.logger.log('Completed usage count sync');
    } catch (error) {
      this.logger.error('Failed to sync usage counts:', error);
    }
  }
}
