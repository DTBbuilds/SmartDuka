# POS Redesign - Build & Deployment Guide

**Date**: Nov 9, 2025 | 1:00 AM UTC+03:00
**Status**: 🚀 READY FOR BUILD AND DEPLOYMENT
**Priority**: HIGH

---

## 🔨 Build Instructions

### Step 1: Backend Build

**Navigate to backend directory**:
```bash
cd e:\BUILds\SmartDuka\apps\api
```

**Install dependencies** (if needed):
```bash
pnpm install
```

**Build backend**:
```bash
pnpm build
```

**Expected output**:
```
✓ Compiled successfully
✓ No TypeScript errors
✓ Build complete
```

**Troubleshooting**:
- If build fails, check for TypeScript errors
- Verify all imports are correct
- Check MongoDB connection string in .env

### Step 2: Frontend Build

**Navigate to frontend directory**:
```bash
cd e:\BUILds\SmartDuka\apps\web
```

**Install dependencies** (if needed):
```bash
pnpm install
```

**Build frontend**:
```bash
pnpm build
```

**Expected output**:
```
✓ Compiled successfully
✓ No TypeScript errors
✓ Build complete
```

**Troubleshooting**:
- Clear Next.js cache if build fails: `rm -rf .next`
- Check for missing imports
- Verify API URL in environment variables

### Step 3: Verify Build Artifacts

**Backend**:
```bash
ls -la dist/
# Should contain compiled JavaScript files
```

**Frontend**:
```bash
ls -la .next/
# Should contain optimized build
```

---

## 🧪 Local Testing

### Step 1: Start Backend

**Terminal 1 - Backend**:
```bash
cd e:\BUILds\SmartDuka\apps\api
pnpm dev
```

**Expected output**:
```
[Nest] 12345  - 11/09/2025, 1:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 11/09/2025, 1:00:01 AM     LOG [InstanceLoader] MongooseModule dependencies initialized
[Nest] 12345  - 11/09/2025, 1:00:02 AM     LOG [RoutesResolver] AppController {/}:
[Nest] 12345  - 11/09/2025, 1:00:02 AM     LOG [Nest] Nest application successfully started on port 5000
```

### Step 2: Start Frontend

**Terminal 2 - Frontend**:
```bash
cd e:\BUILds\SmartDuka\apps\web
pnpm dev
```

**Expected output**:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
- Environments: .env.local
```

### Step 3: Access Application

**Open browser**:
```
http://localhost:3000
```

**Expected**:
- ✅ POS page loads
- ✅ Products display
- ✅ Cart sidebar visible
- ✅ Bottom action bar visible
- ✅ No console errors

### Step 4: Test Key Features

**Layout**:
- [ ] Desktop layout: 60% products, 40% cart
- [ ] Fixed bottom action bar
- [ ] No horizontal scrolling
- [ ] Payment buttons in 2x2 grid

**Keyboard Shortcuts**:
- [ ] Ctrl+Enter: Checkout
- [ ] Ctrl+H: Hold Sale
- [ ] Ctrl+C: Clear Cart
- [ ] Ctrl+D: Apply Discount
- [ ] Ctrl+S: Open Scanner

**Tax Settings**:
- [ ] Navigate to `/admin/settings/tax`
- [ ] Page loads without errors
- [ ] Current settings display
- [ ] Can modify settings
- [ ] Save button works

**Tax Calculation**:
- [ ] Add items to cart
- [ ] Tax calculates correctly
- [ ] Display shows actual rate
- [ ] Total includes tax

---

## 🔌 API Testing

### Test Shop Settings Endpoints

**Get Settings**:
```bash
curl -X GET \
  -H "Authorization: Bearer <your_token>" \
  http://localhost:5000/shop-settings/<shopId>
