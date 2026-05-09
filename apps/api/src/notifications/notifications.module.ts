import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailAdminController } from './email-admin.controller';
import { SystemEventManagerService } from './system-event-manager.service';
import { ExpiryAlertService } from './expiry-alert.service';
import { ExpiryTrackingService } from '../inventory/services/expiry-tracking.service';
import { Notification, NotificationSchema } from './notification.schema';
import { EmailTemplate, EmailTemplateSchema } from './email-template.schema';
import { EmailLog, EmailLogSchema } from '../super-admin/schemas/email-log.schema';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  providers: [EmailService, NotificationsService, SystemEventManagerService, ExpiryAlertService, ExpiryTrackingService],
  controllers: [NotificationsController, EmailAdminController],
  exports: [EmailService, NotificationsService, SystemEventManagerService, ExpiryAlertService],
})
export class NotificationsModule {}
