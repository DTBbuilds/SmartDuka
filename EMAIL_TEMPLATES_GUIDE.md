# SmartDuka Professional Email Templates

## Overview

All SmartDuka email templates have been redesigned with consistent professional branding, matching the SmartDuka POS and Inventory system's visual identity.

## Brand Identity

### Colors
- **Primary Orange:** `#f97316` (HSL 25 95% 53%)
- **Dark Orange:** `#ea580c` (HSL 24 94% 48%)
- **Light Orange Background:** `#fff7ed`, `#ffedd5`
- **Success Green:** `#10b981`
- **Warning Amber:** `#f59e0b`
- **Error Red:** `#ef4444`
- **Dark Text:** `#1f2937`
- **Light Background:** `#f3f4f6`

### Logo
- Shopping cart icon (SVG) in SmartDuka orange
- White background container with rounded corners
- Consistent placement in email header

### Contact Information
All emails include:
- **Phone:** 0729 983 567 | 0104 160 502
- **Email:** smartdukainfo@gmail.com
- **Website:** smartduka.co.ke

## Email Templates

### 1. Welcome Email (`welcome`)
**Trigger:** New shop registration
**Subject:** `Welcome to SmartDuka, {{shopName}}! 🎉`

**Features:**
- Congratulations message
- Free trial days highlight
- Plan details with limits (shops, staff, products)
- Feature checklist
- Get Started CTA button
- Help section with contact info

**Variables:**
- `shopName`, `userName`, `loginUrl`, `planName`, `trialDays`
- `billingCycle`, `planPrice`, `maxShops`, `maxEmployees`, `maxProducts`

---

### 2. Password Reset (`password_reset`)
**Trigger:** User requests password reset
**Subject:** `Reset your SmartDuka password 🔐`

**Features:**
- Clear reset button
- Expiry warning
- Security tips
- Contact info for suspicious activity

**Variables:**
- `userName`, `resetUrl`, `expiryMinutes`

---

### 3. Employee Invitation (`employee_invited`)
**Trigger:** Employee invited to shop
**Subject:** `You've been invited to join {{shopName}} on SmartDuka 👋`

**Features:**
- Role highlight
- Temporary password display
- Security warning to change password
- Login CTA button

**Variables:**
- `shopName`, `employeeName`, `role`, `invitedBy`, `loginUrl`, `tempPassword`

---

### 4. Low Stock Alert (`low_stock_alert`)
**Trigger:** Products below reorder level
**Subject:** `⚠️ Low Stock Alert - {{productCount}} products need attention`

**Features:**
- Product count highlight
- Product list
- View Inventory CTA
- Urgency messaging

**Variables:**
- `shopName`, `productCount`, `productList`, `dashboardUrl`

---

### 5. Daily Sales Report (`daily_sales_report`)
**Trigger:** End of business day (scheduled)
**Subject:** `📊 Daily Sales Report - {{date}} | {{shopName}}`

**Features:**
- Total sales and order count stats
- Top selling products list
- View Full Report CTA
- Professional formatting

**Variables:**
- `shopName`, `date`, `totalSales`, `orderCount`, `topProducts`, `dashboardUrl`

---

### 6. Subscription Activated (`subscription_activated`)
**Trigger:** Subscription payment successful
**Subject:** `✅ Your {{planName}} subscription is now active!`

**Features:**
- Success confirmation
- Plan name and price
- Start date and next billing date
- Dashboard CTA

**Variables:**
- `shopName`, `userName`, `planName`, `price`, `billingCycle`
- `features`, `startDate`, `nextBillingDate`, `dashboardUrl`

---

### 7. Subscription Expiring (`subscription_expiring`)
**Trigger:** Subscription expiring soon
**Subject:** `⏰ Your SmartDuka subscription expires in {{daysLeft}} days`

**Features:**
- Days remaining countdown
- Expiry date
- Renew Now CTA
- Contact info

**Variables:**
- `shopName`, `userName`, `planName`, `expiryDate`, `daysLeft`, `renewUrl`

---

### 8. Subscription Expired (`subscription_expired`)
**Trigger:** Subscription has expired
**Subject:** `⚠️ Your SmartDuka subscription has expired`

