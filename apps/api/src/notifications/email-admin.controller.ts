import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmailService } from './email.service';
import { EmailTemplate, EmailTemplateDocument } from './email-template.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { EmailLog, EmailLogDocument } from '../super-admin/schemas/email-log.schema';

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
    @InjectModel(EmailLog.name)
    private readonly emailLogModel: Model<EmailLogDocument>,
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
   * Get email statistics from EmailLog collection
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

    // Use EmailLog model for accurate email statistics
    const [stats] = await this.emailLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$opened', true] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] } },
        },
      },
    ]);

    // Get breakdown by category
    const byCategory = await this.emailLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get breakdown by template
    const byTemplate = await this.emailLogModel.aggregate([
      { $match: { ...matchStage, templateName: { $ne: null } } },
      {
        $group: {
          _id: '$templateName',
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Calculate delivery rate and open rate
    // Note: 'sent' status means successfully delivered by SMTP provider
    const total = stats?.total || 0;
    const sentCount = (stats?.sent || 0) + (stats?.delivered || 0);
    const deliveryRate = total > 0 ? Math.round((sentCount / total) * 100 * 10) / 10 : 0;
    const openRate = sentCount > 0 ? Math.round(((stats?.opened || 0) / sentCount) * 100 * 10) / 10 : 0;

    return {
      summary: {
        total,
        sent: stats?.sent || 0,
        delivered: (stats?.sent || 0) + (stats?.delivered || 0),
        failed: stats?.failed || 0,
        pending: stats?.pending || 0,
        bounced: stats?.bounced || 0,
        opened: stats?.opened || 0,
        clicked: stats?.clicked || 0,
        deliveryRate,
        openRate,
      },
      byCategory: Object.fromEntries(byCategory.map(c => [c._id || 'other', c.count])),
      byTemplate: Object.fromEntries(byTemplate.map(t => [t._id || 'custom', t.count])),
    };
  }

  /**
   * Get recent email logs from EmailLog collection
   */
  @Get('logs')
  async getLogs(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('templateName') templateName?: string,
  ) {
    const query: any = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (templateName) query.templateName = templateName;

    const [logs, total] = await Promise.all([
      this.emailLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip || '0', 10))
        .limit(parseInt(limit || '50', 10))
        .select('to subject status category templateName sentAt failedAt createdAt errorMessage retryCount shopName userName messageId')
        .exec(),
      this.emailLogModel.countDocuments(query),
    ]);

    return { logs, total };
  }

  /**
   * Get single email log details
   */
  @Get('logs/:id')
  async getEmailLog(@Param('id') id: string) {
    const log = await this.emailLogModel.findById(id).exec();
    if (!log) {
      return { error: 'Email log not found' };
    }
    return log;
  }

  /**
   * Retry a failed email
   */
  @Post('logs/:id/retry')
  async retryEmail(@Param('id') id: string) {
    const log = await this.emailLogModel.findById(id).exec();
    if (!log) {
      return { error: 'Email log not found' };
    }
    
    if (log.status !== 'failed') {
      return { error: 'Can only retry failed emails' };
    }

    // Resend the email
    const result = await this.emailService.sendEmail({
      to: log.to,
      subject: log.subject,
      html: log.htmlContent || '<p>Email content not available</p>',
      templateName: log.templateName,
      shopId: log.shopId?.toString(),
      shopName: log.shopName,
      userId: log.userId?.toString(),
      userName: log.userName,
      category: log.category,
    });

    return {
      success: result.success,
      message: result.success ? 'Email resent successfully' : `Failed to resend: ${result.error}`,
      newEmailLogId: result.emailLogId,
    };
  }

  /**
   * Delete an email log
   */
  @Delete('logs/:id')
  async deleteEmailLog(@Param('id') id: string) {
    const result = await this.emailLogModel.findByIdAndDelete(id);
    return { deleted: !!result };
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
          loginUrl: process.env.FRONTEND_URL || 'https://smartduka-eta.vercel.app',
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
      loginUrl: process.env.FRONTEND_URL || 'https://smartduka-eta.vercel.app',
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://smartduka-eta.vercel.app'}/admin`,
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

  /**
   * Bulk delete email logs
   */
  @Delete('logs/bulk')
  async bulkDeleteEmailLogs(@Body() body: { ids: string[] }) {
    const result = await this.emailLogModel.deleteMany({ 
      _id: { $in: body.ids } 
    });
    return { deleted: result.deletedCount };
  }

  // ==================== EMAIL SETTINGS & CONFIGURATION ====================

  /**
   * Get email configuration status
   */
  @Get('config/status')
  async getEmailConfig() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    const isConfigured = !!(host && user && pass);

    return {
      smtpConfigured: isConfigured,
      smtpStatus: isConfigured ? 'configured' : 'not_configured',
      configuration: {
        host: host ? '✓ Set' : '✗ Missing',
        port: port ? `${port}` : '587 (default)',
        user: user ? '✓ Set' : '✗ Missing',
        pass: pass ? '✓ Set' : '✗ Missing',
        from: from || 'SmartDuka <noreply@smartduka.co.ke>',
      },
      missingFields: [
        !host && 'SMTP_HOST',
        !user && 'SMTP_USER',
        !pass && 'SMTP_PASS',
      ].filter(Boolean),
      setupInstructions: {
        gmail: {
          host: 'smtp.gmail.com',
          port: 587,
          user: 'your-email@gmail.com',
          pass: 'Use App Password (not regular password)',
          link: 'https://myaccount.google.com/apppasswords',
        },
        outlook: {
          host: 'smtp-mail.outlook.com',
          port: 587,
          user: 'your-email@outlook.com',
          pass: 'Your Outlook password',
        },
        sendgrid: {
          host: 'smtp.sendgrid.net',
          port: 587,
          user: 'apikey',
          pass: 'Your SendGrid API key',
        },
        aws_ses: {
          host: 'email-smtp.region.amazonaws.com',
          port: 587,
          user: 'Your SMTP username',
          pass: 'Your SMTP password',
        },
      },
      frontendUrl: process.env.FRONTEND_URL,
    };
  }

  /**
   * Test SMTP connection
   */
  @Post('config/test-connection')
  async testSmtpConnection(@Body() body?: { testEmail?: string }) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return {
        success: false,
        error: 'SMTP not configured',
        message: 'Please configure SMTP settings first',
        missingFields: [
          !host && 'SMTP_HOST',
          !user && 'SMTP_USER',
          !pass && 'SMTP_PASS',
        ].filter(Boolean),
      };
    }

    try {
      const testEmail = body?.testEmail || user;
      const testResult = await this.emailService.sendEmail({
        to: testEmail,
        subject: '✅ SmartDuka SMTP Connection Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>✅ SMTP Connection Successful!</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Your SMTP configuration is working correctly.</p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3>Configuration Details:</h3>
                <p><strong>SMTP Host:</strong> ${host}</p>
                <p><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || 465}</p>
                <p><strong>From Address:</strong> ${process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>'}</p>
                <p><strong>Test Email Sent To:</strong> ${testEmail}</p>
              </div>
              <p style="color: #666; font-size: 14px;">
                You can now send emails from SmartDuka. All email communications will be enabled.
              </p>
            </div>
          </div>
        `,
      });

      return {
        success: testResult.success,
        message: 'SMTP connection test successful',
        messageId: testResult.messageId,
        testEmail: testEmail,
        configuration: {
          host,
          port: process.env.SMTP_PORT || 465,
          from: process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'SMTP connection test failed',
        troubleshooting: [
          'Check SMTP credentials are correct',
          'Verify SMTP server is reachable',
          'Check firewall is not blocking SMTP port',
          'For Gmail: Use App Password, not regular password',
          'For Outlook: Enable "Allow less secure apps"',
        ],
      };
    }
  }

  // ==================== EMAIL ANALYTICS ====================

  /**
   * Get detailed email analytics
   */
  @Get('analytics/detailed')
  async getDetailedAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage: any = {};
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Group by different time periods
    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'hour') groupFormat = '%Y-%m-%d %H';
    if (groupBy === 'week') groupFormat = '%Y-%U';
    if (groupBy === 'month') groupFormat = '%Y-%m';

    const timeline = await this.notificationModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top recipients
    const topRecipients = await this.notificationModel.aggregate([
      { $match: matchStage },
      { $group: { _id: '$to', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Email performance by template
    const templatePerformance = await this.notificationModel.aggregate([
      { $match: { ...matchStage, templateName: { $exists: true } } },
      {
        $group: {
          _id: '$templateName',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return {
      timeline,
      topRecipients,
      templatePerformance,
    };
  }

  // ==================== BULK EMAIL OPERATIONS ====================

  /**
   * Send bulk email to multiple recipients
   */
  @Post('bulk/send')
  async sendBulkEmail(@Body() body: {
    to: string[];
    subject: string;
    templateName?: string;
    content?: string;
    variables?: Record<string, any>;
  }) {
    const results: Array<{
      recipient: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    
    for (const recipient of body.to) {
      try {
        let result;
        
        if (body.templateName) {
          result = await this.emailService.sendTemplateEmail({
            to: recipient,
            templateName: body.templateName,
            variables: body.variables || {},
          });
        } else {
          result = await this.emailService.sendEmail({
            to: recipient,
            subject: body.subject,
            html: body.content || '<p>Bulk email message</p>',
          });
        }
        
        results.push({ recipient, success: result.success, messageId: result.messageId });
      } catch (error: any) {
        results.push({ recipient, success: false, error: error.message });
      }
    }

    return {
      total: body.to.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Audit and fix email statuses in database
   * Updates emails that have emailSent=true but status='pending' to status='sent'
   */
  @Post('audit/fix-statuses')
  async fixEmailStatuses() {
    // Find emails where emailSent=true but status is still 'pending'
    const mismatchedEmails = await this.notificationModel.find({
      emailSent: true,
      status: 'pending',
    });

    let fixed = 0;
    for (const email of mismatchedEmails) {
      email.status = 'sent';
      if (!email.emailSentAt) {
        email.emailSentAt = new Date();
      }
      await email.save();
      fixed++;
    }

    // Get current stats after fix
    const stats = await this.notificationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          emailSentTrue: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
        },
      },
    ]);

    return {
      success: true,
      message: `Fixed ${fixed} email statuses`,
      fixed,
      currentStats: stats[0] || { total: 0, sent: 0, pending: 0, failed: 0 },
    };
  }

  /**
   * Get database email audit report
   */
  @Get('audit/report')
  async getAuditReport() {
    const [statusCounts] = await this.notificationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          statusPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          statusSent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          statusFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          emailSentTrue: { $sum: { $cond: [{ $eq: ['$emailSent', true] }, 1, 0] } },
          emailSentFalse: { $sum: { $cond: [{ $eq: ['$emailSent', false] }, 1, 0] } },
          missingTo: { $sum: { $cond: [{ $or: [{ $eq: ['$to', null] }, { $eq: ['$to', ''] }] }, 1, 0] } },
          missingSubject: { $sum: { $cond: [{ $or: [{ $eq: ['$subject', null] }, { $eq: ['$subject', ''] }] }, 1, 0] } },
        },
      },
    ]);

    // Find mismatched statuses (emailSent=true but status=pending)
    const mismatchCount = await this.notificationModel.countDocuments({
      emailSent: true,
      status: 'pending',
    });

    // Get recent emails with issues
    const recentIssues = await this.notificationModel.find({
      $or: [
        { emailSent: true, status: 'pending' },
        { to: { $in: [null, ''] } },
        { subject: { $in: [null, ''] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id to subject status emailSent type createdAt')
      .exec();

    return {
      summary: statusCounts || {},
      issues: {
        statusMismatch: mismatchCount,
        description: 'Emails where emailSent=true but status=pending',
      },
      recentIssues,
      recommendations: [
        mismatchCount > 0 ? `Run POST /admin/emails/audit/fix-statuses to fix ${mismatchCount} mismatched emails` : null,
        statusCounts?.missingTo > 0 ? `${statusCounts.missingTo} emails missing recipient (to) field` : null,
        statusCounts?.missingSubject > 0 ? `${statusCounts.missingSubject} emails missing subject field` : null,
      ].filter(Boolean),
    };
  }

  /**
   * Export email logs to CSV
   */
  @Get('export/csv')
  async exportEmailLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (status) query.status = status;

    const logs = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Limit for performance
      .exec();

    // Convert to CSV format
    const csvHeaders = [
      'ID', 'To', 'Subject', 'Template', 'Status', 
      'Created At', 'Sent At', 'Error Message', 'Shop ID', 'User ID'
    ];
    
    const csvRows = logs.map((log) => {
      const anyLog = log as any;
      return [
        anyLog._id,
        anyLog.to || '',
        anyLog.subject || '',
        anyLog.templateName || '',
        anyLog.status,
        anyLog.createdAt || '',
        anyLog.emailSentAt || '',
        anyLog.errorMessage || '',
        anyLog.shopId?.toString() || '',
        anyLog.userId?.toString() || '',
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}
