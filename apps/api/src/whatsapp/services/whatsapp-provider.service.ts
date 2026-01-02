import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppProvider, MessageResult, MessageStatus, TemplateParams } from '../providers/whatsapp-provider.interface';
import { MetaCloudProvider } from '../providers/meta-cloud.provider';
import { TwilioProvider } from '../providers/twilio.provider';

/**
 * WhatsApp Provider Service
 * 
 * Factory/facade that selects and uses the appropriate WhatsApp provider
 * based on configuration. Supports fallback between providers.
 */
@Injectable()
export class WhatsAppProviderService {
  private readonly logger = new Logger(WhatsAppProviderService.name);
  private activeProvider: WhatsAppProvider | null = null;
  private providers: Map<string, WhatsAppProvider> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly metaProvider: MetaCloudProvider,
    private readonly twilioProvider: TwilioProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register providers
    this.providers.set('meta', this.metaProvider);
    this.providers.set('twilio', this.twilioProvider);

    // Select active provider based on config
    const preferredProvider = this.configService.get<string>('WHATSAPP_PROVIDER', 'meta');
    
    // Try preferred provider first
    if (this.providers.get(preferredProvider)?.isAvailable()) {
      this.activeProvider = this.providers.get(preferredProvider)!;
      this.logger.log(`✅ Active WhatsApp provider: ${this.activeProvider.name}`);
      return;
    }

    // Fallback to any available provider
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable()) {
        this.activeProvider = provider;
        this.logger.log(`✅ Active WhatsApp provider (fallback): ${name}`);
        return;
      }
    }

    this.logger.log('WhatsApp providers not configured - set META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID to enable');
  }

  /**
   * Check if WhatsApp messaging is available
   */
  isAvailable(): boolean {
    return this.activeProvider !== null && this.activeProvider.isAvailable();
  }

  /**
   * Get active provider name
   */
  getProviderName(): string {
    return this.activeProvider?.name || 'none';
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, message: string): Promise<MessageResult> {
    if (!this.activeProvider) {
      return { success: false, error: 'No WhatsApp provider available' };
    }

    this.logger.debug(`Sending message to ${to} via ${this.activeProvider.name}`);
    return this.activeProvider.sendTextMessage(to, message);
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(to: string, template: TemplateParams): Promise<MessageResult> {
    if (!this.activeProvider) {
      return { success: false, error: 'No WhatsApp provider available' };
    }

    this.logger.debug(`Sending template ${template.name} to ${to} via ${this.activeProvider.name}`);
    return this.activeProvider.sendTemplateMessage(to, template);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    if (!this.activeProvider) {
      return { messageId, status: 'failed', error: 'No provider available' };
    }

    return this.activeProvider.getMessageStatus(messageId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, provider?: string): boolean {
    const targetProvider = provider 
      ? this.providers.get(provider) 
      : this.activeProvider;

    if (!targetProvider) return false;
    return targetProvider.verifyWebhookSignature(payload, signature);
  }

  /**
   * Get Meta provider for webhook handling
   */
  getMetaProvider(): MetaCloudProvider {
    return this.metaProvider;
  }
}
