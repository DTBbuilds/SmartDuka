# SmartDuka Cashier System - Quick Reference

## Current Cashier Flow

```
┌─────────────────────────────────────────┐
│ ADMIN CREATES CASHIER                   │
│ /users/cashiers → Add Cashier Form      │
│ Max 2 per shop                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ CASHIER LOGS IN                         │
│ /login → Email + Password               │
│ JWT Token created                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ CASHIER DASHBOARD                       │
│ /cashier/dashboard                      │
│ • Total sales today                     │
│ • Transaction count                     │
│ • Average transaction                   │
│ • Recent transactions                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ POS SYSTEM                              │
│ /pos                                    │
│ • Product search                        │
│ • Add to cart                           │
│ • Checkout                              │
│ • Payment methods                       │
│ • Receipt                               │
└─────────────────────────────────────────┘
```

## Key Files

### Frontend
```
apps/web/src/
├── app/
│   ├── users/cashiers/page.tsx          ← Cashier management
│   ├── cashier/
│   │   ├── dashboard/page.tsx           ← Cashier dashboard
│   │   └── layout.tsx
│   ├── pos/page.tsx                     ← POS system
│   └── login/page.tsx                   ← Email login
├── lib/
│   ├── auth-context.tsx                 ← Auth state
│   └── receipt-generator.ts             ← Receipt template
└── components/
    └── auth-guard.tsx                   ← Route protection
```

### Backend
```
apps/api/src/
├── users/
│   ├── users.controller.ts              ← User endpoints
│   ├── users.service.ts                 ← User logic
│   ├── schemas/user.schema.ts           ← User model
│   └── dto/create-user.dto.ts           ← Validation
├── auth/
│   ├── auth.controller.ts               ← Auth endpoints
│   ├── auth.service.ts                  ← Auth logic
│   └── strategies/jwt.strategy.ts       ← JWT strategy
└── sales/
    ├── schemas/order.schema.ts          ← Order model
    └── sales.service.ts                 ← Sales logic
```

## API Endpoints

### Cashier Management (Admin Only)
```
POST   /users                            Create cashier
GET    /users/shop/:shopId/cashiers      List cashiers
PUT    /users/:id                        Update cashier status
DELETE /users/:id                        Delete cashier
```

### Authentication
```
POST   /auth/login                       Email + password login
POST   /auth/logout                      Logout
GET    /auth/me                          Get current user
```

### POS Operations
```
GET    /products                         Get products
GET    /categories                       Get categories
POST   /checkout                         Create order
GET    /orders                           Get orders
```

### Activity Tracking
```
GET    /activity/cashier/:id/transactions  Get cashier transactions
```

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,
  name: String,
  email: String (unique),
  phone: String,
  role: 'admin' | 'cashier',
  status: 'active' | 'disabled',
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Collection
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,
  items: [
    {
      productId: ObjectId,
      name: String,
      quantity: Number,
      unitPrice: Number
    }
  ],
  total: Number,
  paymentMethod: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Common Tasks

### Create a Cashier
```
1. Go to /users/cashiers
2. Click "Add Cashier"
3. Fill in name, email, phone, password
4. Click "Create Cashier"
5. Cashier can now login with email + password
```

### Cashier Login
```
1. Go to /login
2. Enter email
3. Enter password
4. Click "Login"
5. Redirected to /cashier/dashboard
```

### Process a Sale
```
1. Go to /pos
2. Search for products
3. Click product to add to cart
4. Adjust quantity if needed
5. Click "Checkout"
6. Select payment method
7. Complete payment
8. Print receipt
```

### View Cashier Performance
```
1. Go to /cashier/dashboard
2. See today's sales metrics
3. See recent transactions
4. Click "Go to POS" to continue selling
```

### Disable a Cashier
```
1. Go to /users/cashiers
2. Find cashier
3. Click "Disable"
4. Cashier cannot login anymore
```

## Troubleshooting

### Cashier Can't Login
- Check email is correct
- Check password is correct
- Check cashier status is "active"
- Check shop is "active"

### POS Not Loading
- Check internet connection
- Check API is running
- Check browser console for errors
- Try refreshing page

### Receipt Not Printing
- Check printer is connected
- Check printer is online
- Check browser print settings
- Try printing to PDF first

### Sales Not Showing
- Check cashier is logged in
- Check transaction was completed
- Check date filter
- Try refreshing page

## Performance Tips

### For Cashiers
- Use keyboard shortcuts (if available)
- Search for products instead of scrolling
- Keep PIN simple but secure
- Log out at end of shift

### For Admins
- Monitor cashier performance regularly
- Disable inactive cashiers
- Review transaction logs
- Reconcile cash daily

### For System
- Clear browser cache regularly
- Update to latest browser version
- Use stable internet connection
- Backup data regularly

## Security Best Practices

### Passwords
- Minimum 6 characters
- Mix of letters and numbers
- Change regularly
- Don't share with others

### Login
- Use unique email per cashier
- Don't share login credentials
- Log out when done
- Use PIN when available

### Transactions
- Verify amount before payment
- Keep receipts
- Report discrepancies
- Don't process unauthorized transactions

## Keyboard Shortcuts (Future)

```
Ctrl + H    Hold sale
Ctrl + N    New customer
Ctrl + I    Invoice
Ctrl + P    Print receipt
Ctrl + Q    Quit POS
Ctrl + L    Logout
```

## Metrics to Monitor

### Daily
- Total sales
- Transaction count
- Average transaction
- Payment methods

### Weekly
- Sales by cashier
- Void rate
- Refund rate
- Customer count

### Monthly
- Revenue trend
- Cashier performance
- Inventory accuracy
- System uptime

## Contact & Support

### For Cashiers
- Contact admin for password reset
- Report errors to admin
- Ask for training if needed

### For Admins
- Check system logs for errors
- Monitor cashier activity
- Reconcile cash daily
- Update inventory regularly

### For Developers
- Check API logs
- Monitor database performance
- Review error rates
- Update dependencies

## Roadmap

### MVP (Weeks 1-2) ✅
- PIN login
- Shift management
- Enhanced dashboard
- Transaction logging

### Phase 1 (Weeks 2-3)
- Void/return management
- Discount management
- Refund processing
- Permission templates

### Phase 2 (Weeks 3-4)
- Real-time monitoring
- Performance metrics
- Audit trail
- Exception alerts

### Phase 3 (Weeks 4+)
- Biometric auth
- Advanced permissions
- Customer integration
- Loyalty program

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 7, 2025 | Initial audit and recommendations |
| 1.1 | TBD | PIN login implementation |
| 1.2 | TBD | Shift management |
| 1.3 | TBD | Transaction controls |
| 2.0 | TBD | Real-time monitoring |

## Quick Links

- **Audit**: `CASHIER_SYSTEM_COMPREHENSIVE_AUDIT.md`
- **Implementation**: `CASHIER_MVP_IMPLEMENTATION_GUIDE.md`
- **Summary**: `CASHIER_SYSTEM_SUMMARY.md`
- **GitHub**: [SmartDuka Repository]
- **Documentation**: [Full Documentation]

---

**Last Updated**: Nov 7, 2025
**Status**: Ready for Implementation
**Next Review**: After MVP completion
