export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface MessageStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: Date;
  error?: string;
}

export interface TemplateParams {
  name: string;
  language?: string;
  components?: any[];
}

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  phoneNumberId?: string;
  accountSid?: string;
  authToken?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  
  isAvailable(): boolean;
  
  sendTextMessage(to: string, message: string): Promise<MessageResult>;
  
  sendTemplateMessage(to: string, template: TemplateParams): Promise<MessageResult>;
  
  getMessageStatus(messageId: string): Promise<MessageStatus>;
  
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
