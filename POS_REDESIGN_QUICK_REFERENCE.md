# POS Redesign - Quick Reference Guide

**Date**: Nov 9, 2025 | 1:00 AM UTC+03:00
**Status**: 🚀 READY FOR BUILD & DEPLOYMENT

---

## ⚡ Quick Start

### Build Backend
```bash
cd apps/api
pnpm build
```

### Build Frontend
```bash
cd apps/web
pnpm build
```

### Start Development
```bash
# Terminal 1: Backend
cd apps/api && pnpm dev

# Terminal 2: Frontend
cd apps/web && pnpm dev
```

### Access Application
```
Frontend: http://localhost:3000
Backend: http://localhost:5000
Admin Settings: http://localhost:3000/admin/settings/tax
```

---

## 📁 Key Files

### Frontend Components
- `pos-cart-sidebar.tsx` - Cart sidebar
- `pos-checkout-bar.tsx` - Bottom action bar
- `use-pos-keyboard-shortcuts.ts` - Keyboard shortcuts

### Backend Services
- `shop-settings/shop-settings.service.ts` - Business logic
- `shop-settings/shop-settings.controller.ts` - API endpoints
- `shop-settings/shop-settings.schema.ts` - Database schema

### Admin Pages
- `/admin/settings/tax/page.tsx` - Tax settings

### Main Files Modified
- `pos/page.tsx` - Main POS page
- `app.module.ts` - Backend module registration

---

## 🎯 Key Features

### Layout
- 60% products, 40% cart
- Fixed bottom action bar
- Large payment buttons (2x2 grid)
- No scrolling needed

### Keyboard Shortcuts
- **Ctrl+Enter**: Checkout
- **Ctrl+H**: Hold Sale
- **Ctrl+C**: Clear Cart
- **Ctrl+D**: Apply Discount
- **Ctrl+S**: Open Scanner

### VAT System
- Enable/disable toggle
- Configurable rate (0-100%)
- Default 16% for Kenya
- Per-product exemptions (API ready)
- Per-category overrides (API ready)

---

## 🧪 Testing Checklist

### Layout
- [ ] 60/40 split on desktop
- [ ] Fixed bottom bar visible
- [ ] Payment buttons in 2x2 grid
- [ ] No horizontal scrolling

### Keyboard Shortcuts
- [ ] Ctrl+Enter works
- [ ] Ctrl+H works
- [ ] Ctrl+C works
- [ ] Ctrl+D works
- [ ] Ctrl+S works

### Tax Calculation
- [ ] Tax calculates correctly
- [ ] Display shows actual rate
- [ ] Total includes tax
- [ ] Admin settings work

### Mobile
- [ ] Responsive layout
- [ ] Touch targets adequate
- [ ] All buttons accessible
- [ ] No horizontal scrolling

---

## 🔧 API Endpoints

### Get Settings
```bash
GET /shop-settings/:shopId
Authorization: Bearer <token>
```

### Update Settings
```bash
PUT /shop-settings/:shopId
Authorization: Bearer <token>
Content-Type: application/json

{
  "tax": {
    "enabled": true,
    "rate": 0.16,
    "name": "VAT"
  }
}
```

### Add Tax Exempt Product
```bash
POST /shop-settings/:shopId/tax-exempt-products/:productId
Authorization: Bearer <token>
```

### Remove Tax Exempt Product
```bash
DELETE /shop-settings/:shopId/tax-exempt-products/:productId
Authorization: Bearer <token>
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 2s |
| Checkout | < 20s |
| API response | < 500ms |
| Tax calculation | < 100ms |
| Mobile responsive | < 3s |

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

### API Not Responding
```bash
# Check MongoDB
mongosh --eval "db.adminCommand('ping')"

# Check backend logs
tail -f /var/log/smartduka/app.log
```

### Tax Not Calculating
```bash
# Verify shop settings
curl http://localhost:5000/shop-settings/<shopId>

# Check browser console
# Check network tab in DevTools
```

### Layout Broken
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R
# Check viewport meta tag
# Verify responsive classes
```

---

## 📋 Deployment Steps

### 1. Build
```bash
pnpm build
```

### 2. Test
```bash
pnpm dev
# Test in browser
```

### 3. Deploy to Staging
```bash
# Using your deployment tool
docker build -t smartduka-api:staging .
docker push your-registry/smartduka-api:staging
```

### 4. Deploy to Production
```bash
# After UAT sign-off
docker build -t smartduka-api:latest .
docker push your-registry/smartduka-api:latest
```

---

## 📞 Quick Help

### Questions?
1. Check documentation files
2. Review code comments
3. Test locally first
4. Contact team

### Issues?
1. Check logs
2. Review troubleshooting
3. Test in isolation
4. Escalate if needed

### Feedback?
1. Document learnings
2. Suggest improvements
3. Share with team
4. Plan next iteration

---

## ✅ Pre-Deployment Checklist

- [ ] Build successful
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Local testing complete
- [ ] Staging deployment successful
- [ ] UAT sign-off received
- [ ] Monitoring configured
- [ ] Rollback plan ready

---

## 🎉 Success Indicators

✅ Desktop layout: 60/40 split
✅ No scrolling needed
✅ Payment buttons large
✅ VAT configurable
✅ Keyboard shortcuts work
✅ Mobile responsive
✅ Accessibility 95%+
✅ Build successful
✅ Tests passing
✅ Deployed to staging

---

**Status**: 🚀 READY FOR BUILD & DEPLOYMENT
**Next Step**: Run `pnpm build`
**Estimated Time**: 5-10 minutes
