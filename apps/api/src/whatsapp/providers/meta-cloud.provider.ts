import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WhatsAppProvider, MessageResult, MessageStatus, TemplateParams } from './whatsapp-provider.interface';

@Injectable()
export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta';
  private readonly logger = new Logger(MetaCloudProvider.name);
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  private accessToken: string;
  private phoneNumberId: string;
  private appSecret: string;
  private webhookVerifyToken: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('META_WHATSAPP_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>('META_WHATSAPP_PHONE_ID', '');
    this.appSecret = this.configService.get<string>('META_WHATSAPP_APP_SECRET', '');
    this.webhookVerifyToken = this.configService.get<string>('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN', '');

    if (this.isAvailable()) {
      this.logger.log('✅ Meta Cloud WhatsApp provider initialized');
    }
  }

  isAvailable(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  async sendTextMessage(to: string, message: string): Promise<MessageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Provider not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace('+', ''),
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Meta API error: ${JSON.stringify(data)}`);
        return { success: false, error: data.error?.message || 'Unknown error', errorCode: data.error?.code?.toString() };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendTemplateMessage(to: string, template: TemplateParams): Promise<MessageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Provider not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace('+', ''),
          type: 'template',
          template: {
            name: template.name,
            language: { code: template.language || 'en' },
            components: template.components,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Unknown error', errorCode: data.error?.code?.toString() };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    return { messageId, status: 'sent' };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.appSecret) return true;
    const expectedSignature = crypto.createHmac('sha256', this.appSecret).update(payload).digest('hex');
    return `sha256=${expectedSignature}` === signature;
  }

  verifyWebhookChallenge(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }
}
