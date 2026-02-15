# Stripe Webhook Setup Guide

This guide explains how to configure Stripe webhooks for SmartDuka to receive real-time payment events.

## Overview

SmartDuka uses Stripe webhooks to:
- **Activate subscriptions** when payments succeed
- **Grant access** to shop features after payment
- **Record transactions** for audit and analytics
- **Handle failed payments** with retry logic
- **Manage renewals and cancellations**
- **Track disputes and refunds**

## Webhook Endpoint

**Production URL:**
```
https://smartduka-91q6.onrender.com/stripe/webhook
```

**Local Development URL (with ngrok):**
```
https://your-ngrok-url.ngrok-free.app/stripe/webhook
```

## Required Events

Configure your Stripe webhook to listen for these events:

### Payment Events (Critical)
| Event | Purpose |
|-------|---------|
| `payment_intent.succeeded` | Record successful payment, activate subscription |
| `payment_intent.payment_failed` | Record failed payment, update subscription status |
| `payment_intent.canceled` | Handle canceled payments |
| `payment_intent.processing` | Track processing payments |
| `payment_intent.requires_action` | Handle 3D Secure authentication |

### Subscription Events (Critical)
| Event | Purpose |
|-------|---------|
| `customer.subscription.created` | Sync new subscription |
| `customer.subscription.updated` | Update subscription status (active, past_due, etc.) |
| `customer.subscription.deleted` | Handle subscription cancellation |
| `customer.subscription.paused` | Handle paused subscriptions |
| `customer.subscription.resumed` | Handle resumed subscriptions |
| `customer.subscription.trial_will_end` | Send trial ending notification |

### Invoice Events (Critical for Billing)
| Event | Purpose |
|-------|---------|
| `invoice.paid` | **PRIMARY** - Activate subscription, grant access |
| `invoice.payment_failed` | Handle failed invoice payment, notify user |
| `invoice.upcoming` | Send payment reminder (3 days before) |
| `invoice.finalized` | Invoice ready for payment |

### Checkout Events
| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Handle Checkout-based subscription setup |

### Charge Events
| Event | Purpose |
|-------|---------|
| `charge.succeeded` | Update receipt URL |
| `charge.refunded` | Record refund transaction |
| `charge.dispute.created` | Alert super admin about disputes |

### Customer Events
| Event | Purpose |
|-------|---------|
| `customer.updated` | Sync customer data |

## Setup Instructions

### 1. Create Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   - Production: `https://smartduka-91q6.onrender.com/stripe/webhook`
   - Development: Use ngrok URL
4. Select events (see list above)
5. Click **"Add endpoint"**

### 2. Get Webhook Secret

1. After creating the webhook, click on it
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### 3. Configure Environment Variable

Add to your `.env.local` or production environment:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Verify Webhook is Working

1. In Stripe Dashboard, go to your webhook
2. Click **"Send test webhook"**
3. Select an event type (e.g., `payment_intent.succeeded`)
4. Click **"Send test webhook"**
5. Check the response - should return `200 OK` with `{"received": true}`

## Local Development with Stripe CLI

For local testing, use the Stripe CLI:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/stripe/webhook

# The CLI will output a webhook secret - use this for local testing
# Example: whsec_abc123...
```

## Event Flow

### Successful Payment Flow
```
1. Customer initiates payment
2. payment_intent.succeeded → Record transaction
3. invoice.paid → Activate subscription, grant access
4. customer.subscription.updated → Sync subscription status
5. charge.succeeded → Update receipt URL
```

### Failed Payment Flow
```
1. Payment attempt fails
2. payment_intent.payment_failed → Record failure
3. invoice.payment_failed → Update subscription, notify user
4. After 3 failures → Mark subscription as PAST_DUE
5. After grace period → Suspend subscription
```

### Subscription Renewal Flow
```
1. invoice.upcoming → Send reminder (3 days before)
2. invoice.finalized → Invoice ready
3. invoice.paid → Extend subscription period
4. customer.subscription.updated → Sync new period dates
```

## Troubleshooting

### Webhook Returns 400/500
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw body parsing is enabled for webhook route
- Check server logs for detailed error messages

### Events Not Being Processed
- Verify events are selected in Stripe Dashboard
- Check webhook event logs in Stripe Dashboard
- Ensure endpoint URL is correct and accessible

### Duplicate Events
- SmartDuka handles idempotency automatically
- Events are stored with `stripeEventId` to prevent duplicates
- Processed events are marked and skipped on retry

### Signature Verification Failed
- Webhook secret mismatch - regenerate and update
- Request body modified before verification
- Clock skew between servers (rare)

## Security Best Practices

1. **Always verify webhook signatures** - Already implemented
2. **Use HTTPS in production** - Required by Stripe
3. **Roll webhook secrets periodically** - Stripe Dashboard > Webhook > Roll secret
4. **Monitor webhook failures** - Check Stripe Dashboard regularly
5. **Handle events idempotently** - Already implemented with event ID tracking

## Monitoring

### Stripe Dashboard
- View webhook delivery attempts
- See response codes and bodies
- Retry failed deliveries manually

### Application Logs
- All webhook events are logged
- Search for `[StripeWebhookController]` in logs
- Error events include full stack traces

## Support

For issues with Stripe integration:
1. Check Stripe Dashboard webhook logs
2. Review application logs
3. Test with Stripe CLI locally
4. Contact Stripe support for API issues
