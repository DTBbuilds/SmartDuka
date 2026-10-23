import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportPreferencesController } from './report-preferences.controller';
import { ReportPreferencesService } from './report-preferences.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportRendererService } from './report-renderer.service';
import { ReportNarrativeService } from './report-narrative.service';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ReportPreferences, ReportPreferencesSchema } from './schemas/report-preferences.schema';
import { ReportRun, ReportRunSchema } from './schemas/report-run.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Shop', schema: ShopSchema },
      { name: User.name, schema: UserSchema },
      { name: ReportPreferences.name, schema: ReportPreferencesSchema },
      { name: ReportRun.name, schema: ReportRunSchema },
    ]),
    NotificationsModule,
  ],
  providers: [
    ReportsService,
    ReportPreferencesService,
    ReportSchedulerService,
    ReportRendererService,
    ReportNarrativeService,
  ],
  controllers: [ReportsController, ReportPreferencesController],
  exports: [ReportsService, ReportPreferencesService, ReportSchedulerService],
})
export class ReportsModule {}
