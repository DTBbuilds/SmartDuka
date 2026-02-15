// WhatsApp Module Exports
export * from './whatsapp.module';

// Schemas
export * from './schemas/whatsapp-message.schema';
export * from './schemas/whatsapp-config.schema';

// Services
export * from './services/whatsapp.service';
export * from './services/whatsapp-template.service';
export * from './services/whatsapp-provider.service';

// DTOs
export * from './dto';

// Provider Interface (exclude MessageStatus to avoid conflict)
export type { WhatsAppProvider, MessageResult, TemplateParams } from './providers/whatsapp-provider.interface';
