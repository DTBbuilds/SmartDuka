import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { ShopAuditLog, ShopAuditLogSchema } from '../shops/schemas/shop-audit-log.schema';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: ShopAuditLog.name, schema: ShopAuditLogSchema },
    ]),
  ],
  providers: [SuperAdminService, ShopAuditLogService],
  controllers: [SuperAdminController],
  exports: [SuperAdminService, ShopAuditLogService],
})
export class SuperAdminModule {}
