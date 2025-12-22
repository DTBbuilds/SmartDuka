import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from './email-template.schema';
import * as nodemailer from 'nodemailer';
import { getAllTemplatesForSeeding } from './email-templates';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface TemplateEmailOptions {
  to: string | string[];
  templateName: string;
  variables: Record<string, any>;
  attachments?: EmailOptions['attachments'];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectModel(EmailTemplate.name)
    private readonly templateModel: Model<EmailTemplateDocument>,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>';

    // Log configuration status
    this.logger.log('=== SMTP Configuration Status ===');
    this.logger.log(`SMTP_HOST: ${host ? '✓ Configured' : '✗ Missing'}`);
    this.logger.log(`SMTP_PORT: ${port || 587}`);
    this.logger.log(`SMTP_USER: ${user ? '✓ Configured' : '✗ Missing'}`);
    this.logger.log(`SMTP_PASS: ${pass ? '✓ Configured' : '✗ Missing'}`);
    this.logger.log(`SMTP_FROM: ${from}`);

    if (!host || !user || !pass) {
      this.logger.warn('⚠️  SMTP configuration incomplete. Email sending is DISABLED.');
      this.logger.warn('To enable email sending, set these environment variables:');
      if (!host) this.logger.warn('  - SMTP_HOST (e.g., smtp.gmail.com)');
      if (!user) this.logger.warn('  - SMTP_USER (your email address)');
      if (!pass) this.logger.warn('  - SMTP_PASS (your app password or password)');
      this.logger.warn('See .env.example for detailed SMTP configuration instructions.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      // Verify connection asynchronously
      this.transporter.verify((error) => {
        if (error) {
          this.logger.error('❌ SMTP connection failed:', error.message);
          this.logger.error('Possible issues:');
          this.logger.error('  - Incorrect SMTP credentials');
          this.logger.error('  - SMTP server not reachable');
          this.logger.error('  - Firewall blocking SMTP port');
          this.logger.error('  - For Gmail: Use App Password, not regular password');
        } else {
          this.logger.log('✅ SMTP connection established successfully');
          this.logger.log(`   Connected to: ${host}:${port}`);
          this.logger.log(`   From address: ${from}`);
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize SMTP transporter:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      this.logger.warn('Email not sent - SMTP not configured');
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const from = options.from || process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>';
      
      const result = await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendTemplateEmail(options: TemplateEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = await this.templateModel.findOne({ 
      name: options.templateName,
      active: true,
    });

    if (!template) {
      return { success: false, error: `Template '${options.templateName}' not found` };
    }

    // Replace variables in template
    let html = template.htmlContent;
    let subject = template.subject;
    let text = template.textContent || '';

    for (const [key, value] of Object.entries(options.variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
      text = text.replace(regex, String(value));
    }

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text: text || undefined,
      attachments: options.attachments,
    });
  }

  /**
   * Generate base email layout with SmartDuka branding
   */
  private getBaseLayout(content: string, footerText?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f5; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #1d4ed8; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8fafc; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .highlight-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .error-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .success-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 15px 0; }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 10px; }
      .content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      ${content}
    </div>
    <div class="footer">
      <p>${footerText || 'This is an automated message from SmartDuka.'}</p>
      <p>© ${new Date().getFullYear()} SmartDuka. All rights reserved.</p>
      <p style="margin-top: 10px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #2563eb; text-decoration: none;">Visit SmartDuka</a> |
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help" style="color: #2563eb; text-decoration: none;">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  // Seed default email templates with professional SmartDuka branding
  async seedTemplates(): Promise<void> {
    const templates = getAllTemplatesForSeeding();

    for (const template of templates) {
      if (!template) continue;
      await this.templateModel.updateOne(
        { name: template.name },
        { $set: template },
        { upsert: true },
      );
    }

    this.logger.log(`Seeded ${templates.length} professional email templates with SmartDuka branding`);
  }

}
