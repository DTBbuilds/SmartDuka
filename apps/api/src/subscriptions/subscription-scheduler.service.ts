import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Subscription Scheduler Service
 * 
 * Handles all scheduled tasks related to subscriptions:
 * - Processing expiring subscriptions
 * - Sending renewal reminders
 * - Suspending overdue subscriptions
 * - Generating recurring invoices
 */
@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
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
   * Send payment reminders for past due subscriptions (runs daily at 10 AM)
   */
  @Cron('0 10 * * *')
  async sendPaymentReminders(): Promise<void> {
    this.logger.log('Sending payment reminders for past due subscriptions...');
    
    try {
      // Get all past due subscriptions
      const pastDueSubscriptions = await this.subscriptionsService.getPastDueSubscriptions();
      
      for (const subscription of pastDueSubscriptions) {
        // Calculate days until suspension
        const now = new Date();
        const gracePeriodEnd = subscription.gracePeriodEndDate;
        
        if (gracePeriodEnd) {
          const daysUntilSuspension = Math.ceil(
            (gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );
          
          // Send reminder at 5 days, 3 days, and 1 day before suspension
          if ([5, 3, 1].includes(daysUntilSuspension)) {
            this.logger.log(
              `Sending payment reminder to shop ${subscription.shopId}: ${daysUntilSuspension} days until suspension`
            );
            // TODO: Send email notification
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to send payment reminders:', error);
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
