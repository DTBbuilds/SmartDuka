import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WhatsAppProvider, MessageResult, MessageStatus, TemplateParams } from './whatsapp-provider.interface';

@Injectable()
export class TwilioProvider implements WhatsAppProvider {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly baseUrl = 'https://api.twilio.com/2010-04-01';

  private accountSid: string;
  private authToken: string;
  private whatsappNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.whatsappNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', '');

    if (this.isAvailable()) {
      this.logger.log('✅ Twilio WhatsApp provider initialized');
    }
  }

  isAvailable(): boolean {
    return !!(this.accountSid && this.authToken && this.whatsappNumber);
  }

  async sendTextMessage(to: string, message: string): Promise<MessageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Provider not configured' };
    }

    try {
      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${this.whatsappNumber}`);
      formData.append('To', `whatsapp:${to}`);
      formData.append('Body', message);

      const response = await fetch(`${this.baseUrl}/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Unknown error', errorCode: data.code?.toString() };
      }

      return { success: true, messageId: data.sid };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendTemplateMessage(to: string, template: TemplateParams): Promise<MessageResult> {
    return this.sendTextMessage(to, `Template: ${template.name}`);
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    if (!this.isAvailable()) {
      return { messageId, status: 'failed', error: 'Provider not configured' };
    }

    try {
      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/Accounts/${this.accountSid}/Messages/${messageId}.json`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      const data = await response.json();
      const statusMap: Record<string, MessageStatus['status']> = {
        queued: 'queued', sending: 'sent', sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed', undelivered: 'failed',
      };

      return { messageId, status: statusMap[data.status] || 'sent' };
    } catch (error: any) {
      return { messageId, status: 'failed', error: error.message };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.authToken) return true;
    const expectedSignature = crypto.createHmac('sha1', this.authToken).update(payload).digest('base64');
    return expectedSignature === signature;
  }
}
