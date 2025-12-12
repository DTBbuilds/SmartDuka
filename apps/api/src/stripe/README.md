# Stripe Integration for SmartDuka

## Overview

This module provides comprehensive Stripe integration for SmartDuka, enabling:
- **POS Payments**: Card and bank payments at point of sale
- **Subscription Payments**: Recurring billing for SmartDuka plans
- **Customer Management**: Stripe customer sync with local database
- **Analytics**: Payment analytics for shops and super admin
- **Webhooks**: Real-time payment status updates

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  StripePaymentForm  │  StripeSubscriptionPayment  │  Hooks      │
│  (PaymentElement)   │  (Subscription UI)          │  (API calls)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (NestJS)                          │
├─────────────────────────────────────────────────────────────────┤
│  StripeController   │  StripeWebhookController                   │
├─────────────────────────────────────────────────────────────────┤
│  StripeService      │  StripePaymentService                      │
│  StripeCustomerService  │  StripeSubscriptionService             │
│  StripeAnalyticsService                                          │
├─────────────────────────────────────────────────────────────────┤
│  MongoDB Schemas: StripeCustomer, StripePayment,                 │
│                   StripeSubscription, StripeWebhookEvent         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Stripe API                                │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Environment Variables

Add the following to your `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### 2. Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. For webhooks, go to [Webhooks](https://dashboard.stripe.com/webhooks)
4. Create a webhook endpoint pointing to `https://your-api.com/stripe/webhook`
5. Select events to listen to (see Webhook Events section)
6. Copy the **Signing secret**

### 3. Webhook Events

Configure these webhook events in Stripe Dashboard:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.updated`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.succeeded`
- `charge.refunded`

## API Endpoints

### Configuration
- `GET /stripe/config` - Get Stripe publishable key

### POS Payments
- `POST /stripe/pos/create-payment` - Create payment intent for POS sale
- `GET /stripe/payment/:paymentIntentId` - Get payment status

### Subscription Payments
- `POST /stripe/subscription/create-payment` - Create payment for subscription invoice
- `POST /stripe/subscription/create` - Create Stripe subscription
- `GET /stripe/subscription/current` - Get current subscription
- `POST /stripe/subscription/cancel` - Cancel subscription

### Customer Management
- `POST /stripe/customer` - Get or create Stripe customer
- `POST /stripe/customer/setup-intent` - Create setup intent for saving cards
- `GET /stripe/customer/payment-methods` - List saved payment methods
- `POST /stripe/customer/attach-payment-method` - Attach payment method
- `POST /stripe/customer/detach-payment-method` - Remove payment method

### Refunds
- `POST /stripe/refund` - Process refund

### Analytics
- `GET /stripe/analytics/shop` - Shop payment statistics
- `GET /stripe/analytics/trends` - Revenue trends
- `GET /stripe/analytics/recent` - Recent transactions

### Super Admin
- `GET /stripe/admin/subscription-analytics` - Subscription analytics
- `GET /stripe/admin/balance` - Stripe balance
- `GET /stripe/admin/transactions` - All transactions
- `GET /stripe/admin/payment-methods` - Payment method distribution

### Webhooks
- `POST /stripe/webhook` - Stripe webhook handler

## Frontend Usage

### POS Payment

```tsx
import { useStripePayment } from '@/hooks/use-stripe-payment';
import { StripePaymentModal } from '@/components/stripe-payment-form';

function POSCheckout({ order }) {
  const { createPOSPayment, clientSecret, isConfigured } = useStripePayment({
    onSuccess: (paymentIntentId) => {
      console.log('Payment successful:', paymentIntentId);
    },
    onError: (error) => {
      console.error('Payment failed:', error);
    },
  });

  const handleStripePayment = async () => {
    await createPOSPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total * 100, // Convert to cents
      currency: 'kes',
    });
  };

  return (
    <>
      <button onClick={handleStripePayment}>Pay with Card/Bank</button>
      <StripePaymentModal
        isOpen={!!clientSecret}
        clientSecret={clientSecret}
        amount={order.total * 100}
        currency="kes"
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </>
  );
}
```

### Subscription Payment

```tsx
import { StripeSubscriptionPayment } from '@/components/stripe-subscription-payment';

function SubscriptionCheckout({ plan, clientSecret }) {
  return (
    <StripeSubscriptionPayment
      clientSecret={clientSecret}
      planName={plan.name}
      planPrice={plan.price * 100}
      currency="kes"
      interval="month"
      trialDays={14}
      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      onSuccess={(subscriptionId) => {
        console.log('Subscribed:', subscriptionId);
      }}
      onCancel={() => {}}
    />
  );
}
```

## Kenya Considerations

### Currency
- Use `kes` (Kenyan Shilling) as the currency
- Amounts are in cents (smallest unit), so KES 1,000 = 100000

### Payment Methods
Stripe supports these payment methods in Kenya:
- Credit/Debit Cards (Visa, Mastercard)
- Bank transfers (via Stripe Financial Connections)

### M-Pesa Integration
For M-Pesa payments, use the existing M-Pesa integration (`PaymentsModule`).
Stripe is complementary for international cards and bank payments.

### Hybrid Approach
SmartDuka uses a hybrid payment approach:
- **M-Pesa**: Local Kenyan mobile money (via Daraja API)
- **Stripe**: International cards and bank payments

## Database Schemas

### StripeCustomer
Links SmartDuka shops to Stripe customers.

### StripePayment
Tracks all Stripe payments with full details.

### StripeSubscription
Syncs Stripe subscriptions with local database.

### StripeWebhookEvent
Stores webhook events for idempotency and audit.

## Security

- Webhook signatures are verified using `STRIPE_WEBHOOK_SECRET`
- API keys are stored in environment variables
- Payment intents use client secrets (never expose secret key to frontend)
- All endpoints are protected with JWT authentication

## Testing

### Test Cards
Use Stripe test cards for development:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Webhook Testing
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:5000/stripe/webhook
```

## Troubleshooting

### "Stripe is not configured"
Ensure `STRIPE_SECRET_KEY` is set in environment variables.

### Webhook signature verification failed
Check that `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret.

### Payment requires action
Some payments require 3D Secure authentication. The frontend handles this automatically.
