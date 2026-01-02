# WhatsApp & Redis Configuration Guide

## 📋 Overview

This guide will help you configure:
1. **Redis** - For queue system and caching (optional but recommended)
2. **WhatsApp Business API** - For sending reports and alerts via WhatsApp

---

## 🔴 Redis Configuration

### Option 1: Local Redis (Development)

**Install Redis:**

**Windows:**
```powershell
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Add to .env:**
```env
REDIS_URL=redis://localhost:6379
```

### Option 2: Redis Cloud (Production/Free Tier)

1. **Sign up at:** https://redis.com/try-free/
2. **Create a free database** (30MB free)
3. **Get connection string** from dashboard
4. **Add to .env:**
```env
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### Option 3: Upstash (Serverless Redis)

1. **Sign up at:** https://upstash.com/
2. **Create database** (10K commands/day free)
3. **Copy Redis URL**
4. **Add to .env:**
```env
REDIS_URL=rediss://default:password@us1-example-12345.upstash.io:6379
```

### Skip Redis (Development Only)

If you don't configure Redis:
- ✅ App will work fine
- ✅ Messages sent synchronously
- ❌ No background job processing
- ❌ No message queuing

---

## 📱 WhatsApp Business API Configuration

### Option 1: Meta Cloud API (Recommended)

**Step 1: Create Meta Developer Account**
1. Go to: https://developers.facebook.com/
2. Create account or log in
3. Click "My Apps" → "Create App"
4. Select "Business" type

**Step 2: Add WhatsApp Product**
1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Follow the setup wizard

**Step 3: Get Credentials**
1. **Phone Number ID:**
   - Go to WhatsApp → Getting Started
   - Copy the "Phone number ID"
   
2. **Access Token:**
   - Go to WhatsApp → Getting Started
   - Copy the "Temporary access token" (24 hours)
   - For permanent: Go to Settings → Basic → Generate System User Token

3. **App Secret:**
   - Go to Settings → Basic
   - Click "Show" next to App Secret

4. **Webhook Verify Token:**
   - Create any random string (e.g., `my_webhook_verify_token_123`)

**Step 4: Add to .env:**
```env
# WhatsApp Meta Cloud API
META_WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_WHATSAPP_PHONE_ID=123456789012345
META_WHATSAPP_APP_SECRET=abc123def456ghi789jkl012mno345pq
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_webhook_verify_token_123
WHATSAPP_PROVIDER=meta
WHATSAPP_SENDER_NUMBER=+254700000000
```

**Step 5: Configure Webhook (After deployment)**
1. Go to WhatsApp → Configuration
2. Click "Edit" on Webhook
3. **Callback URL:** `https://your-domain.com/api/v1/whatsapp/webhook`
4. **Verify Token:** (same as META_WHATSAPP_WEBHOOK_VERIFY_TOKEN)
5. Subscribe to: `messages`, `message_status`

### Option 2: Twilio WhatsApp API

**Step 1: Create Twilio Account**
1. Go to: https://www.twilio.com/try-twilio
2. Sign up for free trial ($15 credit)

**Step 2: Enable WhatsApp Sandbox**
1. Go to Console → Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join sandbox

**Step 3: Get Credentials**
1. **Account SID:** Console → Account Info
2. **Auth Token:** Console → Account Info
3. **WhatsApp Number:** Console → WhatsApp → Sandbox (e.g., `+14155238886`)

**Step 4: Add to .env:**
```env
# Twilio WhatsApp API
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
WHATSAPP_PROVIDER=twilio
```

### Skip WhatsApp (Development Only)

If you don't configure WhatsApp:
- ✅ App will work fine
- ✅ Reports logged to console
- ❌ No WhatsApp messages sent
- ❌ No phone verification

---

## 🔧 Complete .env Configuration

Add these sections to your `apps/api/.env`:

```env
# ==================== REDIS (Optional) ====================
# Leave empty to use in-memory cache (development only)
REDIS_URL=

# ==================== WHATSAPP CONFIGURATION ====================
# Provider: 'meta' or 'twilio'
WHATSAPP_PROVIDER=meta

# Meta Cloud API (Option 1)
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_ID=
META_WHATSAPP_APP_SECRET=
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Twilio API (Option 2)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Common
WHATSAPP_SENDER_NUMBER=+254700000000

# ==================== AI REPORTS ====================
# Enable/disable AI report scheduler
AI_REPORTS_ENABLED=true
```

---

## ✅ Verification Steps

### 1. Check Redis Connection
```bash
# In your terminal
curl http://localhost:5000/health
```

Look for logs:
- ✅ `Redis configured - enabling queue system`
- ❌ `Redis not configured - using in-memory cache`

### 2. Check WhatsApp Provider
Look for startup logs:
- ✅ `Meta Cloud WhatsApp provider initialized`
- ✅ `Twilio WhatsApp provider initialized`
- ⚠️ `WhatsApp providers not configured - set META_WHATSAPP_TOKEN...`

### 3. Test WhatsApp Message
```bash
# Using the API
curl -X POST http://localhost:5000/api/v1/whatsapp/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+254712345678",
    "message": "Test message from SmartDuka"
  }'
```

---

## 🚀 Production Deployment

### Environment Variables Checklist

**Required:**
- ✅ `MONGODB_URI` - MongoDB connection
- ✅ `JWT_SECRET` - Secure random string
- ✅ `FRONTEND_URL` - Your frontend domain

**Recommended:**
- ✅ `REDIS_URL` - Redis for queues
- ✅ `META_WHATSAPP_TOKEN` - WhatsApp messaging
- ✅ `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email sending

**Optional:**
- `STRIPE_SECRET_KEY` - Payment processing
- `MPESA_CONSUMER_KEY` - M-Pesa payments
- `TWILIO_*` - Alternative WhatsApp provider

---

## 🆘 Troubleshooting

### Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution:** Redis server not running. Start it or leave `REDIS_URL` empty.

### WhatsApp Provider Not Available
```
⚠️ No WhatsApp provider available - messaging disabled
```
**Solution:** Add `META_WHATSAPP_TOKEN` and `META_WHATSAPP_PHONE_ID` to .env

### Worker Requires Connection
```
Error: Worker requires a connection
```
**Solution:** This is fixed. Restart the dev server.

### Health Check 404
```
Cannot GET /api/v1/health
```
**Solution:** Health endpoint is at `/health` (not `/api/v1/health`)

---

## 📚 Additional Resources

- **Meta WhatsApp Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Twilio WhatsApp Docs:** https://www.twilio.com/docs/whatsapp
- **Redis Cloud:** https://redis.com/try-free/
- **Upstash Redis:** https://upstash.com/

---

## 🎯 Quick Start (Development)

**Minimal setup to get started:**

1. **Skip Redis** (use in-memory cache)
2. **Skip WhatsApp** (logs to console)
3. **Just run:**
   ```bash
   pnpm dev
   ```

**Everything will work**, just without:
- Background job processing
- WhatsApp message delivery
- Message queuing

Add Redis and WhatsApp later when needed!