**Features:**
- Expired status
- Grace period info
- Limited functionality warning
- Renew Now CTA

**Variables:**
- `shopName`, `userName`, `planName`, `expiredDate`, `renewUrl`, `gracePeriodDays`

---

### 9. Payment Successful (`payment_successful`)
**Trigger:** Payment received
**Subject:** `✅ Payment Received - {{amount}} {{currency}}`

**Features:**
- Payment amount highlight
- Transaction details (date, plan, method, ID)
- View Receipt CTA
- Thank you message

**Variables:**
- `shopName`, `userName`, `amount`, `currency`, `paymentMethod`
- `transactionId`, `planName`, `receiptUrl`, `date`

---

### 10. Shop Verified (`shop_verified`)
**Trigger:** Super admin verifies shop
**Subject:** `🎉 Congratulations! Your shop {{shopName}} is now verified!`

**Features:**
- Verified badge
- Verification date
- Feature access list
- Dashboard and Login CTAs

**Variables:**
- `shopName`, `verificationDate`, `loginUrl`, `dashboardUrl`

---

### 11. Shop Rejected (`shop_rejected`)
**Trigger:** Shop application rejected
**Subject:** `Update on your SmartDuka shop application`

**Features:**
- Rejection reason
- Contact support CTA
- Phone and email contact info

**Variables:**
- `shopName`, `rejectionReason`, `supportEmail`

---

### 12. Shop Suspended (`shop_suspended`)
**Trigger:** Shop suspended
**Subject:** `⚠️ Your SmartDuka shop has been suspended`

**Features:**
- Suspension reason
- Limited functionality list
- Contact support CTA
- Phone and email contact info

**Variables:**
- `shopName`, `suspensionReason`, `supportEmail`

---

## Technical Implementation

### Files
- **Template Definitions:** `apps/api/src/notifications/email-templates.ts`
- **Email Service:** `apps/api/src/notifications/email.service.ts`
- **Template Schema:** `apps/api/src/notifications/email-template.schema.ts`

### How Templates Are Seeded
Templates are automatically seeded when the backend starts via `EmailService.seedTemplates()`.

### Sending Emails
```typescript
// Using template
await emailService.sendTemplateEmail({
  to: 'user@example.com',
  templateName: 'welcome',
  variables: {
    shopName: 'My Shop',
    userName: 'John',
    loginUrl: 'https://smartduka.co.ke/login',
    // ... other variables
  },
});

// Direct email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  html: '<p>Custom HTML content</p>',
});
```

## Design Features

### Responsive Design
- Mobile-friendly layouts
- Flexible widths
- Touch-friendly buttons

### Accessibility
- High contrast text
- Clear hierarchy
- Descriptive link text

### Email Client Compatibility
- Inline CSS for maximum compatibility
- Table-based layout fallbacks
- MSO conditionals for Outlook

### Professional Elements
- Gradient headers
- Rounded corners
- Box shadows
- Icon integration
- Consistent spacing

## Footer Content

All emails include a professional footer with:
- SmartDuka logo and tagline
- Contact phone numbers
- Email address
- Website link
- Navigation links (Website, Help Center, Pricing, Contact)
- Copyright notice
- Legal disclaimer

## Customization

To modify templates:
1. Edit `apps/api/src/notifications/email-templates.ts`
2. Update the `getHtml` function for the specific template
3. Restart the backend to reseed templates

## Testing

1. Start the backend: `pnpm dev`
2. Go to `/super-admin/email-settings`
3. Click "Test SMTP Connection"
4. Check the test email for proper formatting

## Best Practices Applied

Based on industry research:
1. ✅ Consistent branding across all emails
2. ✅ Clear, prominent CTAs
3. ✅ Mobile-responsive design
4. ✅ Professional footer with contact info
5. ✅ Preheader text for email previews
6. ✅ Accessible color contrast
7. ✅ Trust-building elements (logo, contact info)
8. ✅ Clear subject lines with emojis
9. ✅ Personalization with user/shop names
10. ✅ Uncluttered, scannable layouts

---

**Last Updated:** December 2024
**Status:** ✅ All 12 email templates professionally redesigned
