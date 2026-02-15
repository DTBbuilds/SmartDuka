# SmartDuka System Documentation

> **Version:** 1.0  
> **Last Updated:** December 2025  
> **Platform:** Multi-tenant POS & Subscription Management for Kenyan Retailers

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Backend Modules](#4-backend-modules)
5. [Data Models](#5-data-models)
6. [Payment Flows](#6-payment-flows)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Super Admin Dashboard](#8-super-admin-dashboard)
9. [Environment Configuration](#9-environment-configuration)
10. [Deployment](#10-deployment)

---

## 1. Overview

**SmartDuka** is a comprehensive Point of Sale (POS) and subscription management platform designed for Kenyan retailers. It provides:

- **Multi-tenant Architecture** — Each shop operates as an isolated tenant
- **Role-based Access** — Admin, Cashier, and Super Admin roles
- **Dual Payment Integration** — M-Pesa (STK Push + Manual) and Stripe
- **Subscription Billing** — Tiered plans with monthly/annual billing cycles
- **Real-time Monitoring** — Super admin dashboard for system-wide oversight

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, TailwindCSS |
| Backend | NestJS, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Payments | M-Pesa Daraja API, Stripe |
| Auth | JWT with role-based guards |
| Hosting | Vercel (Web), Render (API) |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Admin   │  │ Cashier  │  │  Super   │  │  M-Pesa/Stripe   │ │
│  │Dashboard │  │   POS    │  │  Admin   │  │    Webhooks      │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND (apps/web)                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  App Router  │  Auth Context  │  API Client  │  UI Components││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API
┌─────────────────────────────────────────────────────────────────┐
│                    NESTJS BACKEND (apps/api)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │  Shops   │ │  Sales   │ │Inventory │           │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Subscript-│ │ Payments │ │  Super   │ │ Notific- │           │
│  │  ions    │ │ (M-Pesa/ │ │  Admin   │ │  ations  │           │
│  │  Module  │ │  Stripe) │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB DATABASE                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐│
│  │ Shops  │ │ Users  │ │ Sales  │ │Invoices│ │ Subscriptions  ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────────────┘│
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────────────────┐│
│  │Products│ │ Shifts │ │PaymentA│ │     SystemConfig           ││
│  │        │ │        │ │ttempts │ │  (Encrypted Credentials)   ││
│  └────────┘ └────────┘ └────────┘ └────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
SmartDuka/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/                 # Authentication & Guards
│   │   │   ├── shops/                # Shop management
│   │   │   ├── users/                # User management
│   │   │   ├── sales/                # POS & checkout
│   │   │   ├── inventory/            # Stock management
│   │   │   ├── subscriptions/        # Billing & plans
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── subscription.schema.ts
│   │   │   │   │   ├── subscription-plan.schema.ts
│   │   │   │   │   ├── subscription-invoice.schema.ts
│   │   │   │   │   └── payment-attempt.schema.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── payment-attempt.service.ts
│   │   │   │   ├── subscription-mpesa.service.ts
│   │   │   │   └── subscription-payment.controller.ts
│   │   │   ├── payments/             # M-Pesa integration
│   │   │   ├── stripe/               # Stripe integration
│   │   │   ├── super-admin/          # System management
│   │   │   │   ├── schemas/
│   │   │   │   │   └── system-config.schema.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── system-config.service.ts
│   │   │   │   └── system-management.controller.ts
│   │   │   └── notifications/        # Email services
│   │   └── .env.example              # Environment template
│   │
│   └── web/                          # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── admin/            # Shop admin pages
│           │   │   └── subscription/ # Subscription management
│           │   ├── cashier/          # Cashier POS pages
│           │   ├── pos/              # Point of Sale
│           │   ├── super-admin/      # Super admin pages
│           │   │   ├── payments/     # Payment attempts dashboard
│           │   │   ├── settings/     # System configuration
│           │   │   ├── shops/        # Shop management
│           │   │   └── subscriptions/
│           │   └── settings/         # Shop settings
│           ├── components/           # Reusable UI components
│           ├── hooks/                # Custom React hooks
│           └── lib/                  # Utilities & API client
│
├── documentation/                    # System documentation
└── package.json                      # Monorepo root
```

---

## 4. Backend Modules

### Auth Module
- **JWT-based authentication** with access tokens
- **Guards:** `JwtAuthGuard`, `RolesGuard`
- **Decorators:** `@Roles()`, `@CurrentUser()`

### Shops Module
- Shop CRUD operations
- Shop-scoped data isolation
- Audit logging

### Users Module
- User management within shops
- Role assignment: `admin`, `cashier`, `super_admin`
- Password hashing & validation

### Sales Module
- Checkout processing
- Receipt generation
- Sales reporting

### Inventory Module
- Product management
- Stock tracking
- Stock transfers between locations

### Subscriptions Module
Core billing engine:

| Component | Purpose |
|-----------|---------|
| `SubscriptionsService` | Plan management, subscription lifecycle |
| `SubscriptionMpesaService` | M-Pesa STK push & manual payment handling |
| `PaymentAttemptService` | Tracks all payment attempts for audit |
| `SubscriptionPaymentController` | Payment endpoints |

### Super Admin Module
System-wide management:

| Component | Purpose |
|-----------|---------|
| `SystemManagementController` | Dashboard stats, payment attempts, config |
| `SystemConfigService` | Encrypted credential storage |
| `SystemAuditService` | Action logging |

---

## 5. Data Models

### Shop-Scoped Collections

```typescript
// Shop
{
  _id: ObjectId,
  name: string,
  email: string,
  phone: string,
  address: string,
  status: 'active' | 'suspended' | 'inactive',
  createdAt: Date
}

// User
{
  _id: ObjectId,
  shopId: ObjectId,
  email: string,
  password: string (hashed),
  role: 'admin' | 'cashier' | 'super_admin',
  firstName: string,
  lastName: string
}

// Subscription
{
  _id: ObjectId,
  shopId: ObjectId,
  planId: ObjectId,
  planCode: string,
  status: 'active' | 'past_due' | 'cancelled' | 'trialing',
  billingCycle: 'monthly' | 'annual',
  currentPrice: number,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  metadata: {
    upgradedFrom?: string,
    upgradedAt?: Date,
    pendingUpgrade?: object
  }
}

// SubscriptionInvoice
{
  _id: ObjectId,
  shopId: ObjectId,
  subscriptionId: ObjectId,
  invoiceNumber: string,
  type: 'subscription' | 'upgrade' | 'renewal',
  totalAmount: number,
  status: 'pending' | 'paid' | 'failed',
  paymentMethod: 'mpesa_stk' | 'mpesa_manual' | 'stripe',
  mpesaReceiptNumber?: string,
  paidAt?: Date
}
```

### Payment Tracking

```typescript
// PaymentAttempt (NEW)
{
  _id: ObjectId,
  shopId: ObjectId,
  userEmail: string,
  shopName: string,
  
  // Payment details
  method: 'mpesa_stk' | 'mpesa_manual' | 'stripe_card' | 'stripe_link',
  type: 'subscription' | 'upgrade' | 'renewal' | 'invoice',
  status: 'initiated' | 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'expired',
  amount: number,
  currency: string,
  
  // Plan info
  planCode?: string,
  billingCycle?: string,
  
  // M-Pesa specific
  phoneNumber?: string,
  checkoutRequestId?: string,
  merchantRequestId?: string,
  mpesaReceiptNumber?: string,
  
  // Stripe specific
  paymentIntentId?: string,
  
  // Error tracking
  errorCode?: string,
  errorMessage?: string,
  
  // Timestamps
  initiatedAt: Date,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### System-Wide Collections

```typescript
// SystemConfig
{
  _id: ObjectId,
  configType: 'mpesa' | 'stripe' | 'email',
  mpesa?: {
    consumerKey: { encrypted, iv, tag },
    consumerSecret: { encrypted, iv, tag },
    passKey: { encrypted, iv, tag },
    shortCode: string,
    environment: 'sandbox' | 'production',
    callbackUrl: string,
    isActive: boolean
  }
}
```

---

## 6. Payment Flows

### M-Pesa STK Push (Upgrade)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │     │ Frontend │     │ Backend  │     │  M-Pesa  │
│   UI     │     │          │     │   API    │     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Click Upgrade  │                │                │
     │───────────────>│                │                │
     │                │ POST /mpesa/   │                │
     │                │ initiate-upgrade               │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ Create         │
     │                │                │ PaymentAttempt │
     │                │                │ (initiated)    │
     │                │                │                │
     │                │                │ STK Push       │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │<───────────────│
     │                │                │ checkoutReqId  │
     │                │                │                │
     │                │                │ Update attempt │
     │                │                │ (pending)      │
     │                │<───────────────│                │
     │                │ "Check phone"  │                │
     │<───────────────│                │                │
     │                │                │                │
     │   [User enters PIN on phone]   │                │
     │                │                │                │
     │                │                │  Callback      │
     │                │                │<───────────────│
     │                │                │                │
     │                │                │ Verify payment │
     │                │                │ Upgrade plan   │
     │                │                │ Mark success   │
     │                │                │                │
```

### M-Pesa Manual Payment

```
1. User sends money to paybill/phone number
2. User enters M-Pesa receipt code in UI
3. Backend validates receipt format (10 alphanumeric chars)
4. Backend checks for duplicate receipts
5. Backend creates invoice (paid) + upgrades subscription
6. PaymentAttempt recorded with status: success
```

### Stripe Payment

```
1. Frontend creates PaymentIntent via backend
2. User completes payment in Stripe Elements
3. Stripe webhook confirms payment
4. Backend updates invoice + subscription
5. PaymentAttempt tracked throughout
```

---

## 7. Authentication & Authorization

### JWT Flow
```
Login → Validate credentials → Generate JWT → Return token
       ↓
Request → Extract JWT → Validate → Decode payload → Attach user to request
       ↓
Guard → Check role against @Roles() decorator → Allow/Deny
```

### Role Hierarchy
| Role | Access |
|------|--------|
| `super_admin` | All system endpoints, all shops |
| `admin` | Own shop management, subscriptions, settings |
| `cashier` | POS operations, own shift management |

### Protected Routes (Backend)
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post('mpesa/initiate-upgrade')
async initiateUpgradePayment(@CurrentUser() user: JwtPayload) { ... }
```

---

## 8. Super Admin Dashboard

### Features
- **Dashboard** — System-wide statistics
- **Shops** — View/manage all shops
- **Subscriptions** — Monitor all subscriptions
- **Payments** — Real-time payment attempts tracking
- **Settings** — System M-Pesa configuration
- **Emails** — Email logs and management
- **Support** — Support ticket management

### Payment Attempts Dashboard (`/super-admin/payments`)

| Feature | Description |
|---------|-------------|
| Live Refresh | Auto-updates every 10 seconds |
| Stats Cards | Total attempts, success rate, amounts |
| Status Filters | Filter by initiated/pending/success/failed |
| Method Filters | M-Pesa STK, Manual, Stripe |
| Search | By email, phone, receipt, plan |
| Pagination | Navigate through all attempts |

### API Endpoints
```
GET  /super-admin/system/payment-attempts
GET  /super-admin/system/payment-attempts/stats
GET  /super-admin/system/config/mpesa
PUT  /super-admin/system/config/mpesa
POST /super-admin/system/config/mpesa/test
PUT  /super-admin/system/config/mpesa/toggle
```

---

## 9. Environment Configuration

### Required Variables (Production)

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRES=7d

# Server
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# M-Pesa
MPESA_ENV=production
MPESA_CONSUMER_KEY=your-production-key
MPESA_CONSUMER_SECRET=your-production-secret
MPESA_SHORTCODE=your-paybill
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-api-domain.com/payments/mpesa/callback
MPESA_ENCRYPTION_KEY=64-hex-chars-for-aes-256

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=YourApp <your-email@gmail.com>

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=secure-password
```

### Security Notes
- **Never commit `.env` files** — use `.env.example` as template
- **Rotate secrets regularly** — especially after any exposure
- **Use encryption** — SystemConfig stores M-Pesa credentials encrypted (AES-256-GCM)

---

## 10. Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set build command: `pnpm install && pnpm build`
3. Set start command: `pnpm start:prod`
4. Add all environment variables
5. Ensure public HTTPS URL for M-Pesa callbacks

### Frontend (Vercel)
1. Connect GitHub repository
2. Framework preset: Next.js
3. Set environment variables (API URL, etc.)
4. Deploy

### Production URLs
| Service | URL |
|---------|-----|
| Frontend | `https://smartduka-eta.vercel.app` |
| Backend | `https://smartduka-91q6.onrender.com` |

### Health Checks
- Backend: `GET /health`
- M-Pesa Callback: `POST /subscriptions/payments/mpesa/callback`
- Stripe Webhook: `POST /stripe/webhook`

---

## Appendix: Quick Reference

### Key Files
| Purpose | File |
|---------|------|
| M-Pesa Service | `apps/api/src/subscriptions/subscription-mpesa.service.ts` |
| Payment Controller | `apps/api/src/subscriptions/subscription-payment.controller.ts` |
| Payment Tracking | `apps/api/src/subscriptions/schemas/payment-attempt.schema.ts` |
| System Config | `apps/api/src/super-admin/schemas/system-config.schema.ts` |
| Super Admin API | `apps/api/src/super-admin/system-management.controller.ts` |
| Payments Dashboard | `apps/web/src/app/super-admin/payments/page.tsx` |

### Common Commands
```bash
# Development
pnpm dev                    # Start all services

# Build
pnpm build                  # Build all packages

# Database
pnpm db:seed               # Seed initial data

# Git (PowerShell)
git add -A; git commit -m "message"; git push origin main
```

---

**© 2025 SmartDuka. All rights reserved.**
