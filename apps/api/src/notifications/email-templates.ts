/**
 * SmartDuka Professional Email Templates
 * 
 * Design: Clean, minimal, professional
 * Accent: #f97316 (brand orange) — used sparingly
 * Text: #111827 (primary), #6b7280 (secondary)
 * Background: #f4f4f5 / #ffffff
 * All styles inline for maximum email client compatibility
 * 
 * Contact: 0729983567, 0104160502 | smartdukainfo@gmail.com | www.smartduka.org
 */

// Base email wrapper with SmartDuka branding — clean, professional, all inline styles
export const getEmailWrapper = (content: string, preheader?: string): string => {
  const year = new Date().getFullYear();
  const url = process.env.FRONTEND_URL || 'https://www.smartduka.org';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>SmartDuka</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#111827;line-height:1.6;">
${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;border-top:3px solid #f97316;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="padding:28px 36px 0;text-align:center;">
  <p style="margin:0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">SmartDuka</p>
</td></tr>
<!-- Content -->
<tr><td style="padding:24px 36px 32px;">
  ${content}
</td></tr>
<!-- Footer -->
<tr><td style="padding:24px 36px;border-top:1px solid #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
      <a href="tel:+254729983567" style="color:#9ca3af;text-decoration:none;">0729 983 567</a> &nbsp;&middot;&nbsp;
      <a href="mailto:smartdukainfo@gmail.com" style="color:#9ca3af;text-decoration:none;">smartdukainfo@gmail.com</a> &nbsp;&middot;&nbsp;
      <a href="${url}" style="color:#9ca3af;text-decoration:none;">smartduka.org</a>
    </p>
    <p style="margin:0;font-size:11px;color:#d1d5db;">&copy; ${year} SmartDuka. All rights reserved.</p>
  </td></tr>
  </table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

// Email template definitions
export const EMAIL_TEMPLATES = {
  welcome: {
    name: 'welcome',
    subject: 'Welcome to SmartDuka, {{shopName}}!',
    description: 'Sent when a new shop is registered',
    variables: ['shopName', 'userName', 'loginUrl', 'planName', 'trialDays', 'billingCycle', 'planPrice', 'maxShops', 'maxEmployees', 'maxProducts'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Welcome to SmartDuka</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your shop is ready to go.</p>

  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
    Hi <strong>${vars.userName || '{{userName}}'}</strong>, your shop <strong>${vars.shopName || '{{shopName}}'}</strong> has been registered on SmartDuka. You now have full access to manage your business.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 20px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:110px;">Plan</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.planName || '{{planName}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Price</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">KES ${vars.planPrice || '{{planPrice}}'}/${vars.billingCycle || '{{billingCycle}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Free Trial</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;">${vars.trialDays || '{{trialDays}}'} days</td></tr>
  </table>

  <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111827;">What you can do:</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="padding:6px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Real-time inventory tracking</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Process sales &amp; generate receipts</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Accept M-Pesa payments</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Sales reports &amp; analytics</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Staff management with role-based access</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.loginUrl || '{{loginUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Get Started</a>
  </td></tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;">
  <tr><td style="padding:14px 16px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#6b7280;">Need help? Contact us at <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a> or call <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
  </td></tr>
  </table>
    `, `Welcome to SmartDuka! Your shop ${vars.shopName || ''} is ready.`),
  },

  password_reset: {
    name: 'password_reset',
    subject: 'Reset your SmartDuka password',
    description: 'Sent when user requests password reset',
    variables: ['userName', 'resetUrl', 'expiryMinutes'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Reset your password</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">We received a request to reset your password.</p>

  <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
    Hi <strong>${vars.userName || '{{userName}}'}</strong>, click the button below to set a new password. This link expires in <strong>${vars.expiryMinutes || '{{expiryMinutes}}'} minutes</strong>.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.resetUrl || '{{resetUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
  </td></tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
  <tr><td style="padding:14px 16px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#374151;">Security tips</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">Never share your password. Use a strong, unique password. If you didn't request this reset, ignore this email or contact <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a>.</p>
  </td></tr>
  </table>
    `, `Reset your SmartDuka password. Link expires in ${vars.expiryMinutes || 30} minutes.`),
  },

  employee_invited: {
    name: 'employee_invited',
    subject: "You've been invited to join {{shopName}} on SmartDuka",
    description: 'Sent when an employee is invited',
    variables: ['shopName', 'employeeName', 'role', 'invitedBy', 'loginUrl', 'tempPassword'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">You're invited</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Join <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> on SmartDuka.</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
    Hi <strong>${vars.employeeName || '{{employeeName}}'}</strong>, <strong>${vars.invitedBy || '{{invitedBy}}'}</strong> has added you as <strong>${vars.role || '{{role}}'}</strong>.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 16px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:130px;">Role</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.role || '{{role}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Temporary Password</td><td style="padding:10px 14px;font-size:15px;font-weight:700;color:#111827;font-family:'Menlo','Monaco','Courier New',monospace;letter-spacing:1px;">${vars.tempPassword || '{{tempPassword}}'}</td></tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9f0;border:1px solid #f5e6d0;border-radius:6px;margin:0 0 24px;">
  <tr><td style="padding:12px 16px;">
    <p style="margin:0;font-size:12px;color:#92400e;">Please change your password after your first login.</p>
  </td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.loginUrl || '{{loginUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Login to SmartDuka</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Questions? Contact your admin or email <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
    `, `You've been invited to join ${vars.shopName || ''} on SmartDuka as ${vars.role || ''}.`),
  },

  low_stock_alert: {
    name: 'low_stock_alert',
    subject: 'Low Stock Alert — {{productCount}} products need attention',
    description: 'Sent when products fall below reorder level',
    variables: ['shopName', 'productCount', 'productList', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Low stock alert</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;"><strong style="color:#111827;">${vars.productCount || '{{productCount}}'}</strong> products need restocking at <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong></p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 20px;">
    <tr><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Products running low</td></tr>
    <tr><td style="padding:14px;">${vars.productList || '{{productList}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Inventory</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Restock soon to avoid stockouts and lost sales.</p>
    `, `${vars.productCount || 0} products are running low on stock at ${vars.shopName || ''}.`),
  },

  daily_sales_report: {
    name: 'daily_sales_report',
    subject: 'Daily Sales Report — {{date}} | {{shopName}}',
    description: 'Daily sales summary sent to shop admins',
    variables: ['shopName', 'date', 'totalSales', 'orderCount', 'topProducts', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Daily sales report</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">${vars.shopName || '{{shopName}}'} &mdash; ${vars.date || '{{date}}'}</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr>
    <td style="width:50%;padding:16px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px 0 0 6px;">
      <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total Sales</p>
      <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;">KES ${vars.totalSales || '{{totalSales}}'}</p>
    </td>
    <td style="width:50%;padding:16px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;border-left:none;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Orders</p>
      <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;">${vars.orderCount || '{{orderCount}}'}</p>
    </td>
  </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 20px;">
    <tr><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Top selling products</td></tr>
    <tr><td style="padding:14px;">${vars.topProducts || '{{topProducts}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Full Report</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Auto-generated at end of business day.</p>
    `, `Daily sales report for ${vars.shopName || ''}: KES ${vars.totalSales || 0} from ${vars.orderCount || 0} orders.`),
  },

  subscription_activated: {
    name: 'subscription_activated',
    subject: 'Your {{planName}} subscription is now active',
    description: 'Sent when subscription is activated',
    variables: ['shopName', 'userName', 'planName', 'price', 'billingCycle', 'features', 'startDate', 'nextBillingDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Subscription active</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your ${vars.planName || '{{planName}}'} plan for <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> is ready.</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your subscription is now active.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:120px;">Plan</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.planName || '{{planName}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Price</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">KES ${vars.price || '{{price}}'} / ${vars.billingCycle || '{{billingCycle}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Start Date</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.startDate || '{{startDate}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Next Billing</td><td style="padding:10px 14px;font-size:13px;color:#111827;">${vars.nextBillingDate || '{{nextBillingDate}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Go to Dashboard</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Thank you for choosing SmartDuka.</p>
    `, `Your ${vars.planName || ''} subscription is now active for ${vars.shopName || ''}.`),
  },

  subscription_expiring: {
    name: 'subscription_expiring',
    subject: 'Your SmartDuka subscription expires in {{daysLeft}} days',
    description: 'Sent when subscription is about to expire',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'daysLeft', 'renewUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Subscription expiring</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;"><strong style="color:#111827;">${vars.daysLeft || '{{daysLeft}}'} days</strong> remaining on your ${vars.planName || '{{planName}}'} plan</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
    Hi <strong>${vars.userName || '{{userName}}'}</strong>, your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> expires on <strong>${vars.expiryDate || '{{expiryDate}}'}</strong>. Renew to keep uninterrupted access.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.renewUrl || '{{renewUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew Now</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Questions? <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a> &middot; <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
    `, `Your SmartDuka subscription expires in ${vars.daysLeft || 0} days. Renew now.`),
  },

  subscription_expired: {
    name: 'subscription_expired',
    subject: 'Your SmartDuka subscription has expired',
    description: 'Sent when subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiredDate', 'renewUrl', 'gracePeriodDays'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Subscription expired</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your ${vars.planName || '{{planName}}'} plan expired on ${vars.expiredDate || '{{expiredDate}}'}</p>

  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
    Hi <strong>${vars.userName || '{{userName}}'}</strong>, your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> has expired. You have <strong>${vars.gracePeriodDays || '{{gracePeriodDays}}'} days</strong> to renew before your data is archived.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9f0;border:1px solid #f5e6d0;border-radius:6px;margin:0 0 20px;">
  <tr><td style="padding:12px 16px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;">During this period:</p>
    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">Sales processing, POS access, and adding new products or employees are disabled. Your data is preserved.</p>
  </td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.renewUrl || '{{renewUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew Now</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Need help? <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a> &middot; <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
    `, `Your SmartDuka subscription has expired. Renew within ${vars.gracePeriodDays || 7} days.`),
  },

  payment_successful: {
    name: 'payment_successful',
    subject: 'Payment Received — {{amount}} {{currency}}',
    description: 'Sent when payment is successful',
    variables: ['shopName', 'userName', 'amount', 'currency', 'paymentMethod', 'transactionId', 'planName', 'receiptUrl', 'date'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Payment received</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Thank you, <strong style="color:#111827;">${vars.userName || '{{userName}}'}</strong>.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:120px;">Amount</td><td style="padding:10px 14px;font-size:15px;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.currency || '{{currency}}'} ${vars.amount || '{{amount}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Date</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.date || '{{date}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Plan</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.planName || '{{planName}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Method</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.paymentMethod || '{{paymentMethod}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Transaction ID</td><td style="padding:10px 14px;font-size:13px;color:#111827;font-family:'Menlo','Monaco','Courier New',monospace;">${vars.transactionId || '{{transactionId}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.receiptUrl || '{{receiptUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Receipt</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Your subscription is now active.</p>
    `, `Payment of ${vars.currency || 'KES'} ${vars.amount || 0} received for ${vars.shopName || ''}.`),
  },

  shop_verified: {
    name: 'shop_verified',
    subject: 'Your shop {{shopName}} is now verified',
    description: 'Sent when a shop is verified by super admin',
    variables: ['shopName', 'verificationDate', 'loginUrl', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Shop verified</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;"><strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> is now active on SmartDuka.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 20px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Verified On</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.verificationDate || '{{verificationDate}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Status</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#059669;">Active</td></tr>
  </table>

  <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111827;">You now have access to:</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Full POS &amp; inventory management</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">&#10003; &nbsp;Sales analytics &amp; reports</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">&#10003; &nbsp;M-Pesa payments &amp; employee management</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Go to Dashboard</a>
  </td></tr>
  </table>
    `, `Your shop ${vars.shopName || ''} is now verified on SmartDuka.`),
  },

  shop_rejected: {
    name: 'shop_rejected',
    subject: 'Update on your SmartDuka shop application',
    description: 'Sent when a shop application is rejected',
    variables: ['shopName', 'rejectionReason', 'supportEmail'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Application update</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Regarding <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong></p>

  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
    After reviewing your shop application, we were unable to approve it at this time.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin:0 0 20px;">
  <tr><td style="padding:14px 16px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;">Reason</p>
    <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">${vars.rejectionReason || '{{rejectionReason}}'}</p>
  </td></tr>
  </table>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
    If you believe this was a mistake, please contact our support team.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="mailto:${vars.supportEmail || 'smartdukainfo@gmail.com'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Contact Support</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;"><a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a> &middot; <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
    `, `Update on your SmartDuka shop application for ${vars.shopName || ''}.`),
  },

  // Dunning templates — clean, professional, consistent
  subscription_expiring_7days: {
    name: 'subscription_expiring_7days',
    subject: 'Your SmartDuka subscription expires in 7 days',
    description: 'Sent 7 days before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Subscription expiring soon</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;"><strong style="color:#111827;">7 days</strong> remaining &mdash; expires ${vars.expiryDate || '{{expiryDate}}'}</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your ${vars.planName || '{{planName}}'} plan for <strong>${vars.shopName || '{{shopName}}'}</strong> is expiring. Renew now to keep uninterrupted access.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.renewUrl || '{{renewUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Questions? <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
    `, `Your SmartDuka subscription expires in 7 days.`),
  },

  subscription_expiring_3days: {
    name: 'subscription_expiring_3days',
    subject: 'Urgent: Your SmartDuka subscription expires in 3 days',
    description: 'Sent 3 days before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">3 days left</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your ${vars.planName || '{{planName}}'} plan expires on ${vars.expiryDate || '{{expiryDate}}'}</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> expires in 3 days. Renew today to avoid service interruption.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.renewUrl || '{{renewUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Need help? <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
    `, `Urgent: Your SmartDuka subscription expires in 3 days.`),
  },

  subscription_expiring_1day: {
    name: 'subscription_expiring_1day',
    subject: 'Final notice: Your SmartDuka subscription expires tomorrow',
    description: 'Sent 1 day before subscription expires',
    variables: ['shopName', 'userName', 'planName', 'expiryDate', 'renewUrl', 'amount'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Expires tomorrow</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">This is your final reminder before service interruption.</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your ${vars.planName || '{{planName}}'} plan for <strong>${vars.shopName || '{{shopName}}'}</strong> expires tomorrow. Renew now to keep your POS, inventory, and sales running.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.renewUrl || '{{renewUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew Now &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Need help now? <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
    `, `Final notice: Your SmartDuka subscription expires tomorrow.`),
  },

  subscription_past_due_day1: {
    name: 'subscription_past_due_day1',
    subject: 'Payment overdue — Your SmartDuka access is limited',
    description: 'Sent on day 1 of grace period',
    variables: ['shopName', 'userName', 'planName', 'amount', 'daysUntilSuspension', 'payUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Payment overdue</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your account is in read-only mode. ${vars.daysUntilSuspension || '{{daysUntilSuspension}}'} days until suspension.</p>

  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, payment for <strong>${vars.shopName || '{{shopName}}'}</strong> is overdue. Sales, POS access, and adding new data are disabled until payment is received.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.payUrl || '{{payUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Pay Now &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>
    `, `Payment overdue for ${vars.shopName || ''}. Account in read-only mode.`),
  },

  subscription_past_due_day5: {
    name: 'subscription_past_due_day5',
    subject: 'Urgent: 2 days until your SmartDuka account is suspended',
    description: 'Sent on day 5 of grace period (2 days before suspension)',
    variables: ['shopName', 'userName', 'planName', 'amount', 'suspensionDate', 'payUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">2 days until suspension</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Account will be suspended on ${vars.suspensionDate || '{{suspensionDate}}'}</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your <strong>${vars.shopName || '{{shopName}}'}</strong> account will be fully suspended if payment is not received. You will lose access to all shop data and operations.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.payUrl || '{{payUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Pay Now &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Trouble paying? <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a></p>
    `, `Urgent: 2 days until your SmartDuka account is suspended.`),
  },

  subscription_suspended_notice: {
    name: 'subscription_suspended_notice',
    subject: 'Your SmartDuka account has been suspended',
    description: 'Sent when subscription is suspended due to non-payment',
    variables: ['shopName', 'userName', 'planName', 'amount', 'payUrl', 'dataRetentionDays'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Account suspended</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">All operations for <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> are disabled.</p>

  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your account has been suspended due to non-payment. Your data will be retained for <strong>${vars.dataRetentionDays || '{{dataRetentionDays}}'} days</strong>. Pay now to restore access immediately.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.payUrl || '{{payUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Pay Now &mdash; KES ${vars.amount || '{{amount}}'}</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Need help? <a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a> &middot; <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
    `, `Your SmartDuka account has been suspended. Pay now to restore access.`),
  },

  subscription_reactivated: {
    name: 'subscription_reactivated',
    subject: 'Your SmartDuka subscription has been reactivated',
    description: 'Sent when subscription is reactivated after payment',
    variables: ['shopName', 'userName', 'planName', 'nextBillingDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Subscription reactivated</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Welcome back! Your account is fully active.</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your ${vars.planName || '{{planName}}'} subscription for <strong>${vars.shopName || '{{shopName}}'}</strong> is active again. All features have been restored.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:120px;">Plan</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.planName || '{{planName}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Next Billing</td><td style="padding:10px 14px;font-size:13px;color:#111827;">${vars.nextBillingDate || '{{nextBillingDate}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Go to Dashboard</a>
  </td></tr>
  </table>
    `, `Your SmartDuka subscription has been reactivated. Welcome back!`),
  },

  plan_changed: {
    name: 'plan_changed',
    subject: 'Your SmartDuka plan has been changed',
    description: 'Sent when a user changes their subscription plan',
    variables: ['shopName', 'userName', 'previousPlan', 'newPlan', 'changeDate', 'dashboardUrl'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Plan changed</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Your subscription for <strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> has been updated.</p>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;">Hi <strong>${vars.userName || '{{userName}}'}</strong>, your plan has been changed. The update is effective immediately.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:120px;">Previous Plan</td><td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.previousPlan || '{{previousPlan}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">New Plan</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${vars.newPlan || '{{newPlan}}'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Change Date</td><td style="padding:10px 14px;font-size:13px;color:#111827;">${vars.changeDate || '{{changeDate}}'}</td></tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="${vars.dashboardUrl || '{{dashboardUrl}}'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Go to Dashboard</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Didn't make this change? <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
    `, `Your SmartDuka plan has been changed from ${vars.previousPlan || ''} to ${vars.newPlan || ''}.`),
  },

  shop_suspended: {
    name: 'shop_suspended',
    subject: 'Your SmartDuka shop has been suspended',
    description: 'Sent when a shop is suspended',
    variables: ['shopName', 'suspensionReason', 'supportEmail'],
    getHtml: (vars: Record<string, any>) => getEmailWrapper(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Shop suspended</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;"><strong style="color:#111827;">${vars.shopName || '{{shopName}}'}</strong> has been suspended.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin:0 0 20px;">
  <tr><td style="padding:14px 16px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;">Reason</p>
    <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">${vars.suspensionReason || '{{suspensionReason}}'}</p>
  </td></tr>
  </table>

  <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Sales, POS access, and inventory management are disabled. Contact support to resolve this and restore your shop.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
  <tr><td style="background-color:#111827;border-radius:6px;text-align:center;">
    <a href="mailto:${vars.supportEmail || 'smartdukainfo@gmail.com'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Contact Support</a>
  </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;"><a href="tel:+254729983567" style="color:#f97316;text-decoration:none;">0729 983 567</a> &middot; <a href="mailto:smartdukainfo@gmail.com" style="color:#f97316;text-decoration:none;">smartdukainfo@gmail.com</a></p>
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
