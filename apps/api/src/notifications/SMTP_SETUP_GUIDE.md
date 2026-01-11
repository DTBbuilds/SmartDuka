# SMTP Configuration Guide for SmartDuka

Email sending in SmartDuka requires SMTP configuration. This guide walks you through setting up email for different providers.

## Quick Start

Set these environment variables in your `.env` file:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
```

## Provider-Specific Setup

### Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   - Copy this password (remove spaces)

3. **Configure SmartDuka**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # Remove spaces: xxxxxxxxxxxxxxxx
   SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
   ```

### Microsoft Outlook

1. **Get SMTP Credentials**
   - Email: your-email@outlook.com
   - Password: Your Outlook password

2. **Configure SmartDuka**
   ```bash
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=465
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-outlook-password
   SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
   ```

### SendGrid

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Create an API key

2. **Configure SmartDuka**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=465
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key-here
   SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
   ```

### AWS SES (Production)

1. **Set Up SES**
   - Go to AWS SES Console
   - Verify your domain or email
   - Create SMTP credentials

2. **Configure SmartDuka**
   ```bash
   SMTP_HOST=email-smtp.region.amazonaws.com
   SMTP_PORT=465
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   SMTP_FROM=SmartDuka <noreply@smartduka.co.ke>
   ```

## Troubleshooting

### "Email not sent - SMTP not configured"

This means one or more required environment variables are missing:
- `SMTP_HOST` - The SMTP server address
- `SMTP_USER` - Your email address or username
- `SMTP_PASS` - Your password or app password

**Solution:** Set all three variables and restart the backend.

### "SMTP connection failed"

Possible causes:
1. **Incorrect credentials** - Double-check your email and password
2. **SMTP server unreachable** - Verify the SMTP host is correct
3. **Firewall blocking** - Check if port 587 (or 465) is open
4. **Gmail App Password** - Make sure you're using App Password, not regular password

**Solution:** 
- Test connection via the admin panel: `/super-admin/emails`
- Click "Test SMTP Connection" button
- Check the error message for specific issues

### "Authentication failed"

For Gmail:
- Make sure 2FA is enabled
- Use App Password (not regular password)
- Remove spaces from the 16-character password

For Outlook:
- Use your full email address as username
- Check if "Allow less secure apps" is enabled

### Port Issues

- **Port 465** (SSL) - Recommended, more reliable across networks
- **Port 587** (TLS) - Alternative, often blocked by firewalls
- **Port 25** (SMTP) - Usually blocked by ISPs, avoid

## Testing

### Via Admin Panel

1. Go to `/super-admin/emails`
2. Click "Email Settings"
3. Click "Test SMTP Connection"
4. Check if test email is received

### Via API

```bash
curl -X POST http://localhost:5000/admin/emails/config/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"your-email@example.com"}'
```

### Check Logs

Backend logs will show:
- `✓ SMTP connection established successfully` - Configuration is working
- `✗ SMTP configuration incomplete` - Missing environment variables
- `❌ SMTP connection failed` - Connection error

## Email Templates

SmartDuka includes pre-configured templates for:
- Welcome emails
- Password reset
- Subscription notifications
- Payment confirmations
- Low stock alerts
- Daily sales reports
- Employee invitations

All templates can be customized in the admin panel.

## Production Recommendations

1. **Use SendGrid or AWS SES** for reliability and deliverability
2. **Set up SPF, DKIM, DMARC** for your domain
3. **Monitor bounce rates** in email provider dashboard
4. **Use dedicated IP** for high-volume sending
5. **Implement unsubscribe links** in email templates
6. **Test with real email** before going live

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes | smtp.gmail.com | SMTP server address |
| `SMTP_PORT` | No | 465 | SMTP port (default: 465, SSL) |
| `SMTP_USER` | Yes | user@gmail.com | Email address or username |
| `SMTP_PASS` | Yes | app-password | Password or app-specific password |
| `SMTP_FROM` | No | noreply@smartduka.co.ke | From address for emails |

## Support

For issues:
1. Check this guide first
2. Review backend logs for error messages
3. Test SMTP connection via admin panel
4. Verify credentials with email provider
5. Check firewall/network settings
