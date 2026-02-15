/**
 * SmartDuka Professional Email Templates
 * 
 * Brand Colors:
 * - Primary Orange: #f97316
 * - Dark Orange: #ea580c
 * - Light Orange: #fed7aa
 * - Success Green: #10b981
 * - Warning Amber: #f59e0b
 * - Error Red: #ef4444
 * - Dark Text: #1f2937
 * - Light Background: #f9fafb
 * 
 * Contact Information:
 * - Phone: 0729983567, 0104160502
 * - Email: smartdukainfo@gmail.com
 * - Website: www.smartduka.org
 */

// SmartDuka Cart Logo - Using emoji and text for maximum email client compatibility
// SVG doesn't render reliably in all email clients (Gmail, Outlook, etc.)
// Using a simple cart emoji + styled text that works everywhere
export const SMARTDUKA_LOGO_HTML = `
<div style="font-size: 36px; line-height: 1;">🛒</div>
`;

// Base email wrapper with SmartDuka branding
export const getEmailWrapper = (content: string, preheader?: string): string => {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || 'https://www.smartduka.org';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>SmartDuka</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Container */
    .email-wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 20px;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    
    /* Header */
    .email-header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      padding: 32px 40px;
      text-align: center;
    }
    
    .logo-container {
      display: inline-block;
      width: 56px;
      height: 56px;
      background-color: #ffffff;
      border-radius: 14px;
      padding: 10px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .logo-container svg {
      width: 36px;
      height: 36px;
    }
    
    .brand-name {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    
    .brand-tagline {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 8px 0 0;
    }
    
    /* Content */
    .email-content {
      padding: 40px;
    }
    
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 20px;
    }
    
    .main-text {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 24px;
    }
    
    /* Buttons */
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .primary-button {
      display: inline-block;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);
      transition: all 0.2s ease;
    }
    
    .secondary-button {
      display: inline-block;
      background: #f3f4f6;
      color: #374151 !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      margin: 8px;
    }
    
    /* Info boxes */
    .info-box {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
      border: 2px solid #fdba74;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .success-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #6ee7b7;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 2px solid #fcd34d;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .error-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #fca5a5;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    /* Stats cards */
    .stats-container {
      display: flex;
      gap: 16px;
      margin: 24px 0;
    }
    
    .stat-card {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #f97316;
      margin: 0;
    }
    
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    
    /* Feature list */
    .feature-list {
      margin: 24px 0;
      padding: 0;
      list-style: none;
    }
    
    .feature-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .feature-item:last-child {
      border-bottom: none;
    }
    
    .feature-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
      flex-shrink: 0;
      color: #ffffff;
      font-size: 14px;
    }
    
    .feature-text {
      font-size: 15px;
      color: #374151;
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
      margin: 32px 0;
    }
    
    /* Footer */
    .email-footer {
      background: #1f2937;
      padding: 40px;
      text-align: center;
    }
    
    .footer-logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    
    .footer-tagline {
      color: #9ca3af;
      font-size: 14px;
      margin-bottom: 24px;
    }
    
    .contact-info {
      margin: 24px 0;
    }
    
    .contact-item {
      color: #d1d5db;
      font-size: 14px;
      margin: 8px 0;
    }
    
    .contact-item a {
      color: #f97316;
      text-decoration: none;
    }
    
    .social-links {
      margin: 24px 0;
    }
    
    .social-link {
      display: inline-block;
      width: 40px;
      height: 40px;
      background: #374151;
      border-radius: 50%;
      margin: 0 6px;
      line-height: 40px;
      color: #ffffff;
      text-decoration: none;
      font-size: 18px;
    }
    
    .footer-links {
      margin: 24px 0;
    }
    
    .footer-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 13px;
      margin: 0 12px;
    }
    
    .footer-link:hover {
      color: #f97316;
    }
    
    .copyright {
      color: #6b7280;
      font-size: 12px;
      margin-top: 24px;
    }
    
    .legal-text {
      color: #6b7280;
      font-size: 11px;
      margin-top: 16px;
      line-height: 1.5;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      
      .email-header {
        padding: 24px 20px;
      }
      
      .email-content {
        padding: 24px 20px;
      }
      
      .email-footer {
        padding: 32px 20px;
      }
      
      .brand-name {
        font-size: 24px;
      }
      
      .stats-container {
        flex-direction: column;
      }
      
      .primary-button {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  
  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            <!-- Header -->
            <div class="email-header">
              <div class="logo-container">
                ${SMARTDUKA_LOGO_HTML}
              </div>
              <h1 class="brand-name">SmartDuka</h1>
              <p class="brand-tagline">Smart POS & Inventory Management</p>
            </div>
            
            <!-- Content -->
            <div class="email-content">
              ${content}
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
              <div class="footer-logo">🛒 SmartDuka</div>
              <p class="footer-tagline">The smart way to manage your business</p>
              
              <div class="contact-info">
                <p class="contact-item">📞 <a href="tel:+254729983567">0729 983 567</a> | <a href="tel:+254104160502">0104 160 502</a></p>
                <p class="contact-item">📧 <a href="mailto:smartdukainfo@gmail.com">smartdukainfo@gmail.com</a></p>
                <p class="contact-item">🌐 <a href="${frontendUrl}">${frontendUrl.replace('https://', '').replace('http://', '')}</a></p>
              </div>
              
              <div class="footer-links">
                <a href="${frontendUrl}" class="footer-link">Website</a>
                <a href="${frontendUrl}/help" class="footer-link">Help Center</a>
                <a href="${frontendUrl}/pricing" class="footer-link">Pricing</a>
                <a href="mailto:smartdukainfo@gmail.com" class="footer-link">Contact Us</a>
              </div>
              
              <p class="copyright">© ${currentYear} SmartDuka. All rights reserved.</p>
              <p class="legal-text">
                You received this email because you have an account with SmartDuka.<br>
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
};

// Email template definitions
export const EMAIL_TEMPLATES = {
  welcome: {
    name: 'welcome',
    subject: 'Welcome to SmartDuka, {{shopName}}! 🎉',
    description: 'Sent when a new shop is registered',
    variables: ['shopName', 'userName', 'loginUrl', 'planName', 'trialDays', 'billingCycle', 'planPrice', 'maxShops', 'maxEmployees', 'maxProducts'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        🎉 Congratulations! Your shop <strong>${vars.shopName || '{{shopName}}'}</strong> has been successfully registered on SmartDuka. 
        We're thrilled to have you join thousands of businesses using our platform to grow and succeed.
      </p>
      
      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🎁 Your Free Trial</p>
        <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #047857;">${vars.trialDays || '{{trialDays}}'} Days</p>
        <p style="margin: 8px 0 0; color: #059669; font-size: 14px;">Full access to all features</p>
      </div>
      
      <div class="info-box">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
            <span style="font-size: 24px;">🛡️</span>
          </div>
          <div>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ea580c;">${vars.planName || '{{planName}}'} Plan</p>
            <p style="margin: 4px 0 0; color: #f97316; font-size: 14px;">KES ${vars.planPrice || '{{planPrice}}'}/${vars.billingCycle || '{{billingCycle}}'}</p>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 16px;">
          <div style="flex: 1; background: #ffffff; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px;">🏪</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #1f2937;">${vars.maxShops || '{{maxShops}}'}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Shops</p>
          </div>
          <div style="flex: 1; background: #ffffff; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px;">👥</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #1f2937;">${vars.maxEmployees || '{{maxEmployees}}'}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Staff</p>
          </div>
          <div style="flex: 1; background: #ffffff; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px;">📦</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #1f2937;">${vars.maxProducts || '{{maxProducts}}'}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Products</p>
          </div>
        </div>
      </div>
      
      <h3 style="color: #1f2937; margin: 32px 0 16px; font-size: 18px;">What you can do with SmartDuka:</h3>
      
      <ul class="feature-list">
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-text">Manage inventory with real-time stock tracking</span>
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-text">Process sales and generate professional receipts</span>
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-text">Accept M-Pesa payments seamlessly</span>
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-text">Get detailed sales reports and analytics</span>
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-text">Manage staff with role-based access control</span>
        </li>
      </ul>
      
      <div class="button-container">
        <a href="${vars.loginUrl || '{{loginUrl}}'}" class="primary-button">🚀 Get Started Now</a>
      </div>
      
      <div class="divider"></div>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #374151;">Need Help Getting Started?</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Our support team is here for you!<br>
          📞 Call us: <a href="tel:+254729983567" style="color: #f97316; text-decoration: none;">0729 983 567</a><br>
          📧 Email: <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316; text-decoration: none;">smartdukainfo@gmail.com</a>
        </p>
      </div>
    `, `Welcome to SmartDuka! Your shop ${vars.shopName || ''} is ready.`),
  },

  password_reset: {
    name: 'password_reset',
    subject: 'Reset your SmartDuka password 🔐',
    description: 'Sent when user requests password reset',
    variables: ['userName', 'resetUrl', 'expiryMinutes'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        We received a request to reset your SmartDuka password. If you made this request, click the button below to create a new password.
      </p>
      
      <div class="button-container">
        <a href="${vars.resetUrl || '{{resetUrl}}'}" class="primary-button">🔐 Reset Password</a>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">⏰</span>
          <span>This link will expire in <strong>${vars.expiryMinutes || '{{expiryMinutes}}'} minutes</strong>. If you didn't request this, you can safely ignore this email.</span>
        </p>
      </div>
      
      <div class="divider"></div>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px;">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">🛡️ Security Tips:</p>
        <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 13px;">
          <li>Never share your password with anyone</li>
          <li>Use a strong, unique password</li>
          <li>Enable two-factor authentication when available</li>
        </ul>
      </div>
      
      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        If you didn't request a password reset, please contact our support team immediately at 
        <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Reset your SmartDuka password. Link expires in ${vars.expiryMinutes || 30} minutes.`),
  },

  employee_invited: {
    name: 'employee_invited',
    subject: "You've been invited to join {{shopName}} on SmartDuka 👋",
    description: 'Sent when an employee is invited',
    variables: ['shopName', 'employeeName', 'role', 'invitedBy', 'loginUrl', 'tempPassword'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.employeeName || '{{employeeName}}'}</strong>,</p>
      
      <p class="main-text">
        Great news! <strong>${vars.invitedBy || '{{invitedBy}}'}</strong> has invited you to join <strong>${vars.shopName || '{{shopName}}'}</strong> on SmartDuka.
      </p>
      
      <div class="info-box" style="text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #ea580c; text-transform: uppercase; letter-spacing: 1px;">Your Role</p>
        <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: #f97316;">${vars.role || '{{role}}'}</p>
      </div>
      
      <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #0369a1;">🔑 Your Login Credentials</p>
        <div style="background: #ffffff; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Temporary Password</p>
          <p style="margin: 8px 0 0; font-size: 24px; font-family: 'Courier New', monospace; font-weight: 700; color: #1f2937; letter-spacing: 2px;">${vars.tempPassword || '{{tempPassword}}'}</p>
        </div>
        <div class="warning-box" style="margin: 16px 0 0; padding: 12px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            ⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security.
          </p>
        </div>
      </div>
      
      <div class="button-container">
        <a href="${vars.loginUrl || '{{loginUrl}}'}" class="primary-button">🚀 Login to SmartDuka</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, please contact your administrator or reach out to our support team at 
        <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `You've been invited to join ${vars.shopName || ''} on SmartDuka as ${vars.role || ''}.`),
  },

  low_stock_alert: {
    name: 'low_stock_alert',
    subject: '⚠️ Low Stock Alert - {{productCount}} products need attention',
    description: 'Sent when products fall below reorder level',
    variables: ['shopName', 'productCount', 'productList', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello,</p>
      
      <p class="main-text">
        This is an automated alert for <strong>${vars.shopName || '{{shopName}}'}</strong>.
      </p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⚠️</p>
        <p style="margin: 12px 0 0; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Low Stock Alert</p>
        <p style="margin: 8px 0 0; font-size: 36px; font-weight: 700; color: #d97706;">${vars.productCount || '{{productCount}}'}</p>
        <p style="margin: 4px 0 0; color: #92400e; font-size: 14px;">products need restocking</p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
        <div style="background: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; font-weight: 600; color: #374151;">📦 Products Running Low</p>
        </div>
        <div style="padding: 20px;">
          ${vars.productList || '{{productList}}'}
        </div>
      </div>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">📊 View Inventory</a>
      </div>
      
      <p class="main-text" style="color: #6b7280;">
        Please restock these items soon to avoid stockouts and lost sales. You can manage your inventory and set reorder levels in your dashboard.
      </p>
    `, `${vars.productCount || 0} products are running low on stock at ${vars.shopName || ''}.`),
  },

  daily_sales_report: {
    name: 'daily_sales_report',
    subject: '📊 Daily Sales Report - {{date}} | {{shopName}}',
    description: 'Daily sales summary sent to shop admins',
    variables: ['shopName', 'date', 'totalSales', 'orderCount', 'topProducts', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello,</p>
      
      <p class="main-text">
        Here's your daily sales summary for <strong>${vars.shopName || '{{shopName}}'}</strong> on <strong>${vars.date || '{{date}}'}</strong>.
      </p>
      
      <div style="display: flex; gap: 16px; margin: 24px 0;">
        <div style="flex: 1; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #6ee7b7; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Total Sales</p>
          <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #047857;">KES ${vars.totalSales || '{{totalSales}}'}</p>
        </div>
        <div style="flex: 1; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #fdba74; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #ea580c; text-transform: uppercase; letter-spacing: 1px;">Orders</p>
          <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #c2410c;">${vars.orderCount || '{{orderCount}}'}</p>
        </div>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
        <div style="background: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; font-weight: 600; color: #374151;">🏆 Top Selling Products</p>
        </div>
        <div style="padding: 20px;">
          ${vars.topProducts || '{{topProducts}}'}
        </div>
      </div>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">📈 View Full Report</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        This report is automatically generated at the end of each business day.
      </p>
    `, `Daily sales report for ${vars.shopName || ''}: KES ${vars.totalSales || 0} from ${vars.orderCount || 0} orders.`),
  },

  subscription_activated: {
    name: 'subscription_activated',
    subject: '✅ Your {{planName}} subscription is now active!',
    description: 'Sent when subscription is activated',
    variables: ['shopName', 'userName', 'planName', 'price', 'billingCycle', 'features', 'startDate', 'nextBillingDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        🎉 Great news! Your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> is now active.
      </p>
      
      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">✅</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #047857;">${vars.planName || '{{planName}}'} Plan</p>
        <p style="margin: 8px 0 0; font-size: 18px; color: #059669;">KES ${vars.price || '{{price}}'} / ${vars.billingCycle || '{{billingCycle}}'}</p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 16px; font-weight: 600; color: #374151;">📋 Subscription Details</p>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">Start Date</span>
          <strong style="color: #1f2937;">${vars.startDate || '{{startDate}}'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0;">
          <span style="color: #6b7280;">Next Billing</span>
          <strong style="color: #1f2937;">${vars.nextBillingDate || '{{nextBillingDate}}'}</strong>
        </div>
      </div>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">🚀 Go to Dashboard</a>
      </div>
      
      <p class="main-text" style="color: #6b7280;">
        Thank you for choosing SmartDuka! We're excited to help you grow your business.
      </p>
    `, `Your ${vars.planName || ''} subscription is now active for ${vars.shopName || ''}.`),
  },

  subscription_expiring: {
    name: 'subscription_expiring',
    subject: '⏰ Your SmartDuka subscription expires in {{daysLeft}} days',
    description: 'Sent when subscription is about to expire',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'daysLeft', 'renewUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Your <strong>${vars.planName || '{{planName}}'}</strong> subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> is expiring soon.
      </p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⏰</p>
        <p style="margin: 12px 0 0; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Expires In</p>
        <p style="margin: 8px 0 0; font-size: 48px; font-weight: 700; color: #d97706;">${vars.daysLeft || '{{daysLeft}}'}</p>
        <p style="margin: 4px 0 0; color: #92400e; font-size: 16px;">days</p>
        <p style="margin: 16px 0 0; color: #78350f; font-size: 14px;">Expiry Date: <strong>${vars.expiryDate || '{{expiryDate}}'}</strong></p>
      </div>
      
      <p class="main-text">
        To avoid any interruption to your service, please renew your subscription before it expires. Your data and settings will be preserved.
      </p>
      
      <div class="button-container">
        <a href="${vars.renewUrl || '{{renewUrl}}'}" class="primary-button">🔄 Renew Now</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions about your subscription, please contact our support team at 
        <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a> or call 
        <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a>.
      </p>
    `, `Your SmartDuka subscription expires in ${vars.daysLeft || 0} days. Renew now to avoid interruption.`),
  },

  subscription_expired: {
    name: 'subscription_expired',
    subject: '⚠️ Your SmartDuka subscription has expired',
    description: 'Sent when subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiredDate', 'renewUrl', 'gracePeriodDays'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Your <strong>${vars.planName || '{{planName}}'}</strong> subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> has expired.
      </p>
      
      <div class="error-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⚠️</p>
        <p style="margin: 12px 0 0; font-size: 20px; font-weight: 700; color: #dc2626;">Subscription Expired</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">Expired on: <strong>${vars.expiredDate || '{{expiredDate}}'}</strong></p>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0; font-weight: 600; color: #92400e;">⏳ Grace Period</p>
        <p style="margin: 8px 0 0; color: #78350f; font-size: 14px;">
          You have <strong>${vars.gracePeriodDays || '{{gracePeriodDays}}'} days</strong> to renew before your data is archived. 
          During this time, your account has limited functionality.
        </p>
      </div>
      
      <p class="main-text">
        During suspension, you will not be able to:
      </p>
      <ul style="color: #4b5563; margin: 16px 0; padding-left: 24px;">
        <li style="margin: 8px 0;">Process new sales</li>
        <li style="margin: 8px 0;">Access the POS system</li>
        <li style="margin: 8px 0;">Add new products or employees</li>
      </ul>
      
      <div class="button-container">
        <a href="${vars.renewUrl || '{{renewUrl}}'}" class="primary-button">🔄 Renew Now</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Need help? Contact us at <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a> or call 
        <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a>.
      </p>
    `, `Your SmartDuka subscription has expired. Renew within ${vars.gracePeriodDays || 7} days to avoid data archival.`),
  },

  payment_successful: {
    name: 'payment_successful',
    subject: '✅ Payment Received - {{amount}} {{currency}}',
    description: 'Sent when payment is successful',
    variables: ['shopName', 'userName', 'amount', 'currency', 'paymentMethod', 'transactionId', 'planName', 'receiptUrl', 'date'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        We've received your payment for <strong>${vars.shopName || '{{shopName}}'}</strong>. Thank you!
      </p>
      
      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">✅</p>
        <p style="margin: 12px 0 0; font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Payment Received</p>
        <p style="margin: 8px 0 0; font-size: 36px; font-weight: 700; color: #047857;">${vars.currency || '{{currency}}'} ${vars.amount || '{{amount}}'}</p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
        <div style="background: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; font-weight: 600; color: #374151;">🧾 Payment Details</p>
        </div>
        <div style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Date</span>
            <strong style="color: #1f2937;">${vars.date || '{{date}}'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Plan</span>
            <strong style="color: #1f2937;">${vars.planName || '{{planName}}'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #6b7280;">Payment Method</span>
            <strong style="color: #1f2937;">${vars.paymentMethod || '{{paymentMethod}}'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: #6b7280;">Transaction ID</span>
            <strong style="color: #1f2937; font-family: monospace;">${vars.transactionId || '{{transactionId}}'}</strong>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <a href="${vars.receiptUrl || '{{receiptUrl}}'}" class="primary-button">📄 View Receipt</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Thank you for your payment! Your subscription is now active.
      </p>
    `, `Payment of ${vars.currency || 'KES'} ${vars.amount || 0} received for ${vars.shopName || ''}.`),
  },

  shop_verified: {
    name: 'shop_verified',
    subject: '🎉 Congratulations! Your shop {{shopName}} is now verified!',
    description: 'Sent when a shop is verified by super admin',
    variables: ['shopName', 'verificationDate', 'loginUrl', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Great news!</p>
      
      <p class="main-text">
        Your shop <strong>${vars.shopName || '{{shopName}}'}</strong> has been successfully verified and activated on SmartDuka.
      </p>
      
      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 64px;">🎉</p>
        <div style="display: inline-block; background: #10b981; color: white; padding: 8px 24px; border-radius: 20px; font-weight: 600; margin: 16px 0;">
          ✓ VERIFIED
        </div>
        <p style="margin: 8px 0 0; color: #059669; font-size: 14px;">Verification Date: <strong>${vars.verificationDate || '{{verificationDate}}'}</strong></p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 16px; font-weight: 600; color: #374151;">🚀 You now have access to:</p>
        <ul class="feature-list" style="margin: 0; padding: 0;">
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">Full POS functionality</span>
          </li>
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">Inventory management</span>
          </li>
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">Sales analytics & reports</span>
          </li>
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">Employee management</span>
          </li>
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">M-Pesa payment integration</span>
          </li>
          <li class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">Customer loyalty programs</span>
          </li>
        </ul>
      </div>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">🚀 Go to Dashboard</a>
        <a href="${vars.loginUrl || '{{loginUrl}}'}" class="secondary-button">Login</a>
      </div>
      
      <p class="main-text" style="color: #6b7280;">
        Welcome to SmartDuka! We're excited to help you grow your business. If you need any assistance, our support team is always here to help.
      </p>
    `, `Congratulations! Your shop ${vars.shopName || ''} is now verified on SmartDuka.`),
  },

  shop_rejected: {
    name: 'shop_rejected',
    subject: 'Update on your SmartDuka shop application',
    description: 'Sent when a shop application is rejected',
    variables: ['shopName', 'rejectionReason', 'supportEmail'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello,</p>
      
      <p class="main-text">
        Thank you for your interest in SmartDuka. After reviewing your shop application for <strong>${vars.shopName || '{{shopName}}'}</strong>, we were unable to approve it at this time.
      </p>
      
      <div class="error-box">
        <p style="margin: 0 0 8px; font-weight: 600; color: #dc2626;">📋 Reason for Decision</p>
        <p style="margin: 0; color: #991b1b;">${vars.rejectionReason || '{{rejectionReason}}'}</p>
      </div>
      
      <p class="main-text">
        If you believe this was a mistake or would like to provide additional information, please don't hesitate to contact our support team. We're here to help you get started.
      </p>
      
      <div class="button-container">
        <a href="mailto:${vars.supportEmail || 'smartdukainfo@gmail.com'}" class="primary-button">📧 Contact Support</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        You can also reach us at:<br>
        📞 <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a> | <a href="tel:+254104160502" style="color: #f97316;">0104 160 502</a><br>
        📧 <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Update on your SmartDuka shop application for ${vars.shopName || ''}.`),
  },

  // ============================================
  // DUNNING EMAIL TEMPLATES (Payment Recovery)
  // ============================================

  subscription_expiring_7days: {
    name: 'subscription_expiring_7days',
    subject: '⏰ Your SmartDuka subscription expires in 7 days',
    description: 'Sent 7 days before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Your <strong>${vars.planName || '{{planName}}'}</strong> subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> 
        will expire on <strong>${vars.expiryDate || '{{expiryDate}}'}</strong>.
      </p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⏰</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #92400e;">7 Days Remaining</p>
        <p style="margin: 8px 0 0; color: #78350f; font-size: 14px;">Renew now to avoid service interruption</p>
      </div>
      
      <p class="main-text">
        To continue enjoying uninterrupted access to SmartDuka's features, please renew your subscription before it expires.
      </p>
      
      <div class="info-box">
        <p style="margin: 0 0 12px; font-weight: 600; color: #ea580c;">💡 What happens if you don't renew?</p>
        <ul style="margin: 0; padding-left: 20px; color: #9a3412;">
          <li style="margin: 4px 0;">You'll lose access to the POS system</li>
          <li style="margin: 4px 0;">Sales and inventory management will be disabled</li>
          <li style="margin: 4px 0;">Your data will be preserved for 30 days</li>
        </ul>
      </div>
      
      <div class="button-container">
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=mpesa" class="primary-button">📱 Pay with M-Pesa - KES ${vars.amount || '{{amount}}'}</a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">Other payment options:</p>
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=sendmoney" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💸 Send Money</a>
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=card" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💳 Card</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Questions? Contact us at <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Your SmartDuka subscription expires in 7 days. Renew now to avoid interruption.`),
  },

  subscription_expiring_3days: {
    name: 'subscription_expiring_3days',
    subject: '⚠️ URGENT: Your SmartDuka subscription expires in 3 days',
    description: 'Sent 3 days before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        <strong>Urgent:</strong> Your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> 
        expires in just <strong>3 days</strong> on ${vars.expiryDate || '{{expiryDate}}'}.
      </p>
      
      <div class="error-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⚠️</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #dc2626;">3 Days Left!</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">Act now to keep your business running</p>
      </div>
      
      <p class="main-text">
        Don't let your business operations come to a halt. Renew your ${vars.planName || '{{planName}}'} subscription today.
      </p>
      
      <div class="button-container">
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=mpesa" class="primary-button">📱 Pay with M-Pesa - KES ${vars.amount || '{{amount}}'}</a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=sendmoney" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💸 Send Money</a>
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=card" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💳 Card</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Call us at <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a>
      </p>
    `, `URGENT: Your SmartDuka subscription expires in 3 days!`),
  },

  subscription_expiring_1day: {
    name: 'subscription_expiring_1day',
    subject: '🚨 FINAL NOTICE: Your SmartDuka subscription expires TOMORROW',
    description: 'Sent 1 day before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        <strong>FINAL NOTICE:</strong> Your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> 
        expires <strong>TOMORROW</strong>.
      </p>
      
      <div class="error-box" style="text-align: center; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
        <p style="margin: 0; font-size: 64px;">🚨</p>
        <p style="margin: 12px 0 0; font-size: 28px; font-weight: 700; color: #dc2626;">EXPIRES TOMORROW</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 16px;">Your shop will be disabled if you don't renew</p>
      </div>
      
      <p class="main-text" style="font-weight: 600; color: #dc2626;">
        This is your last chance to renew before losing access to your POS system, sales data, and inventory management.
      </p>
      
      <div class="button-container">
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=mpesa" class="primary-button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
          📱 PAY NOW WITH M-PESA - KES ${vars.amount || '{{amount}}'}
        </a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=sendmoney" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💸 Send Money</a>
        <a href="${vars.renewUrl || '{{renewUrl}}'}?method=card" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💳 Card</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need immediate help? Call us NOW at <a href="tel:+254729983567" style="color: #f97316; font-weight: 600;">0729 983 567</a>
      </p>
    `, `FINAL NOTICE: Your SmartDuka subscription expires TOMORROW!`),
  },

  subscription_past_due_day1: {
    name: 'subscription_past_due_day1',
    subject: '🔴 Payment Overdue - Your SmartDuka access is limited',
    description: 'Sent on day 1 of grace period',
    variables: ['shopName', 'userName', 'planName', 'amount', 'daysUntilSuspension', 'payUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Your subscription payment for <strong>${vars.shopName || '{{shopName}}'}</strong> is now overdue. 
        Your account has been placed in <strong>read-only mode</strong>.
      </p>
      
      <div class="error-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">🔴</p>
        <p style="margin: 12px 0 0; font-size: 20px; font-weight: 700; color: #dc2626;">Payment Overdue</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">
          ${vars.daysUntilSuspension || '{{daysUntilSuspension}}'} days until full suspension
        </p>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0 0 8px; font-weight: 600; color: #92400e;">⚠️ Current Restrictions:</p>
        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin: 4px 0;">You can view your data but cannot make sales</li>
          <li style="margin: 4px 0;">POS system is disabled</li>
          <li style="margin: 4px 0;">Cannot add new products or employees</li>
        </ul>
      </div>
      
      <p class="main-text">
        Pay now to restore full access immediately.
      </p>
      
      <div class="button-container">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=mpesa" class="primary-button">📱 Pay with M-Pesa - KES ${vars.amount || '{{amount}}'}</a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=sendmoney" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💸 Send Money</a>
        <a href="${vars.payUrl || '{{payUrl}}'}?method=card" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; margin: 4px;">💳 Card</a>
      </div>
    `, `Payment overdue for ${vars.shopName || ''}. Your account is in read-only mode.`),
  },

  subscription_past_due_day5: {
    name: 'subscription_past_due_day5',
    subject: '⚠️ URGENT: 2 days until your SmartDuka account is suspended',
    description: 'Sent on day 5 of grace period (2 days before suspension)',
    variables: ['shopName', 'userName', 'planName', 'amount', 'suspensionDate', 'payUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        <strong>URGENT:</strong> Your SmartDuka account for <strong>${vars.shopName || '{{shopName}}'}</strong> 
        will be <strong>fully suspended</strong> on ${vars.suspensionDate || '{{suspensionDate}}'} if payment is not received.
      </p>
      
      <div class="error-box" style="text-align: center; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
        <p style="margin: 0; font-size: 64px;">⚠️</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #dc2626;">2 DAYS LEFT</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">Before full account suspension</p>
      </div>
      
      <p class="main-text" style="color: #dc2626; font-weight: 600;">
        After suspension, you will completely lose access to your shop data, sales history, and inventory until payment is made.
      </p>
      
      <div class="button-container">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=mpesa" class="primary-button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
          📱 PAY NOW WITH M-PESA - KES ${vars.amount || '{{amount}}'}
        </a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=sendmoney" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💸 Send Money</a>
        <a href="${vars.payUrl || '{{payUrl}}'}?method=card" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💳 Card</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Having trouble paying? Contact us immediately at <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a>
      </p>
    `, `URGENT: 2 days until your SmartDuka account is suspended!`),
  },

  subscription_suspended_notice: {
    name: 'subscription_suspended_notice',
    subject: '🚫 Your SmartDuka account has been suspended',
    description: 'Sent when subscription is suspended due to non-payment',
    variables: ['shopName', 'userName', 'planName', 'amount', 'payUrl', 'dataRetentionDays'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Your SmartDuka account for <strong>${vars.shopName || '{{shopName}}'}</strong> has been 
        <strong>suspended</strong> due to non-payment.
      </p>
      
      <div class="error-box" style="text-align: center; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-color: #374151;">
        <p style="margin: 0; font-size: 64px;">🚫</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #f87171;">ACCOUNT SUSPENDED</p>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">All shop operations are disabled</p>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0 0 8px; font-weight: 600; color: #92400e;">📋 What this means:</p>
        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin: 4px 0;">❌ No access to POS system</li>
          <li style="margin: 4px 0;">❌ Cannot view sales or inventory</li>
          <li style="margin: 4px 0;">❌ All shop operations disabled</li>
          <li style="margin: 4px 0;">⏳ Data will be retained for ${vars.dataRetentionDays || '{{dataRetentionDays}}'} days</li>
        </ul>
      </div>
      
      <p class="main-text">
        <strong>Good news:</strong> You can restore your account immediately by paying your outstanding balance.
      </p>
      
      <div class="button-container">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=mpesa" class="primary-button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
          📱 PAY NOW WITH M-PESA - KES ${vars.amount || '{{amount}}'}
        </a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${vars.payUrl || '{{payUrl}}'}?method=sendmoney" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💸 Send Money</a>
        <a href="${vars.payUrl || '{{payUrl}}'}?method=card" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 4px;">💳 Card</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Contact us at <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a> or 
        <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Your SmartDuka account has been suspended. Pay now to restore access.`),
  },

  subscription_reactivated: {
    name: 'subscription_reactivated',
    subject: '✅ Your SmartDuka subscription has been reactivated!',
    description: 'Sent when subscription is reactivated after payment',
    variables: ['shopName', 'userName', 'planName', 'nextBillingDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello <strong>${vars.userName || '{{userName}}'}</strong>,</p>
      
      <p class="main-text">
        Great news! Your SmartDuka subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> 
        has been successfully reactivated.
      </p>
      
      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 64px;">🎉</p>
        <p style="margin: 12px 0 0; font-size: 24px; font-weight: 700; color: #047857;">SUBSCRIPTION ACTIVE</p>
        <p style="margin: 8px 0 0; color: #059669; font-size: 14px;">Welcome back!</p>
      </div>
      
      <div class="info-box">
        <p style="margin: 0 0 12px; font-weight: 600; color: #ea580c;">📋 Your Subscription Details:</p>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fed7aa;">
          <span style="color: #9a3412;">Plan</span>
          <strong style="color: #7c2d12;">${vars.planName || '{{planName}}'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #9a3412;">Next Billing Date</span>
          <strong style="color: #7c2d12;">${vars.nextBillingDate || '{{nextBillingDate}}'}</strong>
        </div>
      </div>
      
      <p class="main-text">
        You now have full access to all SmartDuka features. Get back to business!
      </p>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">🚀 Go to Dashboard</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Thank you for your continued trust in SmartDuka!
      </p>
    `, `Your SmartDuka subscription has been reactivated. Welcome back!`),
  },

  plan_changed: {
    name: 'plan_changed',
    subject: '📋 Your SmartDuka plan has been changed',
    description: 'Sent when a user changes their subscription plan',
    variables: ['shopName', 'userName', 'previousPlan', 'newPlan', 'changeDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello ${vars.userName || '{{userName}}'},</p>
      
      <p class="main-text">
        Your subscription plan for <strong>${vars.shopName || '{{shopName}}'}</strong> has been changed.
      </p>
      
      <div class="info-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">🔄</p>
        <p style="margin: 12px 0 0; font-size: 20px; font-weight: 700; color: #ea580c;">Plan Changed</p>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 16px; font-weight: 600; color: #92400e;">📋 Change Details:</p>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fcd34d;">
          <span style="color: #78350f;">Previous Plan</span>
          <strong style="color: #451a03;">${vars.previousPlan || '{{previousPlan}}'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fcd34d;">
          <span style="color: #78350f;">New Plan</span>
          <strong style="color: #451a03;">${vars.newPlan || '{{newPlan}}'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #78350f;">Change Date</span>
          <strong style="color: #451a03;">${vars.changeDate || '{{changeDate}}'}</strong>
        </div>
      </div>
      
      <p class="main-text">
        Your subscription has been updated immediately. You now have access to all features included in your new plan.
      </p>
      
      <div class="button-container">
        <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" class="primary-button">🏠 Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you didn't make this change or have any questions, please contact us:<br>
        📞 <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a> | <a href="tel:+254104160502" style="color: #f97316;">0104 160 502</a><br>
        📧 <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Your SmartDuka plan has been changed from ${vars.previousPlan || ''} to ${vars.newPlan || ''}.`),
  },

  shop_suspended: {
    name: 'shop_suspended',
    subject: '⚠️ Your SmartDuka shop has been suspended',
    description: 'Sent when a shop is suspended',
    variables: ['shopName', 'suspensionReason', 'supportEmail'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
      <p class="greeting">Hello,</p>
      
      <p class="main-text">
        Your shop <strong>${vars.shopName || '{{shopName}}'}</strong> has been suspended on SmartDuka.
      </p>
      
      <div class="error-box" style="text-align: center;">
        <p style="margin: 0; font-size: 48px;">⚠️</p>
        <p style="margin: 12px 0 0; font-size: 20px; font-weight: 700; color: #dc2626;">Shop Suspended</p>
      </div>
      
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-weight: 600; color: #dc2626;">📋 Reason for Suspension</p>
        <p style="margin: 0; color: #991b1b;">${vars.suspensionReason || '{{suspensionReason}}'}</p>
      </div>
      
      <p class="main-text">
        During suspension, you will not be able to:
      </p>
      <ul style="color: #4b5563; margin: 16px 0; padding-left: 24px;">
        <li style="margin: 8px 0;">Process new sales</li>
        <li style="margin: 8px 0;">Access the POS system</li>
        <li style="margin: 8px 0;">Manage inventory</li>
      </ul>
      
      <p class="main-text">
        To resolve this issue and restore your shop, please contact our support team immediately.
      </p>
      
      <div class="button-container">
        <a href="mailto:${vars.supportEmail || 'smartdukainfo@gmail.com'}" class="primary-button">📧 Contact Support</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        You can also reach us at:<br>
        📞 <a href="tel:+254729983567" style="color: #f97316;">0729 983 567</a> | <a href="tel:+254104160502" style="color: #f97316;">0104 160 502</a><br>
        📧 <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316;">smartdukainfo@gmail.com</a>
      </p>
    `, `Your SmartDuka shop ${vars.shopName || ''} has been suspended.`),
  },
};

// Helper to get template HTML content for database seeding
export const getTemplateForSeeding = (templateName: keyof typeof EMAIL_TEMPLATES) => {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) return null;
  
  // Generate HTML with placeholder variables
  const placeholderVars: Record<string, string> = {};
  template.variables.forEach(v => {
    placeholderVars[v] = `{{${v}}}`;
  });
  
  return {
    name: template.name,
    subject: template.subject,
    description: template.description,
    variables: template.variables,
    htmlContent: template.getHtml(placeholderVars),
    active: true,
  };
};

// Get all templates for seeding
export const getAllTemplatesForSeeding = () => {
  return Object.keys(EMAIL_TEMPLATES).map(key => 
    getTemplateForSeeding(key as keyof typeof EMAIL_TEMPLATES)
  ).filter(Boolean);
};
