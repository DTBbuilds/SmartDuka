# Email Management - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Choose Your Email Provider

Pick one of these options:

| Provider | Best For | Setup Time |
|----------|----------|-----------|
| **Gmail** | Development | 2 minutes |
| **Outlook** | Business | 1 minute |
| **SendGrid** | Production | 5 minutes |
| **AWS SES** | Enterprise | 10 minutes |

### 2. Get Your SMTP Credentials

#### Gmail
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password (remove spaces)

#### Outlook
- Email: `your-email@outlook.com`
- Password: Your Outlook password

#### SendGrid
1. Create account at https://sendgrid.com
2. Generate API key
3. Username: `apikey`

#### AWS SES
1. Go to AWS SES Console
2. Create SMTP credentials

### 3. Update `.env` File

Edit `apps/api/.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
```

### 4. Restart Backend

```bash
# Stop current process (Ctrl+C)
# Restart
npm run dev
```

### 5. Test It

1. Go to `/super-admin/email-settings`
2. Click "Test SMTP Connection"
3. Check if test email arrives
4. Done! ✅

## 📊 Admin Dashboard

### Email Settings
**URL:** `/super-admin/email-settings`

- View SMTP configuration status
- Test connection with one click
- See setup instructions for all providers
- Copy-paste ready credentials

### Email Logs
**URL:** `/super-admin/email-logs`

- View all sent/failed emails
- Filter by status, template, recipient
- Retry failed emails
- Export logs to CSV
- Real-time statistics

## 🔧 Troubleshooting

### Problem: "SMTP not configured"
**Solution:** Check `.env` has `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and restart backend

### Problem: "Connection failed"
**Solution:** 
- Verify credentials are correct
- For Gmail: Use App Password, not regular password
- Check firewall allows port 587

### Problem: "Authentication failed"
**Solution:**
- Gmail: Enable 2FA, use App Password
- Outlook: Use full email address
- SendGrid: Use `apikey` as username

## 📋 Configuration Checklist

```
☐ Choose email provider
☐ Get SMTP credentials
☐ Update .env file
☐ Restart backend
☐ Test SMTP connection
☐ Verify test email received
☐ Check logs in admin panel
```

## 🔍 Check Logs

### Backend Startup Logs
Look for one of these:

**Success:**
```
✅ SMTP connection established successfully
   Connected to: smtp.gmail.com:587
   From address: SmartDuka <noreply@smartduka.co.ke>
```

**Not Configured:**
```
⚠️  SMTP configuration incomplete. Email sending is DISABLED.
To enable email sending, set these environment variables:
  - SMTP_HOST (e.g., smtp.gmail.com)
  - SMTP_USER (your email address)
  - SMTP_PASS (your app password or password)
```

## 📧 Email Templates

Pre-configured templates:
- Welcome emails
- Password reset
- Subscription notifications
- Payment confirmations
- Low stock alerts
- Daily sales reports
- Employee invitations

All customizable in admin panel.

## 🎯 Common Configurations

### Gmail (Development)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

### Outlook
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key
```

### AWS SES
```bash
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

## 📞 Support

- **Setup Guide:** `apps/api/src/notifications/SMTP_SETUP_GUIDE.md`
- **Full Summary:** `SMTP_CONFIGURATION_SUMMARY.md`
- **Admin Panel:** `/super-admin/email-settings` and `/super-admin/email-logs`

## ✅ Status

Email management system is **fully implemented and ready to use**.

**What's included:**
- ✅ SMTP configuration validation
- ✅ Connection testing
- ✅ Email logging and monitoring
- ✅ Admin dashboard
- ✅ Retry mechanism
- ✅ CSV export
- ✅ Comprehensive documentation

**Next step:** Configure your SMTP settings and test!