```

**Expected response**:
```json
{
  "_id": "...",
  "shopId": "...",
  "tax": {
    "enabled": true,
    "rate": 0.16,
    "name": "VAT",
    "description": "Value Added Tax (16%)",
    "appliedByDefault": true
  },
  "taxExemptProducts": [],
  "categoryTaxRates": {},
  "createdAt": "2025-11-09T01:00:00Z",
  "updatedAt": "2025-11-09T01:00:00Z"
}
```

**Update Settings**:
```bash
curl -X PUT \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tax": {
      "enabled": true,
      "rate": 0.18,
      "name": "VAT",
      "description": "Value Added Tax (18%)"
    }
  }' \
  http://localhost:5000/shop-settings/<shopId>
```

**Expected response**: Updated settings object

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No build warnings
- [ ] All imports correct
- [ ] Code formatted properly

### Functionality
- [ ] Layout displays correctly
- [ ] Keyboard shortcuts work
- [ ] Tax calculation correct
- [ ] Admin settings page works
- [ ] API endpoints respond
- [ ] Error handling works

### Performance
- [ ] Page loads in < 2 seconds
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Responsive on mobile
- [ ] No lag on interactions

### Security
- [ ] JWT authentication required
- [ ] Shop isolation verified
- [ ] Input validation works
- [ ] XSS protection active
- [ ] CORS configured

### Database
- [ ] MongoDB running
- [ ] Connection successful
- [ ] Collections created
- [ ] Indexes created
- [ ] Data persists

---

## 🚀 Deployment to Staging

### Step 1: Prepare Staging Environment

**Create .env.staging**:
```bash
NODE_ENV=staging
MONGODB_URI=mongodb://staging-db:27017/smartduka-staging
JWT_SECRET=your_staging_secret
NEXT_PUBLIC_API_URL=https://api-staging.smartduka.com
```

### Step 2: Deploy Backend

**Build for production**:
```bash
cd apps/api
pnpm build
```

**Deploy to staging server**:
```bash
# Using your deployment tool (Docker, PM2, etc.)
# Example with Docker:
docker build -t smartduka-api:staging .
docker push your-registry/smartduka-api:staging
```

### Step 3: Deploy Frontend

**Build for production**:
```bash
cd apps/web
pnpm build
```

**Deploy to staging server**:
```bash
# Using your deployment tool
# Example with Vercel:
vercel deploy --prod --env staging
```

### Step 4: Verify Staging Deployment

**Test endpoints**:
```bash
curl https://api-staging.smartduka.com/shop-settings/<shopId>
```

**Access frontend**:
```
https://staging.smartduka.com
```

**Expected**:
- ✅ All pages load
- ✅ API calls work
- ✅ Database connected
- ✅ No errors in logs

---

## 🧑‍💼 User Acceptance Testing (UAT)

### Test Scenarios

**Scenario 1: Basic Checkout**
1. Add 3 items to cart
2. Select payment method
3. Verify tax calculated
4. Complete checkout
5. Verify receipt

**Scenario 2: Keyboard Shortcuts**
1. Add items to cart
2. Press Ctrl+Enter (checkout)
3. Verify checkout starts
4. Press Ctrl+H (hold sale)
5. Verify sale held

**Scenario 3: Tax Settings**
1. Navigate to admin settings
2. Change VAT rate to 18%
3. Save settings
4. Add items to cart
5. Verify 18% tax applied

**Scenario 4: Mobile Experience**
1. Open on mobile device
2. Add items to cart
3. Verify layout responsive
4. Complete checkout
5. Verify all buttons accessible

**Scenario 5: Error Handling**
1. Disconnect internet
2. Try to checkout
3. Verify error message
4. Reconnect internet
5. Retry checkout

### UAT Sign-Off

**Checklist**:
- [ ] All scenarios pass
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Ready for production

---

## 🌍 Production Deployment

### Step 1: Production Environment Setup

**Create .env.production**:
```bash
NODE_ENV=production
MONGODB_URI=mongodb://prod-db:27017/smartduka
JWT_SECRET=your_production_secret
NEXT_PUBLIC_API_URL=https://api.smartduka.com
LOG_LEVEL=error
```

### Step 2: Database Backup

**Backup before deployment**:
```bash
mongodump --uri="mongodb://prod-db:27017/smartduka" --out=./backup
```

### Step 3: Deploy Backend

```bash
cd apps/api
pnpm build
# Deploy using your tool
docker build -t smartduka-api:latest .
docker push your-registry/smartduka-api:latest
# Update production deployment
```

### Step 4: Deploy Frontend

```bash
cd apps/web
pnpm build
# Deploy using your tool
vercel deploy --prod
```

### Step 5: Post-Deployment Verification

**Check endpoints**:
```bash
curl https://api.smartduka.com/health
curl https://api.smartduka.com/shop-settings/<shopId>
```

**Monitor logs**:
```bash
# Check application logs
tail -f /var/log/smartduka/app.log

