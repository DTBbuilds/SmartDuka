# M-Pesa Daraja API Setup Guide

## Overview
SmartDuka now includes real M-Pesa Daraja API integration for STK push payments. This guide explains how to set up and configure M-Pesa payments.

---

## Prerequisites

1. **M-Pesa Business Account**
   - Register at [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
   - Create an app to get Consumer Key and Consumer Secret

2. **Business Short Code**
   - Get your business short code from Safaricom (usually 6 digits)
   - Example: 174379 (Sandbox) or your actual business code (Production)

3. **Pass Key**
   - Provided by Safaricom for your business
   - Used for password generation and callback validation

4. **Callback URL**
   - Public HTTPS endpoint where M-Pesa sends payment confirmations
   - Must be accessible from the internet
   - Example: `https://your-domain.com/payments/callback`

---

## Environment Variables

Add these to your `.env` file in the `apps/api` directory:

```env
# M-Pesa Daraja Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_pass_key_here
MPESA_ENV=sandbox
MPESA_CALLBACK_URL=https://your-domain.com/payments/callback
```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `MPESA_CONSUMER_KEY` | API Consumer Key from Daraja | `abc123xyz...` |
| `MPESA_CONSUMER_SECRET` | API Consumer Secret from Daraja | `xyz789abc...` |
| `MPESA_SHORTCODE` | Business Short Code | `174379` (sandbox) or `123456` (production) |
| `MPESA_PASSKEY` | Pass Key for password generation | `bfb279f9aa9bdbcf158e97dd1a503b6e` |
| `MPESA_ENV` | Environment: `sandbox` or `production` | `sandbox` |
| `MPESA_CALLBACK_URL` | Public HTTPS endpoint for callbacks | `https://smartduka.example.com/payments/callback` |

---

## Getting Credentials from Daraja

### Step 1: Register on Daraja Portal
1. Go to [Safaricom Daraja](https://developer.safaricom.co.ke/)
2. Sign up or log in with your account
3. Create a new app

### Step 2: Get Consumer Key & Secret
1. In your app settings, you'll see:
   - **Consumer Key** - Copy this
   - **Consumer Secret** - Copy this

### Step 3: Get Business Short Code & Pass Key
1. Contact Safaricom support or check your business account
2. Business Short Code is usually provided during onboarding
3. Pass Key is generated and provided separately

### Step 4: Test in Sandbox
- Use Short Code: `174379` (Safaricom test code)
- Use Pass Key: `bfb279f9aa9bdbcf158e97dd1a503b6e` (Safaricom test key)
- Use test phone numbers starting with `254` (Kenya country code)

---

## API Endpoints

### 1. Initiate STK Push
**Endpoint:** `POST /payments/stk-push`  
**Auth:** JWT Bearer Token Required

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 1000,
  "orderId": "ORD-12345",
  "accountReference": "SmartDuka-Order-12345",
  "customerEmail": "customer@example.com",
  "transactionDesc": "Payment for groceries"
}
```

**Response (Success):**
```json
{
  "requestId": "16813-1590511200-1",
  "responseCode": "0",
  "responseDescription": "Success. Request accepted for processing",
  "customerMessage": "STK push sent to 254712345678"
}
```

**Response (Error):**
```json
{
  "error": "Failed to authenticate with M-Pesa"
}
```

### 2. Query STK Status
**Endpoint:** `GET /payments/stk-status?checkoutRequestId=<id>&merchantRequestId=<id>`  
**Auth:** JWT Bearer Token Required

**Response:**
```json
{
  "status": "completed",
  "resultCode": 0,
  "resultDesc": "The service request has been processed successfully."
}
```

### 3. M-Pesa Callback
**Endpoint:** `POST /payments/callback`  
**Auth:** None (M-Pesa sends this)

**Callback Payload (from M-Pesa):**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16813-1590511200-1",
      "CheckoutRequestID": "ws_CO_DMZ_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request has been processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1000
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "LHG31AA5TX4"
          },
          {
            "Name": "PhoneNumber",
            "Value": "254712345678"
          },
          {
            "Name": "TransactionDate",
            "Value": 20191122063845
          }
        ]
      }
    }
  }
}
```

---

## Testing in Sandbox

### 1. Test Phone Numbers
Use these test numbers in sandbox:
- `254712345678` - Test number 1
- `254700000000` - Test number 2
- Any number starting with `254` works in sandbox

### 2. Test Amounts
- Any amount between 1-10000 KES works
- Sandbox accepts all amounts

### 3. Simulating Payments
In sandbox, M-Pesa automatically completes payments within a few seconds. You can:
1. Call STK Push endpoint
2. Wait 5-10 seconds
3. Query STK Status to see if payment completed

### 4. Testing Callbacks
For local testing, use a tunnel service:
- [ngrok](https://ngrok.com/) - Expose local server to internet
- [localtunnel](https://localtunnel.me/) - Alternative tunnel service

Example with ngrok:
```bash
ngrok http 3000
# Get URL like: https://abc123.ngrok.io
# Set MPESA_CALLBACK_URL=https://abc123.ngrok.io/payments/callback
```

---

## Production Deployment

### 1. Switch to Production
```env
MPESA_ENV=production
MPESA_SHORTCODE=your_actual_business_code
MPESA_PASSKEY=your_actual_pass_key
```

### 2. Update Credentials
- Get production Consumer Key & Secret from Daraja
- Get production Business Short Code from Safaricom
- Get production Pass Key from Safaricom

### 3. Ensure HTTPS
- Callback URL must be HTTPS (not HTTP)
- M-Pesa will reject HTTP callbacks

### 4. Configure Callback URL
- Update `MPESA_CALLBACK_URL` to your production domain
- Example: `https://smartduka.example.com/payments/callback`

### 5. Test Before Going Live
1. Test with small amounts (1-10 KES)
2. Verify callbacks are received
3. Check order payment status updates
4. Monitor logs for errors

---

## Troubleshooting

### Issue: "Failed to authenticate with M-Pesa"
**Cause:** Invalid Consumer Key or Secret  
**Solution:**
1. Verify credentials in Daraja portal
2. Check for typos in `.env` file
3. Ensure credentials are for the correct environment (sandbox vs production)

### Issue: "Invalid Short Code"
**Cause:** Wrong business short code  
**Solution:**
1. Verify short code with Safaricom
2. Use `174379` for sandbox testing
3. Check if short code is activated

### Issue: "Callback not received"
**Cause:** Callback URL not accessible or incorrect  
**Solution:**
1. Verify callback URL is publicly accessible
2. Check if URL is HTTPS (required for production)
3. Use ngrok for local testing
4. Check firewall/security group settings

### Issue: "Invalid Pass Key"
**Cause:** Wrong pass key or corrupted value  
**Solution:**
1. Get fresh pass key from Safaricom
2. Ensure no extra spaces or characters
3. Use correct pass key for environment (sandbox vs production)

### Issue: "Payment shows pending but never completes"
**Cause:** Callback processing failed  
**Solution:**
1. Check server logs for callback errors
2. Verify callback endpoint is working
3. Check database for payment records
4. Monitor M-Pesa transaction logs

---

## Security Best Practices

1. **Never commit credentials**
   - Use `.env` files (add to `.gitignore`)
   - Use environment variables in production

2. **Validate callbacks**
   - Verify callback signature (implemented in DarajaService)
   - Check transaction amounts match orders
   - Prevent duplicate processing

3. **Use HTTPS everywhere**
   - Callback URL must be HTTPS
   - All API calls use HTTPS

4. **Rate limiting**
   - Implement rate limiting on STK push endpoint
   - Prevent brute force attacks

5. **Logging**
   - Log all payment transactions
   - Monitor for suspicious patterns
   - Keep logs for audit trail

---

## Integration with Orders

The payment system is designed to integrate with the Orders module:

1. **Initiate Payment**
   - User selects M-Pesa payment
   - Call `/payments/stk-push` with order details
   - Get CheckoutRequestID

2. **Wait for Callback**
   - M-Pesa sends callback to `/payments/callback`
   - System updates order payment status
   - Generate receipt

3. **Query Status (Optional)**
   - Frontend can poll `/payments/stk-status`
   - Show payment status to user
   - Update UI when payment completes

---

## Next Steps

1. Register on [Safaricom Daraja](https://developer.safaricom.co.ke/)
2. Get your credentials
3. Add to `.env` file
4. Test in sandbox
5. Deploy to production

---

## Support

For issues with:
- **M-Pesa API:** Contact [Safaricom Support](https://developer.safaricom.co.ke/support)
- **SmartDuka Integration:** Check logs and error messages
- **Callbacks:** Verify endpoint accessibility and HTTPS

