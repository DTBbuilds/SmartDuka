import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmailService } from './email.service';
import { EmailTemplate, EmailTemplateDocument } from './email-template.schema';
import { Notification, NotificationDocument } from './notification.schema';

/**
 * Super Admin Email Management Controller
 * 
 * Provides endpoints for super admins to:
 * - View and manage email templates
 * - View email logs and statistics
 * - Test email sending
 * - Configure email settings
 */
@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class EmailAdminController {
  constructor(
    private readonly emailService: EmailService,
    @InjectModel(EmailTemplate.name)
    private readonly templateModel: Model<EmailTemplateDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // ==================== TEMPLATE MANAGEMENT ====================

  /**
   * Get all email templates
   */
  @Get('templates')
  async getTemplates() {
    return this.templateModel.find().sort({ name: 1 }).exec();
  }

  /**
   * Get a single template by name
   */
  @Get('templates/:name')
  async getTemplate(@Param('name') name: string) {
    return this.templateModel.findOne({ name }).exec();
  }

  /**
   * Create or update an email template
   */
  @Put('templates/:name')
  async updateTemplate(
    @Param('name') name: string,
    @Body() body: {
      subject: string;
      htmlContent: string;
      textContent?: string;
      variables?: string[];
      description?: string;
      active?: boolean;
    },
  ) {
    return this.templateModel.findOneAndUpdate(
      { name },
      { $set: { ...body, name } },
      { upsert: true, new: true },
    );
  }

  /**
   * Delete an email template
   */
  @Delete('templates/:name')
  async deleteTemplate(@Param('name') name: string) {
    const result = await this.templateModel.deleteOne({ name });
    return { deleted: result.deletedCount > 0 };
  }

  /**
   * Toggle template active status
   */
  @Put('templates/:name/toggle')
  async toggleTemplate(@Param('name') name: string) {
    const template = await this.templateModel.findOne({ name });
    if (!template) {
      return { error: 'Template not found' };
    }
    template.active = !template.active;
    await template.save();
    return template;
  }

  // ==================== EMAIL LOGS & STATISTICS ====================

  /**
   * Get email statistics
   */
  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage: any = {};
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    const [stats] = await this.notificationModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        },
      },
    ]);

    const byType = await this.notificationModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      summary: stats || { total: 0, sent: 0, failed: 0, pending: 0 },
      byType,
    };
  }

  /**
   * Get recent email logs
   */
  @Get('logs')
  async getLogs(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const [logs, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip || '0', 10))
        .limit(parseInt(limit || '50', 10))
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return { logs, total };
  }

  // ==================== TEST EMAIL ====================

  /**
   * Send a test email
   */
  @Post('test')
  async sendTestEmail(
    @Body() body: {
      to: string;
      templateName?: string;
      subject?: string;
      content?: string;
      variables?: Record<string, any>;
    },
  ) {
    if (body.templateName) {
      // Send using template
      return this.emailService.sendTemplateEmail({
        to: body.to,
        templateName: body.templateName,
        variables: body.variables || {
          shopName: 'Test Shop',
          userName: 'Test User',
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      });
    } else {
      // Send custom email
      return this.emailService.sendEmail({
        to: body.to,
        subject: body.subject || 'Test Email from SmartDuka',
        html: body.content || '<h1>Test Email</h1><p>This is a test email from SmartDuka.</p>',
      });
    }
  }

  /**
   * Preview a template with sample data
   */
  @Post('templates/:name/preview')
  async previewTemplate(
    @Param('name') name: string,
    @Body() variables?: Record<string, any>,
  ) {
    const template = await this.templateModel.findOne({ name });
    if (!template) {
      return { error: 'Template not found' };
    }

    // Default preview variables
    const defaultVars: Record<string, any> = {
      shopName: 'Demo Shop',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin`,
      planName: 'Professional',
      price: '2,500',
      billingCycle: 'month',
      date: new Date().toLocaleDateString('en-KE'),
      amount: '2,500',
      currency: 'KES',
      productCount: 5,
      daysLeft: 7,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE'),
      ...variables,
    };

    // Replace variables in template
    let html = template.htmlContent;
    let subject = template.subject;

    for (const [key, value] of Object.entries(defaultVars)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
    }

    return {
      subject,
      html,
      variables: template.variables,
    };
  }

  // ==================== RESEED TEMPLATES ====================

  /**
   * Reseed default email templates
   */
  @Post('templates/reseed')
  async reseedTemplates() {
    await this.emailService.seedTemplates();
    return { success: true, message: 'Templates reseeded successfully' };
  }
}
