# SmartDuka M-Pesa Implementation Analysis & Improvements

## Executive Summary

After comprehensive analysis of the SmartDuka M-Pesa implementation and comparison with industry best practices, this document outlines the current state, identified gaps, and recommended improvements for building a robust, multi-tenant M-Pesa payment system.

---

## Current Implementation Analysis

### ✅ What's Already Well Implemented

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **Idempotency Keys** | ✅ Excellent | `mpesa.service.ts` | Prevents duplicate STK pushes |
| **Transaction State Machine** | ✅ Good | `mpesa-transaction.schema.ts` | CREATED → PENDING → COMPLETED/FAILED/EXPIRED |
| **Multi-Tenant Isolation** | ✅ Good | Schema + Service | shopId filtering on all queries |
| **Retry Mechanism** | ✅ Good | `mpesa.service.ts` | Max 3 retries with new idempotency key |
| **Phone Validation** | ✅ Good | `mpesa.dto.ts` | Kenyan format validation (07XX, 01XX, 254XX) |
| **Expiry Handling** | ✅ Good | 5-minute timeout | Auto-expire pending transactions |
| **Callback Processing** | ✅ Good | `processCallback()` | Handles success/failure callbacks |
| **Frontend Flow** | ✅ Good | `mpesa-payment-flow.tsx` | Real-time polling, countdown timer |
| **Multi-Tenant Config** | ✅ Partial | `mpesa-multi-tenant.service.ts` | Shop-specific credentials support |

### ⚠️ Areas Needing Improvement

| Issue | Severity | Impact | Solution |
|-------|----------|--------|----------|
| **No Credential Encryption** | 🔴 Critical | Security vulnerability | Encrypt M-Pesa credentials at rest |
| **No Callback Signature Validation** | 🔴 Critical | Spoofed callbacks possible | Validate using passkey |
| **No Reconciliation Service** | 🟠 High | Stuck transactions | Scheduled job to query M-Pesa |
| **No Failed Payments Dashboard** | 🟠 High | Poor visibility | Admin UI for failed transactions |
| **No Transaction Audit Log** | 🟡 Medium | Compliance issues | Detailed audit trail |
| **No Rate Limiting** | 🟡 Medium | API abuse possible | Per-shop rate limits |
| **No Webhook Retry Queue** | 🟡 Medium | Lost callbacks | Queue failed webhook processing |

---

## Multi-Tenant Architecture

### Current Design (Good Foundation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SmartDuka Multi-Tenant M-Pesa                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Shop A     │  │   Shop B     │  │   Shop C     │              │
│  │ (Own Till)   │  │ (Own Paybill)│  │ (Platform)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              MpesaMultiTenantService                        │   │
│  │  - getShopMpesaConfig(shopId)                               │   │
│  │  - Falls back to platform credentials if shop has none      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Safaricom Daraja API                       │   │
│  │  - STK Push with shop-specific or platform shortcode        │   │
│  │  - Callback routes to correct shop via transaction lookup   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Shop M-Pesa Configuration (Already in Schema)

```typescript
// apps/api/src/shops/schemas/shop.schema.ts
mpesaConfig?: {
  type?: 'paybill' | 'till';
  shortCode?: string;
  accountPrefix?: string;
  consumerKey?: string;      // ⚠️ NEEDS ENCRYPTION
  consumerSecret?: string;   // ⚠️ NEEDS ENCRYPTION
  passkey?: string;          // ⚠️ NEEDS ENCRYPTION
  callbackUrl?: string;
  enabled?: boolean;
  verifiedAt?: Date;
  verificationStatus?: 'pending' | 'verified' | 'failed';
};
```

---

## Critical Improvements to Implement

### 1. Credential Encryption (CRITICAL)

**Problem**: M-Pesa credentials stored in plain text in database.

**Solution**: Use AES-256 encryption for sensitive fields.

