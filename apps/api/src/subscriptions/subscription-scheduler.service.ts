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
 * 
 * FREE_MODE: All payment/dunning/invoice tasks are disabled since the system is free.
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
   * 
   * FREE_MODE: Disabled - system is free, no subscriptions expire
   */
  @Cron('0 9 * * *')
  async processExpiringSubscriptions(): Promise<void> {
    // FREE_MODE: System is free - skip all subscription expiration processing
    this.logger.log('FREE_MODE: Skipping subscription expiration check (system is free)');
    return;
  }

  /**
   * Process DAILY billing cycle subscriptions more frequently (every 4 hours)
   * 
   * FREE_MODE: Disabled - system is free, no billing cycles to process
   */
  @Cron('0 */4 * * *') // Every 4 hours
  async processDailySubscriptions(): Promise<void> {
    // FREE_MODE: System is free - skip daily billing processing
    this.logger.log('FREE_MODE: Skipping daily billing check (system is free)');
    return;
  }

  /**
   * Send dunning notifications (runs daily at 10 AM)
   * 
   * FREE_MODE: Disabled - system is free, no payment reminders needed
   */
  @Cron('0 10 * * *')
  async sendDunningNotifications(): Promise<void> {
    // FREE_MODE: System is free - skip all dunning/payment reminder notifications
    this.logger.log('FREE_MODE: Skipping dunning notifications (system is free)');
    return;
  }

  /**
   * Generate monthly invoices for active subscriptions (runs on 1st of each month at 1 AM)
   * 
   * FREE_MODE: Disabled - system is free, no invoices to generate
   */
  @Cron('0 1 1 * *')
  async generateMonthlyInvoices(): Promise<void> {
    // FREE_MODE: System is free - skip invoice generation
    this.logger.log('FREE_MODE: Skipping monthly invoice generation (system is free)');
    return;
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
