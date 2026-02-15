import { Body, Controller, Get, Post, Put, Param, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptTemplateDto } from './dto/create-receipt-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('templates')
  @Roles('admin')
  async createTemplate(
    @Body() dto: CreateReceiptTemplateDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.receiptsService.createTemplate(user.shopId, dto);
  }

  @Get('templates')
  @Roles('admin')
  async listTemplates(@CurrentUser() user: Record<string, any>) {
    return this.receiptsService.findAll(user.shopId);
  }

  @Get('templates/default')
  async getDefaultTemplate(@CurrentUser() user: Record<string, any>) {
    return this.receiptsService.getDefault(user.shopId);
  }

  @Get('templates/:id')
  @Roles('admin')
  async getTemplate(@Param('id') id: string) {
    return this.receiptsService.findById(id);
  }

  @Put('templates/:id')
  @Roles('admin')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateReceiptTemplateDto>,
  ) {
    return this.receiptsService.updateTemplate(id, dto);
  }
}
