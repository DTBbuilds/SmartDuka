import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// Schemas
import { AiInsight, AiInsightSchema } from './schemas/ai-insight.schema';
import { AiAuditLog, AiAuditLogSchema } from './schemas/ai-audit-log.schema';
import { AiFeedback, AiFeedbackSchema } from './schemas/ai-feedback.schema';

// Services
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { DemandForecastService } from './services/demand-forecast.service';
import { BusinessSummaryService } from './services/business-summary.service';
import { ReorderOptimizerService } from './services/reorder-optimizer.service';
import { AiInsightsService } from './services/ai-insights.service';
import { AiDataService } from './services/ai-data.service';
import { AiReportSchedulerService } from './services/ai-report-scheduler.service';

// Controllers
import { AiInsightsController } from './controllers/ai-insights.controller';

// External modules
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsModule } from '../reports/reports.module';

// Import schemas from other modules
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiInsight.name, schema: AiInsightSchema },
      { name: AiAuditLog.name, schema: AiAuditLogSchema },
      { name: AiFeedback.name, schema: AiFeedbackSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
    forwardRef(() => WhatsAppModule),
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AiInsightsController],
  providers: [
    AiDataService,
    AiOrchestratorService,
    AnomalyDetectionService,
    DemandForecastService,
    BusinessSummaryService,
    ReorderOptimizerService,
    AiInsightsService,
    AiReportSchedulerService,
  ],
  exports: [
    AiOrchestratorService,
    AiInsightsService,
    AiDataService,
    AiReportSchedulerService,
  ],
})
export class AiModule {}
