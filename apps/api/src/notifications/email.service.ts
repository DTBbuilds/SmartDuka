import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from './email-template.schema';
import { EmailLog, EmailLogDocument } from '../super-admin/schemas/email-log.schema';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
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
  // Logging metadata
  shopId?: string;
  shopName?: string;
  userId?: string;
  userName?: string;
  category?: string;
  templateName?: string;
  templateVariables?: Record<string, any>;
  triggeredBy?: string;
}

export interface TemplateEmailOptions {
  to: string | string[];
  templateName: string;
  variables: Record<string, any>;
  attachments?: EmailOptions['attachments'];
}

type EmailProvider = 'resend' | 'smtp' | 'none';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private activeProvider: EmailProvider = 'none';
  private readonly maxRetries = 2;
  private readonly retryDelayMs = 1000;

  constructor(
    @InjectModel(EmailTemplate.name)
    private readonly templateModel: Model<EmailTemplateDocument>,
    @InjectModel(EmailLog.name)
    private readonly emailLogModel: Model<EmailLogDocument>,
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize email providers - Resend (primary) then SMTP (fallback)
   * Resend uses HTTP API which bypasses SMTP port blocking on Render
   */
  private initializeProviders() {
    // Try Resend first (recommended for Render - uses HTTP API)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        this.resend = new Resend(resendApiKey);
        this.activeProvider = 'resend';
        this.logger.log('✅ Email provider: Resend (HTTP API)');
        return;
      } catch (error: any) {
        this.logger.warn(`⚠️ Resend initialization failed: ${error.message}`);
      }
    }

    // Fallback to SMTP (may not work on Render due to port blocking)
    this.initializeSmtpTransporter();
  }

  private initializeSmtpTransporter() {
    const host = process.env.SMTP_HOST;
    // Default to port 465 (SSL) as it's more reliable across networks
    // Port 587 (STARTTLS) is often blocked by firewalls/ISPs
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>';

    // Log configuration status (only once, concisely)
    this.logger.log(`SMTP Config: host=${host ? '✓' : '✗'}, user=${user ? '✓' : '✗'}, pass=${pass ? '✓' : '✗'}, port=${port}`);

    if (!host || !user || !pass) {
      this.logger.warn('⚠️  SMTP not configured - email sending DISABLED. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 45000,
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      // Skip verification in development if using placeholder credentials
      const isPlaceholder = user?.includes('your-email') || pass?.includes('your-app');
      if (isPlaceholder) {
        this.logger.warn('⚠️  SMTP using placeholder credentials - email sending will fail. Update SMTP_USER and SMTP_PASS in .env');
        return;
      }

      // Verify connection asynchronously - don't block startup
      // Use a shorter timeout for verification to fail fast
      const verifyTimeout = setTimeout(() => {
        this.logger.warn('⚠️  SMTP verification skipped (timeout) - emails will be sent on-demand');
      }, 5000);

      this.transporter.verify((error) => {
        clearTimeout(verifyTimeout);
        if (error) {
          this.logger.warn(`⚠️  SMTP verification failed: ${error.message}`);
          // Provide helpful hints based on error type
          if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            this.logger.warn('   → Check: Firewall blocking port 465? VPN interfering? SMTP server down?');
          } else if (error.message.includes('auth') || error.message.includes('535')) {
            this.logger.warn('   → Check: For Gmail, use App Password (not regular password)');
          } else if (error.message.includes('certificate') || error.message.includes('TLS')) {
            this.logger.warn('   → Check: TLS/SSL certificate issue with SMTP server');
          }
          // Keep transporter - emails may still work when actually sending
          this.logger.log('   → Email sending will be attempted on-demand');
        } else {
          this.activeProvider = 'smtp';
          this.logger.log(`✅ SMTP connected: ${host}:${port}`);
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize SMTP transporter:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Get current email provider status
   */
  getProviderStatus(): { provider: EmailProvider; ready: boolean } {
    return {
      provider: this.activeProvider,
      ready: this.activeProvider !== 'none',
    };
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; emailLogId?: string }> {
    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const toAddress = toArray.join(', ');
    const from = options.from || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.co.ke>';
    
    // Create email log entry first
    let emailLog: EmailLogDocument | null = null;
    try {
      emailLog = new this.emailLogModel({
        to: toAddress,
        subject: options.subject,
        htmlContent: options.html?.substring(0, 1000), // Store first 1000 chars
        textContent: options.text?.substring(0, 500),
        from,
        replyTo: options.replyTo,
        shopId: options.shopId ? new Types.ObjectId(options.shopId) : undefined,
        shopName: options.shopName,
        userId: options.userId ? new Types.ObjectId(options.userId) : undefined,
        userName: options.userName,
        category: options.category || 'other',
        templateName: options.templateName,
        templateVariables: options.templateVariables,
        triggeredBy: options.triggeredBy || 'system',
        status: 'pending',
        retryCount: 0,
      });
      await emailLog.save();
    } catch (logError: any) {
      this.logger.warn(`Failed to create email log: ${logError.message}`);
    }

    // Try Resend first (HTTP API - works on Render)
    if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from,
          to: toArray,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        this.logger.log(`Email sent via Resend to ${toAddress}: ${result.data?.id}`);
        
        if (emailLog) {
          await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
            status: 'sent',
            sentAt: new Date(),
            messageId: result.data?.id,
            provider: 'resend',
          });
        }
        
        return { success: true, messageId: result.data?.id, emailLogId: emailLog?._id?.toString() };
      } catch (error: any) {
        this.logger.warn(`Resend failed for ${toAddress}: ${error.message}`);
        // Fall through to SMTP if available
        if (!this.transporter) {
          if (emailLog) {
            await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
              status: 'failed',
              failedAt: new Date(),
              errorMessage: error.message,
              provider: 'resend',
            });
          }
          return { success: false, error: error.message, emailLogId: emailLog?._id?.toString() };
        }
      }
    }

    // Fallback to SMTP
    if (!this.transporter) {
      this.logger.warn('Email not sent - no provider configured (set RESEND_API_KEY or SMTP credentials)');
      if (emailLog) {
        await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
          status: 'failed',
          failedAt: new Date(),
          errorMessage: 'No email provider configured',
        });
      }
      return { success: false, error: 'No email provider configured', emailLogId: emailLog?._id?.toString() };
    }

    // SMTP with retry logic for transient failures
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.transporter.sendMail({
          from,
          to: toAddress,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
          attachments: options.attachments,
        });

        this.logger.log(`Email sent via SMTP to ${toAddress}: ${result.messageId}${attempt > 0 ? ` (retry ${attempt})` : ''}`);
        
        if (emailLog) {
          await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
            status: 'sent',
            sentAt: new Date(),
            messageId: result.messageId,
            provider: 'smtp',
            retryCount: attempt,
          });
        }
        
        return { success: true, messageId: result.messageId, emailLogId: emailLog?._id?.toString() };
      } catch (error: any) {
        lastError = error;
        
        // Only retry on transient errors (timeout, connection issues)
        const isRetryable = error.code === 'ETIMEDOUT' || 
                           error.code === 'ECONNRESET' || 
                           error.code === 'ECONNREFUSED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('Connection');
        
        if (isRetryable && attempt < this.maxRetries) {
          this.logger.warn(`SMTP to ${toAddress} failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (attempt + 1)));
          continue;
        }
        
        break;
      }
    }

    // All retries exhausted
    this.logger.error(`Failed to send email to ${toAddress} after ${this.maxRetries + 1} attempts:`, lastError?.message);
    
    if (emailLog) {
      await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: lastError?.message || 'Unknown error',
        errorCode: (lastError as any)?.code,
        provider: 'smtp',
        retryCount: this.maxRetries,
      });
    }
    
    return { success: false, error: lastError?.message || 'Unknown error', emailLogId: emailLog?._id?.toString() };
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
        <a href="${process.env.FRONTEND_URL || 'https://www.smartduka.org'}" style="color: #2563eb; text-decoration: none;">Visit SmartDuka</a> |
        <a href="${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/help" style="color: #2563eb; text-decoration: none;">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Wrap content in SmartDuka branded email layout (public for manual emails)
   */
  wrapInLayout(content: string, footerText?: string): string {
    // Check if content already has full HTML structure
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      return content;
    }

    // Convert plain text line breaks to HTML if content appears to be plain text
    let htmlContent = content;
    if (!content.includes('<p>') && !content.includes('<div>') && !content.includes('<br')) {
      // Convert markdown-style links to HTML
      htmlContent = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>');
      // Convert line breaks to paragraphs
      htmlContent = content
        .split(/\n\n+/)
        .map(para => `<p style="margin: 0 0 15px 0;">${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    return this.getBaseLayout(`
      <div class="header">
        <h1>SmartDuka</h1>
      </div>
      <div class="content">
        ${htmlContent}
      </div>
    `, footerText || 'This message was sent by the SmartDuka team.');
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