```typescript
// New: apps/api/src/payments/services/mpesa-encryption.service.ts
import * as crypto from 'crypto';

@Injectable()
export class MpesaEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Key from environment variable (32 bytes for AES-256)
    const keyHex = this.configService.get<string>('MPESA_ENCRYPTION_KEY');
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### 2. Callback Signature Validation (CRITICAL)

**Problem**: No validation that callbacks actually come from Safaricom.

**Solution**: Validate callback using IP whitelist and request signature.

```typescript
// Enhanced callback validation
async validateCallback(req: Request, payload: any): Promise<boolean> {
  // 1. IP Whitelist (Safaricom IPs)
  const safaricomIPs = [
    '196.201.214.200',
    '196.201.214.206',
    '196.201.213.114',
    '196.201.214.207',
    '196.201.214.208',
    '196.201.213.44',
    '196.201.212.127',
    '196.201.212.128',
    '196.201.212.129',
    '196.201.212.132',
    '196.201.212.136',
    '196.201.212.138',
  ];
  
  const clientIP = req.ip || req.headers['x-forwarded-for'];
  if (!safaricomIPs.includes(clientIP as string)) {
    this.logger.warn(`Callback from unauthorized IP: ${clientIP}`);
    // In production, reject. In sandbox, log warning.
    if (this.environment === 'production') {
      return false;
    }
  }

  // 2. Validate CheckoutRequestID exists in our system
  const transaction = await this.findByCheckoutRequestId(
    payload.Body?.stkCallback?.CheckoutRequestID
  );
  
  if (!transaction) {
    this.logger.warn('Callback for unknown transaction');
    return false;
  }

  return true;
}
```

### 3. Reconciliation Service (HIGH PRIORITY)

**Problem**: Transactions can get stuck if callback fails.

**Solution**: Scheduled job to query M-Pesa for pending transactions.

```typescript
// New: apps/api/src/payments/services/mpesa-reconciliation.service.ts
@Injectable()
export class MpesaReconciliationService {
  private readonly logger = new Logger(MpesaReconciliationService.name);

  constructor(
    @InjectModel(MpesaTransaction.name)
    private readonly transactionModel: Model<MpesaTransactionDocument>,
    private readonly mpesaService: MpesaService,
  ) {}

  /**
   * Run every 2 minutes to check pending transactions
   */
  @Cron('*/2 * * * *')
  async reconcilePendingTransactions(): Promise<void> {
    this.logger.log('Starting M-Pesa reconciliation...');

    // Find transactions pending for more than 30 seconds
    const cutoffTime = new Date(Date.now() - 30 * 1000);
    const pendingTransactions = await this.transactionModel.find({
      status: MpesaTransactionStatus.PENDING,
      stkPushSentAt: { $lt: cutoffTime },
      expiresAt: { $gt: new Date() }, // Not yet expired
    }).limit(50);

    this.logger.log(`Found ${pendingTransactions.length} pending transactions to reconcile`);

    for (const transaction of pendingTransactions) {
      try {
        await this.queryAndUpdateTransaction(transaction);
      } catch (error: any) {
        this.logger.error(`Reconciliation failed for ${transaction._id}: ${error.message}`);
      }
    }
  }

