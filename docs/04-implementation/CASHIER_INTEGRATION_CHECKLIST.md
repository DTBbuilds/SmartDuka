# SmartDuka Cashier System - Integration Checklist

## Module Integration Steps

### Step 1: Update App Module

**File**: `apps/api/src/app.module.ts`

Add to imports:
```typescript
import { ShiftsModule } from './shifts/shifts.module';
import { TransactionControlsService } from './sales/transaction-controls.service';
import { TransactionControlsController } from './sales/transaction-controls.controller';

@Module({
  imports: [
    // ... existing imports
    ShiftsModule,
    // ... other modules
  ],
  providers: [
    // ... existing providers
    TransactionControlsService,
  ],
  controllers: [
    // ... existing controllers
    TransactionControlsController,
  ],
})
export class AppModule {}
```

### Step 2: Update Sales Module

**File**: `apps/api/src/sales/sales.module.ts`

Add transaction controls:
```typescript
import { TransactionControlsService } from './transaction-controls.service';
import { TransactionControlsController } from './transaction-controls.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      // ... other schemas
    ]),
  ],
  providers: [
    SalesService,
    TransactionControlsService,
  ],
  controllers: [
    SalesController,
    TransactionControlsController,
  ],
  exports: [SalesService, TransactionControlsService],
})
export class SalesModule {}
```

### Step 3: Update Auth Module

**File**: `apps/api/src/auth/auth.module.ts`

Ensure PIN methods are available:
```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ShopsModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### Step 4: Database Migrations

Run these MongoDB commands:

```javascript
// Create indexes for users
db.users.createIndex({ cashierId: 1 }, { unique: true, sparse: true });
db.users.createIndex({ shopId: 1, cashierId: 1 });
db.users.createIndex({ lastLoginAt: -1 });

// Create indexes for shifts
db.shifts.createIndex({ shopId: 1, cashierId: 1, startTime: -1 });
db.shifts.createIndex({ shopId: 1, status: 1 });
db.shifts.createIndex({ cashierId: 1, startTime: -1 });
db.shifts.createIndex({ createdAt: -1 });

// Create indexes for orders
db.orders.createIndex({ shopId: 1, transactionType: 1 });
db.orders.createIndex({ shopId: 1, shiftId: 1 });
```

### Step 5: Environment Variables

Add to `.env`:
```
# Cashier Configuration
CASHIER_SESSION_TIMEOUT=15
PIN_LENGTH=6
PIN_MIN_LENGTH=4
SHIFT_RECONCILIATION_TIMEOUT=3600
```

### Step 6: Frontend Configuration

Update `apps/web/src/lib/auth-context.tsx`:

```typescript
// Ensure user type includes new fields
export type AuthUser = {
  sub: string;
  email: string;
  name?: string;
  role: 'admin' | 'cashier' | 'super_admin';
  shopId: string;
  cashierId?: string;
  permissions?: any;
};
```

### Step 7: Build & Test

```bash
# Build backend
cd apps/api
pnpm build

# Build frontend
cd apps/web
pnpm build

# Run tests
pnpm test

# Start development servers
pnpm dev
```

---

## API Endpoint Testing

### Test PIN Login
```bash
curl -X POST http://localhost:5000/auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "shopId": "YOUR_SHOP_ID"
  }'
```

### Test Shift Clock-In
```bash
curl -X POST http://localhost:5000/shifts/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shopId": "YOUR_SHOP_ID",
    "openingBalance": 5000
  }'
```

### Test Get Current Shift
```bash
curl -X GET http://localhost:5000/shifts/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Void Transaction
```bash
curl -X POST http://localhost:5000/transactions/void \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "ORDER_ID",
    "voidReason": "Customer requested"
  }'
```

---

## Frontend Route Configuration

Ensure these routes are accessible:

```
/login                    - Email login
/login-pin                - PIN login
/cashier/dashboard        - Cashier dashboard
/cashier/shift-start      - Start shift
/cashier/shift-end        - End shift
/pos                      - POS system
/admin                    - Admin dashboard
```

---

## Verification Steps

### 1. Backend Verification
- [ ] All modules compile without errors
- [ ] Database indexes created
- [ ] API endpoints responding
- [ ] JWT tokens generated correctly
- [ ] PIN hashing working
- [ ] Shift creation working

