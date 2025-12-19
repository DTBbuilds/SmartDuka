import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from './email-template.schema';
import * as nodemailer from 'nodemailer';

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

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete. Email sending disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error.message);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
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

  // Seed default email templates
  async seedTemplates(): Promise<void> {
    const templates = [
      {
        name: 'welcome',
        subject: 'Welcome to SmartDuka, {{shopName}}! 🎉',
        description: 'Sent when a new shop is registered',
        variables: ['shopName', 'userName', 'loginUrl', 'planName', 'trialDays', 'billingCycle', 'planPrice', 'maxShops', 'maxEmployees', 'maxProducts'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
    .logo { width: 60px; height: 60px; background: white; border-radius: 12px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
    .logo svg { width: 36px; height: 36px; }
    .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 35px 30px; }
    .greeting { font-size: 18px; color: #374151; margin-bottom: 20px; }
    .highlight-box { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; }
    .highlight-box h3 { margin: 0 0 5px; color: #059669; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .highlight-box .value { font-size: 24px; font-weight: 700; color: #047857; }
    .plan-card { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 25px 0; }
    .plan-header { display: flex; align-items: center; margin-bottom: 15px; }
    .plan-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
    .plan-icon svg { width: 24px; height: 24px; fill: white; }
    .plan-name { font-size: 22px; font-weight: 700; color: #1e40af; margin: 0; }
    .plan-price { font-size: 14px; color: #3b82f6; margin: 4px 0 0; }
    .plan-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 15px; }
    .feature-item { background: white; border-radius: 8px; padding: 12px; text-align: center; }
    .feature-icon { font-size: 20px; margin-bottom: 4px; }
    .feature-value { font-size: 18px; font-weight: 700; color: #1f2937; }
    .feature-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .checklist { margin: 25px 0; padding: 0; list-style: none; }
    .checklist li { padding: 10px 0; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; }
    .checklist li:last-child { border-bottom: none; }
    .check-icon { width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
    .check-icon svg { width: 14px; height: 14px; fill: white; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
    .button:hover { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); }
    .help-section { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; }
    .help-section h4 { margin: 0 0 10px; color: #374151; font-size: 16px; }
    .help-section p { margin: 0; color: #6b7280; font-size: 14px; }
    .help-section a { color: #2563eb; text-decoration: none; font-weight: 600; }
    .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
    .footer-logo { font-size: 20px; font-weight: 700; color: white; margin-bottom: 10px; }
    .footer p { margin: 5px 0; font-size: 13px; }
    .footer a { color: #60a5fa; text-decoration: none; }
    .social-links { margin: 15px 0; }
    .social-links a { display: inline-block; margin: 0 8px; color: #9ca3af; }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 10px; }
      .content { padding: 25px 20px; }
      .plan-features { grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .feature-item { padding: 10px 8px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="#2563eb"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </div>
        <h1>Welcome to SmartDuka! 🎉</h1>
        <p>Your business management journey starts now</p>
      </div>
      
      <div class="content">
        <p class="greeting">Hello <strong>{{userName}}</strong>,</p>
        
        <p>Congratulations! Your shop <strong>{{shopName}}</strong> has been successfully registered on SmartDuka. We're thrilled to have you join thousands of businesses using our platform to grow and succeed.</p>
        
        <div class="highlight-box">
          <h3>🎁 Your Free Trial</h3>
          <div class="value">{{trialDays}} Days Free Access</div>
          <p style="margin: 10px 0 0; color: #059669; font-size: 14px;">Explore all features with no commitment</p>
        </div>
        
        <div class="plan-card">
          <div class="plan-header">
            <div class="plan-icon">
              <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            </div>
            <div>
              <h3 class="plan-name">{{planName}} Plan</h3>
              <p class="plan-price">KES {{planPrice}}/{{billingCycle}}</p>
            </div>
          </div>
          <div class="plan-features">
            <div class="feature-item">
              <div class="feature-icon">🏪</div>
              <div class="feature-value">{{maxShops}}</div>
              <div class="feature-label">Shops</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">👥</div>
              <div class="feature-value">{{maxEmployees}}</div>
              <div class="feature-label">Staff</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📦</div>
              <div class="feature-value">{{maxProducts}}</div>
              <div class="feature-label">Products</div>
            </div>
          </div>
        </div>
        
        <h3 style="color: #1f2937; margin: 25px 0 15px;">What you can do with SmartDuka:</h3>
        <ul class="checklist">
          <li>
            <span class="check-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span>Manage inventory with real-time stock tracking</span>
          </li>
          <li>
            <span class="check-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span>Process sales and generate professional receipts</span>
          </li>
          <li>
            <span class="check-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span>Accept M-Pesa payments seamlessly</span>
          </li>
          <li>
            <span class="check-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span>Get detailed sales reports and analytics</span>
          </li>
          <li>
            <span class="check-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span>Manage staff with role-based access</span>
          </li>
        </ul>
        
        <div class="button-container">
          <a href="{{loginUrl}}" class="button">🚀 Get Started Now</a>
        </div>
        
        <div class="help-section">
          <h4>Need Help Getting Started?</h4>
          <p>Our support team is here for you 24/7.<br>
          Email us at <a href="mailto:support@smartduka.co.ke">support@smartduka.co.ke</a> or visit our <a href="{{loginUrl}}/help">Help Center</a></p>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-logo">🛒 SmartDuka</div>
        <p>The smart way to manage your business</p>
        <div class="social-links">
          <a href="#">📘 Facebook</a>
          <a href="#">🐦 Twitter</a>
          <a href="#">📸 Instagram</a>
        </div>
        <p style="margin-top: 15px;">© ${new Date().getFullYear()} SmartDuka. All rights reserved.</p>
        <p style="font-size: 11px; color: #6b7280;">You received this email because you registered for SmartDuka.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'low_stock_alert',
        subject: 'Low Stock Alert - {{productCount}} products need attention',
        description: 'Sent when products fall below reorder level',
        variables: ['shopName', 'productCount', 'productList', 'dashboardUrl'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Low Stock Alert</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>This is an automated alert for <strong>{{shopName}}</strong>.</p>
      <div class="alert-box">
        <strong>{{productCount}} products</strong> are running low on stock and need your attention.
      </div>
      {{productList}}
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">View Inventory</a>
      </p>
      <p>Please restock these items soon to avoid stockouts.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'daily_sales_report',
        subject: 'Daily Sales Report for {{date}} - {{shopName}}',
        description: 'Daily sales summary sent to shop admins',
        variables: ['shopName', 'date', 'totalSales', 'orderCount', 'topProducts', 'dashboardUrl'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .stat-box { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 28px; font-weight: bold; color: #10b981; }
    .stat-label { color: #666; font-size: 14px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Sales Report</h1>
      <p>{{date}}</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Here's your daily sales summary for <strong>{{shopName}}</strong>:</p>
      <div style="display: flex; gap: 10px;">
        <div class="stat-box" style="flex: 1;">
          <div class="stat-value">KES {{totalSales}}</div>
          <div class="stat-label">Total Sales</div>
        </div>
        <div class="stat-box" style="flex: 1;">
          <div class="stat-value">{{orderCount}}</div>
          <div class="stat-label">Orders</div>
        </div>
      </div>
      <h3>Top Selling Products</h3>
      {{topProducts}}
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">View Full Report</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'subscription_expiring',
        subject: 'Your SmartDuka subscription expires in {{daysLeft}} days',
        description: 'Sent when subscription is about to expire',
        variables: ['shopName', 'userName', 'planName', 'expiryDate', 'daysLeft', 'renewUrl'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning-box { background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 15px; margin: 15px 0; text-align: center; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Subscription Expiring Soon</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <div class="warning-box">
        <p style="font-size: 18px; margin: 0;">Your <strong>{{planName}}</strong> subscription for <strong>{{shopName}}</strong> expires on <strong>{{expiryDate}}</strong>.</p>
        <p style="font-size: 24px; font-weight: bold; color: #ef4444; margin: 10px 0;">{{daysLeft}} days left</p>
      </div>
      <p>To avoid any interruption to your service, please renew your subscription before it expires.</p>
      <p style="text-align: center;">
        <a href="{{renewUrl}}" class="button">Renew Now</a>
      </p>
      <p>If you have any questions about your subscription, please contact our support team.</p>
      <p>Best regards,<br>The SmartDuka Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'password_reset',
        subject: 'Reset your SmartDuka password',
        description: 'Sent when user requests password reset',
        variables: ['userName', 'resetUrl', 'expiryMinutes'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .note { background: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>We received a request to reset your SmartDuka password. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </p>
      <p class="note">This link will expire in {{expiryMinutes}} minutes. If you didn't request this, you can safely ignore this email.</p>
      <p>Best regards,<br>The SmartDuka Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'subscription_activated',
        subject: '✅ Your {{planName}} subscription is now active!',
        description: 'Sent when subscription is activated',
        variables: ['shopName', 'userName', 'planName', 'price', 'billingCycle', 'features', 'startDate', 'nextBillingDate', 'dashboardUrl'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .plan-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .plan-name { font-size: 24px; font-weight: bold; color: #10b981; }
    .plan-price { font-size: 18px; color: #666; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Subscription Activated!</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>Great news! Your subscription for <strong>{{shopName}}</strong> is now active.</p>
      <div class="plan-box">
        <div class="plan-name">{{planName}}</div>
        <div class="plan-price">KES {{price}} / {{billingCycle}}</div>
      </div>
      <p><strong>Subscription Details:</strong></p>
      <ul>
        <li>Start Date: {{startDate}}</li>
        <li>Next Billing: {{nextBillingDate}}</li>
      </ul>
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
      </p>
      <p>Thank you for choosing SmartDuka!</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'subscription_expired',
        subject: '⚠️ Your SmartDuka subscription has expired',
        description: 'Sent when subscription expires',
        variables: ['shopName', 'userName', 'planName', 'expiredDate', 'renewUrl', 'gracePeriodDays'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Subscription Expired</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <div class="alert-box">
        <p style="font-size: 18px; margin: 0;">Your <strong>{{planName}}</strong> subscription for <strong>{{shopName}}</strong> expired on <strong>{{expiredDate}}</strong>.</p>
      </div>
      <p>Your account is now limited. To restore full access to all features, please renew your subscription.</p>
      <p><strong>Grace Period:</strong> You have {{gracePeriodDays}} days to renew before your data is archived.</p>
      <p style="text-align: center;">
        <a href="{{renewUrl}}" class="button">Renew Now</a>
      </p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'payment_successful',
        subject: '✅ Payment Received - {{amount}} {{currency}}',
        description: 'Sent when payment is successful',
        variables: ['shopName', 'userName', 'amount', 'currency', 'paymentMethod', 'transactionId', 'planName', 'receiptUrl', 'date'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .receipt-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Received</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>We've received your payment for <strong>{{shopName}}</strong>.</p>
      <div class="receipt-box">
        <div class="amount">{{currency}} {{amount}}</div>
        <div class="detail-row"><span>Date:</span><strong>{{date}}</strong></div>
        <div class="detail-row"><span>Plan:</span><strong>{{planName}}</strong></div>
        <div class="detail-row"><span>Payment Method:</span><strong>{{paymentMethod}}</strong></div>
        <div class="detail-row"><span>Transaction ID:</span><strong>{{transactionId}}</strong></div>
      </div>
      <p style="text-align: center;">
        <a href="{{receiptUrl}}" class="button">View Receipt</a>
      </p>
      <p>Thank you for your payment!</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'employee_invited',
        subject: 'You\'ve been invited to join {{shopName}} on SmartDuka',
        description: 'Sent when an employee is invited',
        variables: ['shopName', 'employeeName', 'role', 'invitedBy', 'loginUrl', 'tempPassword'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 10px; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hello {{employeeName}},</p>
      <p><strong>{{invitedBy}}</strong> has invited you to join <strong>{{shopName}}</strong> on SmartDuka as a <strong>{{role}}</strong>.</p>
      <div class="credentials-box">
        <p><strong>Your temporary password:</strong></p>
        <p style="font-size: 20px; font-family: monospace; background: white; padding: 10px; border-radius: 4px; text-align: center;">{{tempPassword}}</p>
        <p class="warning">⚠️ Please change your password after your first login for security.</p>
      </div>
      <p style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Login to SmartDuka</a>
      </p>
      <p>If you have any questions, please contact your administrator.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'shop_verified',
        subject: '🎉 Congratulations! Your shop {{shopName}} is now verified!',
        description: 'Sent when a shop is verified by super admin',
        variables: ['shopName', 'verificationDate', 'loginUrl', 'dashboardUrl'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
    .features-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .feature-item { display: flex; align-items: center; margin: 10px 0; }
    .feature-icon { color: #10b981; margin-right: 10px; font-size: 18px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
    .button-secondary { background: #6b7280; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Shop Verified!</h1>
      <p style="margin: 0; opacity: 0.9;">Your business is ready to go</p>
    </div>
    <div class="content">
      <p>Great news!</p>
      <p>Your shop <strong>{{shopName}}</strong> has been successfully verified and activated on SmartDuka.</p>
      
      <div style="text-align: center;">
        <span class="success-badge">✓ VERIFIED</span>
      </div>
      
      <p><strong>Verification Date:</strong> {{verificationDate}}</p>
      
      <div class="features-box">
        <h3 style="margin-top: 0;">You now have access to:</h3>
        <div class="feature-item"><span class="feature-icon">✓</span> Full POS functionality</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Inventory management</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Sales analytics & reports</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Employee management</div>
        <div class="feature-item"><span class="feature-icon">✓</span> M-Pesa payment integration</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Customer loyalty programs</div>
      </div>
      
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
        <a href="{{loginUrl}}" class="button button-secondary">Login</a>
      </p>
      
      <p>If you have any questions or need assistance, our support team is here to help.</p>
      
      <p>Welcome to SmartDuka! 🚀</p>
      <p>Best regards,<br>The SmartDuka Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
      <p>Need help? Contact us at smartdukainfo@gmail.com</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'shop_rejected',
        subject: 'Update on your SmartDuka shop application',
        description: 'Sent when a shop application is rejected',
        variables: ['shopName', 'rejectionReason', 'supportEmail'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .reason-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Update</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for your interest in SmartDuka. After reviewing your shop application for <strong>{{shopName}}</strong>, we were unable to approve it at this time.</p>
      
      <div class="reason-box">
        <strong>Reason:</strong>
        <p style="margin-bottom: 0;">{{rejectionReason}}</p>
      </div>
      
      <p>If you believe this was a mistake or would like to provide additional information, please contact our support team.</p>
      
      <p style="text-align: center;">
        <a href="mailto:{{supportEmail}}" class="button">Contact Support</a>
      </p>
      
      <p>Best regards,<br>The SmartDuka Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'shop_suspended',
        subject: '⚠️ Your SmartDuka shop has been suspended',
        description: 'Sent when a shop is suspended',
        variables: ['shopName', 'suspensionReason', 'supportEmail'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Shop Suspended</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your shop <strong>{{shopName}}</strong> has been suspended on SmartDuka.</p>
      
      <div class="alert-box">
        <strong>Reason for suspension:</strong>
        <p style="margin-bottom: 0;">{{suspensionReason}}</p>
      </div>
      
      <p>During suspension, you will not be able to:</p>
      <ul>
        <li>Process new sales</li>
        <li>Access the POS system</li>
        <li>Manage inventory</li>
      </ul>
      
      <p>To resolve this issue and restore your shop, please contact our support team immediately.</p>
      
      <p style="text-align: center;">
        <a href="mailto:{{supportEmail}}" class="button">Contact Support</a>
      </p>
      
      <p>Best regards,<br>The SmartDuka Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 SmartDuka. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
    ];

    for (const template of templates) {
      await this.templateModel.updateOne(
        { name: template.name },
        { $set: template },
        { upsert: true },
      );
    }

    this.logger.log(`Seeded ${templates.length} email templates`);
  }
}