# Check error logs
tail -f /var/log/smartduka/error.log
```

**Verify functionality**:
- [ ] POS page loads
- [ ] Checkout works
- [ ] Tax calculation correct
- [ ] Admin settings accessible
- [ ] No errors in logs

---

## 📊 Monitoring & Maintenance

### Health Checks

**API Health**:
```bash
# Every 5 minutes
curl https://api.smartduka.com/health
```

**Database Health**:
```bash
# Every 10 minutes
mongosh --eval "db.adminCommand('ping')"
```

**Frontend Performance**:
```bash
# Monitor response times
# Monitor error rates
# Monitor user sessions
```

### Alerts

**Set up alerts for**:
- [ ] API response time > 2 seconds
- [ ] Error rate > 1%
- [ ] Database connection failures
- [ ] Memory usage > 80%
- [ ] Disk usage > 90%

### Logs

**Log locations**:
- Backend: `/var/log/smartduka/app.log`
- Frontend: Browser console
- Database: MongoDB logs

---

## 🔄 Rollback Plan

### If Issues Occur

**Step 1: Identify Issue**
- Check logs
- Monitor metrics
- Gather error details

**Step 2: Rollback**
```bash
# Rollback to previous version
docker pull your-registry/smartduka-api:previous
docker stop smartduka-api
docker run -d smartduka-api:previous
```

**Step 3: Verify Rollback**
- Test endpoints
- Check logs
- Verify functionality

**Step 4: Investigate**
- Review changes
- Identify root cause
- Plan fix

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Build fails with TypeScript errors
**Solution**: 
1. Check imports
2. Verify types
3. Run `pnpm install`
4. Clear cache and rebuild

**Issue**: API endpoints not responding
**Solution**:
1. Check backend is running
2. Verify MongoDB connection
3. Check firewall rules
4. Review logs

**Issue**: Frontend not loading
**Solution**:
1. Check frontend is running
2. Verify API URL
3. Clear browser cache
4. Check console errors

**Issue**: Tax not calculating
**Solution**:
1. Verify shop settings saved
2. Check API response
3. Verify calculation logic
4. Check browser console

---

## ✅ Final Checklist

### Before Going Live
- [ ] Build successful
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Rollback plan ready
- [ ] Team trained

### After Going Live
- [ ] Monitor logs
- [ ] Check metrics
- [ ] Gather user feedback
- [ ] Document issues
- [ ] Plan improvements
- [ ] Schedule follow-up

---

## 📚 Resources

### Documentation
- [POS_REDESIGN_IMPLEMENTATION_COMPLETE.md](./POS_REDESIGN_IMPLEMENTATION_COMPLETE.md)
- [POS_REDESIGN_INTEGRATION_CHECKLIST.md](./POS_REDESIGN_INTEGRATION_CHECKLIST.md)

### Code Files
- Backend: `apps/api/src/shop-settings/`
- Frontend: `apps/web/src/components/pos-*.tsx`
- Admin: `apps/web/src/app/admin/settings/tax/`

### Commands Reference
```bash
# Build
pnpm build

# Development
pnpm dev

# Test
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

---

**Status**: 🚀 READY FOR BUILD AND DEPLOYMENT
**Next Step**: Run `pnpm build` in both apps
**Estimated Time**: 5-10 minutes for build