### 2. Frontend Verification
- [ ] PIN login page loads
- [ ] Shift start page loads
- [ ] Shift end page loads
- [ ] Dashboard displays shift info
- [ ] Navigation works correctly
- [ ] Responsive on mobile

### 3. Integration Verification
- [ ] PIN login creates session
- [ ] Shift data persists
- [ ] Dashboard shows active shift
- [ ] Transaction controls work
- [ ] Statistics calculate correctly
- [ ] Error handling works

### 4. Security Verification
- [ ] PIN is hashed
- [ ] JWT tokens are validated
- [ ] Unauthorized access blocked
- [ ] Shop isolation maintained
- [ ] Activity logging works
- [ ] Session timeout works

---

## Common Issues & Solutions

### Issue: "ShiftsModule not found"
**Solution**: Ensure ShiftsModule is imported in AppModule

### Issue: "Cannot find module 'shifts'"
**Solution**: Check file paths and ensure all files are created

### Issue: "PIN login returns 401"
**Solution**: Verify PIN is hashed and user exists in database

### Issue: "Shift not found"
**Solution**: Ensure shift is created before trying to retrieve

### Issue: "Database index error"
**Solution**: Run migration commands in MongoDB

### Issue: "Frontend shows blank page"
**Solution**: Check browser console for errors, verify API URL

---

## Performance Optimization

### Database Optimization
```javascript
// Analyze query performance
db.users.find({ shopId: ObjectId(...) }).explain("executionStats")
db.shifts.find({ shopId: ObjectId(...) }).explain("executionStats")
db.orders.find({ shopId: ObjectId(...) }).explain("executionStats")
```

### API Optimization
- Use pagination for list endpoints
- Cache frequently accessed data
- Use lean queries for read-only operations
- Implement rate limiting

### Frontend Optimization
- Lazy load components
- Cache API responses
- Use React.memo for expensive components
- Optimize images and assets

---

## Monitoring & Logging

### Enable Logging
```typescript
// In main.ts
import { Logger } from '@nestjs/common';

const logger = new Logger();
app.use((req, res, next) => {
  logger.log(`${req.method} ${req.path}`);
  next();
});
```

### Monitor Key Metrics
- PIN login success rate
- Shift creation/completion rate
- Transaction void rate
- Average shift duration
- Cashier performance metrics

### Error Tracking
- Log all errors to file
- Send critical errors to monitoring service
- Track error rates and patterns
- Alert on anomalies

---

## Deployment Steps

### Pre-Deployment
1. Run all tests
2. Code review
3. Database backup
4. Performance testing
5. Security audit

### Deployment
1. Deploy backend
2. Run database migrations
3. Deploy frontend
4. Verify endpoints
5. Monitor logs

### Post-Deployment
1. Smoke tests
2. User testing
3. Monitor performance
4. Check error rates
5. Gather feedback

---

## Rollback Plan

If issues occur:

1. **Revert Backend**
   ```bash
   git revert <commit>
   pnpm build
   pnpm start
   ```

2. **Revert Frontend**
   ```bash
   git revert <commit>
   pnpm build
   pnpm export
   ```

3. **Revert Database**
   ```javascript
   // Drop new collections if needed
   db.shifts.drop()
   
   // Restore from backup
   mongorestore --archive=backup.archive
   ```

---

## Support & Documentation

### Internal Documentation
- API docs: `/api/docs`
- Database schema: `CASHIER_SYSTEM_COMPREHENSIVE_AUDIT.md`
- Implementation guide: `CASHIER_MVP_IMPLEMENTATION_GUIDE.md`
- Quick reference: `CASHIER_QUICK_REFERENCE.md`

### External Documentation
- User guide: To be created
- Admin guide: To be created
- API documentation: To be published

### Support Contacts
- Development: dev-team@smartduka.co.ke
- Operations: ops-team@smartduka.co.ke
- Support: support@smartduka.co.ke

---

## Sign-Off

- [ ] All modules integrated
- [ ] All tests passing
- [ ] Database migrations complete
- [ ] API endpoints verified
- [ ] Frontend pages working
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production

---

**Integration Date**: Nov 7, 2025
**Status**: Ready for Integration
**Next Step**: Testing & QA
