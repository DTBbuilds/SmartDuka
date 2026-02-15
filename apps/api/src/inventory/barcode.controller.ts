import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { ScanBarcodeDto, GenerateBarcodeDto, BulkImportBarcodesDto, ValidateBarcodeDto } from './dto/barcode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory/barcode')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('scan')
  @Roles('admin', 'cashier')
  async scanBarcode(
    @Body() dto: ScanBarcodeDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.barcodeService.scanBarcode(dto.barcode, user.shopId);
  }

  @Post('generate/:productId')
  @Roles('admin')
  async generateBarcode(
    @Param('productId') productId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.barcodeService.generateBarcode(productId, user.shopId);
  }

  @Post('validate')
  async validateBarcode(@Body() dto: ValidateBarcodeDto) {
    return this.barcodeService.validateBarcode(dto.barcode);
  }

  @Post('bulk-import')
  @Roles('admin')
  async bulkImport(
    @Body() dto: BulkImportBarcodesDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.barcodeService.bulkImportBarcodes(user.shopId, dto.barcodes);
  }
}
