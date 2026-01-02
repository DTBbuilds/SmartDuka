import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailAdminController } from './email-admin.controller';
import { SystemEventManagerService } from './system-event-manager.service';
import { Notification, NotificationSchema } from './notification.schema';
import { EmailTemplate, EmailTemplateSchema } from './email-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
    ]),
  ],
  providers: [EmailService, NotificationsService, SystemEventManagerService],
  controllers: [NotificationsController, EmailAdminController],
  exports: [EmailService, NotificationsService, SystemEventManagerService],
})
export class NotificationsModule {}