  /**
   * Auto-expire old pending transactions
   */
  @Cron('*/5 * * * *')
  async expireOldTransactions(): Promise<void> {
    const result = await this.transactionModel.updateMany(
      {
        status: MpesaTransactionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: MpesaTransactionStatus.EXPIRED,
          previousStatus: MpesaTransactionStatus.PENDING,
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} old pending transactions`);
    }
  }

  private async queryAndUpdateTransaction(
    transaction: MpesaTransactionDocument,
  ): Promise<void> {
    if (!transaction.checkoutRequestId) return;

    const result = await this.mpesaService.queryStkStatus(
      transaction.checkoutRequestId,
    );

    if (result.resultCode === 0) {
      // Payment successful - update transaction
      transaction.status = MpesaTransactionStatus.COMPLETED;
      transaction.mpesaResultCode = result.resultCode;
      transaction.mpesaResultDesc = result.resultDesc;
      transaction.completedAt = new Date();
      await transaction.save();
      
      this.logger.log(`Reconciled transaction ${transaction._id} as COMPLETED`);
    } else if (result.resultCode && result.resultCode !== 1037) {
      // Failed (not timeout) - update transaction
      transaction.status = MpesaTransactionStatus.FAILED;
      transaction.mpesaResultCode = result.resultCode;
      transaction.mpesaResultDesc = result.resultDesc;
      await transaction.save();
      
      this.logger.log(`Reconciled transaction ${transaction._id} as FAILED`);
    }
    // If resultCode is 1037 (DS timeout), leave as pending for retry
  }
}
```

### 4. M-Pesa Result Codes Reference

| Code | Description | Action |
|------|-------------|--------|
| 0 | Success | Mark COMPLETED |
| 1 | Insufficient Balance | Mark FAILED, allow retry |
| 1032 | Request Cancelled by User | Mark FAILED, allow retry |
| 1037 | DS Timeout | Keep PENDING, will reconcile |
| 2001 | Wrong PIN | Mark FAILED, allow retry |
| 17 | System Busy | Keep PENDING, auto-retry |

### 5. Optimal Timing Configuration

Based on M-Pesa behavior:

```typescript
// Timing constants
const MPESA_TIMING = {
  // STK Push timeout (user has this long to enter PIN)
  STK_TIMEOUT_MS: 60 * 1000, // 60 seconds (M-Pesa standard)
  
  // Transaction expiry (after which we stop polling)
  TRANSACTION_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  
  // Polling interval for status checks
  POLLING_INTERVAL_MS: 3 * 1000, // 3 seconds
  
  // Reconciliation job interval
  RECONCILIATION_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes
  
  // Callback expected within (for reconciliation)
  CALLBACK_EXPECTED_WITHIN_MS: 30 * 1000, // 30 seconds
  
  // Retry delay after failure
  RETRY_DELAY_MS: 5 * 1000, // 5 seconds
};
```

---

## Frontend Improvements

### Current Flow (Good)

```
Phone Input → STK Push → Waiting (with countdown) → Success/Failure
```

### Recommended Enhancements

1. **Better Error Messages**: Map M-Pesa result codes to user-friendly messages
2. **Offline Detection**: Show warning if user loses connection during payment
3. **Sound/Vibration**: Alert user when payment completes
4. **Receipt Preview**: Show M-Pesa receipt number prominently

---

## Security Checklist

- [ ] Encrypt M-Pesa credentials at rest (AES-256)
- [ ] Validate callback IP addresses (Safaricom whitelist)
- [ ] Rate limit STK push requests (per shop, per minute)
- [ ] Log all payment attempts with audit trail
- [ ] Implement webhook retry queue for failed processing
- [ ] Use HTTPS for all callback URLs
- [ ] Rotate encryption keys periodically
- [ ] Monitor for suspicious patterns (multiple failures)

---

## Implementation Priority

### Phase 1: Security (Week 1)
1. ✅ Credential encryption service
2. ✅ Callback IP validation
3. ✅ Audit logging

### Phase 2: Reliability (Week 2)
1. ✅ Reconciliation service
2. ✅ Auto-expiry job
3. ✅ Webhook retry queue

### Phase 3: User Experience (Week 3)
1. ✅ Failed payments dashboard
2. ✅ Better error messages
3. ✅ M-Pesa config UI for shops

---

## Files to Create/Modify

### New Files
- `apps/api/src/payments/services/mpesa-encryption.service.ts`
- `apps/api/src/payments/services/mpesa-reconciliation.service.ts`
- `apps/api/src/payments/services/mpesa-audit.service.ts`
- `apps/web/src/app/admin/payments/failed/page.tsx`
- `apps/web/src/app/settings/mpesa/page.tsx`

### Files to Modify
- `apps/api/src/payments/services/mpesa-multi-tenant.service.ts` - Add encryption
- `apps/api/src/payments/mpesa.controller.ts` - Add IP validation
- `apps/api/src/payments/payments.module.ts` - Register new services
- `apps/api/src/shops/schemas/shop.schema.ts` - Add encrypted credential fields

---

## Conclusion

SmartDuka's M-Pesa implementation has a solid foundation with idempotency, state machine, and multi-tenant support. The critical improvements needed are:

1. **Security**: Encrypt credentials, validate callbacks
2. **Reliability**: Add reconciliation service for stuck transactions
3. **Visibility**: Create admin dashboard for failed payments
4. **UX**: Better error messages and shop M-Pesa configuration UI

These improvements will bring the system to industry-standard quality for a multi-tenant POS platform handling real money transactions.
