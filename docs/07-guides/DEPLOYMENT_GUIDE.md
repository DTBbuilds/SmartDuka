# SmartDuka Deployment Guide

**Version:** 1.0  
**Date:** Nov 5, 2025  
**Status:** Ready for Production

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production Environment               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   Frontend       │         │   Backend API    │    │
│  │  (Next.js)       │◄───────►│   (NestJS)       │    │
│  │  Vercel/Netlify  │         │   AWS/GCP/Azure  │    │
│  └──────────────────┘         └──────────────────┘    │
│         │                              │               │
│         │                              │               │
│         └──────────┬───────────────────┘               │
│                    │                                   │
│            ┌───────▼────────┐                          │
│            │   MongoDB      │                          │
│            │   Atlas        │                          │
│            └────────────────┘                          │
│                                                         │
│            ┌────────────────┐                          │
│            │   Redis        │                          │
│            │   (Optional)   │                          │
│            └────────────────┘                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] No console errors
- [ ] No console warnings
- [ ] ESLint passing
- [ ] TypeScript strict mode
- [ ] No security vulnerabilities (npm audit)

### Environment Variables
- [ ] All required variables defined
- [ ] No hardcoded secrets
- [ ] Correct values for production
- [ ] Database connection string
- [ ] JWT secret
- [ ] M-Pesa credentials
- [ ] API URLs

### Database
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Connection string tested
- [ ] Backups configured
- [ ] Indexes created
- [ ] Replication enabled

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Deployment steps documented
- [ ] Troubleshooting guide created
- [ ] Architecture documented

---

## Staging Deployment

### 1. Staging Environment Setup

#### Frontend (Vercel/Netlify)
```bash
# Connect repository
vercel link

# Deploy to staging
vercel --prod --target staging

# Environment variables
vercel env add NEXT_PUBLIC_API_URL https://api-staging.smartduka.com
```

#### Backend (AWS/GCP/Azure)
```bash
# Create staging instance
# Configure environment variables
# Deploy application
# Configure SSL certificate
```

### 2. Staging Testing

#### Smoke Tests
```bash
# Test critical flows
npm run test:smoke
```

**Test Cases:**
- [ ] Login works
- [ ] POS loads
- [ ] Add product to cart
- [ ] Checkout completes
- [ ] Admin dashboard loads
- [ ] Reports generate

#### Integration Tests
```bash
# Test API integration
npm run test:integration -- --env=staging
```

#### Performance Tests
```bash
# Test performance
npm run test:performance -- --env=staging
```

### 3. Staging Sign-off

- [ ] All smoke tests pass
- [ ] Integration tests pass
- [ ] Performance acceptable
- [ ] No critical issues
- [ ] Team approval

---

## Production Deployment

### 1. Pre-Production Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/smartduka"

# Backup configuration
# Backup environment variables
```

### 2. Frontend Deployment

#### Option A: Vercel
```bash
# Build
npm run build

# Deploy to production
vercel --prod

# Verify deployment
curl https://smartduka.com
```

#### Option B: Netlify
```bash
# Build
npm run build

# Deploy
netlify deploy --prod --dir=.next

# Verify deployment
curl https://smartduka.netlify.app
```

#### Option C: Self-hosted
```bash
# Build
npm run build

# Copy to server
scp -r .next user@server:/app/

# Restart application
ssh user@server "cd /app && pm2 restart next-app"
```

### 3. Backend Deployment

#### Option A: AWS EC2
```bash
# SSH into server
ssh -i key.pem ubuntu@ec2-instance

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Start application
pm2 start dist/main.js --name smartduka-api

# Verify
curl http://localhost:3000/health
```

#### Option B: Docker
```bash
# Build image
docker build -t smartduka-api:latest .

# Push to registry
docker push registry.example.com/smartduka-api:latest

# Deploy
docker pull registry.example.com/smartduka-api:latest
docker run -d \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="..." \
  -p 3000:3000 \
  registry.example.com/smartduka-api:latest

# Verify
curl http://localhost:3000/health
```

#### Option C: Kubernetes
```bash
# Create deployment
kubectl apply -f deployment.yaml

# Verify
kubectl get pods
kubectl logs deployment/smartduka-api

# Check service
kubectl get svc
```

### 4. Database Migration

```bash
# Run migrations
npm run migrate:prod

# Verify data
mongo "mongodb+srv://user:pass@cluster.mongodb.net/smartduka"
```

### 5. SSL/TLS Configuration

```bash
# Generate certificate (Let's Encrypt)
certbot certonly --standalone -d smartduka.com

# Configure nginx
# Configure application
# Verify HTTPS
curl https://smartduka.com
```

### 6. CDN Configuration

```bash
# Configure CloudFlare/CloudFront
# Set up cache rules
# Enable compression
# Enable minification
```

### 7. Monitoring Setup

#### Application Monitoring
```bash
# Install monitoring agent
npm install @sentry/node

# Configure Sentry
# Configure error tracking
# Configure performance monitoring
```

#### Infrastructure Monitoring
```bash
# Set up CloudWatch/Stackdriver
# Configure alerts
# Configure dashboards
# Configure log aggregation
```

### 8. Backup Configuration

```bash
# MongoDB Atlas backups
# Enable automated backups
# Set retention policy
# Test restore procedure

# Application backups
# Daily backups
# Weekly backups
# Monthly backups
```

---

## Post-Deployment

### 1. Verification

```bash
# Health check
curl https://smartduka.com/health

# API check
curl https://smartduka.com/api/products

# Frontend check
curl https://smartduka.com
```

### 2. Smoke Testing

```bash
# Run smoke tests
npm run test:smoke -- --env=production
```

### 3. Monitoring

- [ ] Error rate normal
- [ ] Response time acceptable
- [ ] Database performance good
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] Disk usage normal

### 4. Rollback Plan

If issues occur:

```bash
# Revert to previous version
git revert HEAD

# Rebuild and deploy
npm run build
vercel --prod

# Verify rollback
curl https://smartduka.com
```

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.smartduka.com
NEXT_PUBLIC_SOCKET_URL=https://api.smartduka.com
```

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartduka

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES=7d

# M-Pesa
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_ENV=production
MPESA_CALLBACK_URL=https://api.smartduka.com/payments/callback

# Application
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://smartduka.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

---

## Scaling Strategy

### Horizontal Scaling

```
Load Balancer
    ├── API Server 1
    ├── API Server 2
    └── API Server 3

Database
    ├── Primary
    └── Replicas
```

### Vertical Scaling

- Increase server RAM
- Increase CPU cores
- Increase storage

### Caching Strategy

```
Redis Cache
    ├── Product cache (1 hour)
    ├── Category cache (1 hour)
    ├── Report cache (24 hours)
    └── Session cache (7 days)
```

---

## Disaster Recovery

### RTO/RPO Targets
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 15 minutes

### Backup Strategy
- Daily automated backups
- Weekly manual backups
- Monthly archive backups
- Test restore monthly

### Failover Procedure
```bash
# 1. Detect failure
# 2. Activate standby
# 3. Update DNS
# 4. Verify service
# 5. Investigate root cause
# 6. Restore from backup if needed
```

---

## Performance Optimization

### Frontend
- [ ] Enable gzip compression
- [ ] Minify CSS/JS
- [ ] Optimize images
- [ ] Enable caching
- [ ] Use CDN

### Backend
- [ ] Database indexing
- [ ] Query optimization
- [ ] Connection pooling
- [ ] Caching layer
- [ ] Load balancing

### Database
- [ ] Index optimization
- [ ] Query profiling
- [ ] Connection limits
- [ ] Replication lag
- [ ] Backup impact

---

## Security Hardening

### Network Security
- [ ] Firewall rules
- [ ] DDoS protection
- [ ] WAF rules
- [ ] Rate limiting
- [ ] IP whitelisting

### Application Security
- [ ] Input validation
- [ ] Output encoding
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention

### Data Security
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Key rotation
- [ ] Access control
- [ ] Audit logging

---

## Maintenance Windows

### Scheduled Maintenance
- Time: 2:00 AM - 4:00 AM UTC
- Frequency: Monthly
- Duration: 2 hours
- Notification: 7 days advance

### Emergency Maintenance
- Unplanned downtime
- Security patches
- Critical bug fixes
- Database maintenance

---

## Incident Response

### Severity Levels
- **Critical**: Complete outage, data loss
- **High**: Major feature broken, performance degraded
- **Medium**: Minor feature broken, workaround available
- **Low**: Cosmetic issue, no workaround needed

### Response Procedure
1. Detect incident
2. Alert team
3. Assess severity
4. Implement fix
5. Deploy fix
6. Verify resolution
7. Post-mortem

---

## Support & Escalation

### Support Channels
- Email: support@smartduka.com
- Phone: +254-XXX-XXXXXX
- Chat: Slack/Discord

### Escalation Path
- Level 1: Support team (30 min response)
- Level 2: Engineering team (15 min response)
- Level 3: Leadership (5 min response)

---

## Sign-off Checklist

- [ ] All tests passing
- [ ] Staging deployment successful
- [ ] Smoke tests passed
- [ ] Performance acceptable
- [ ] Security scan passed
- [ ] Backup verified
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Documentation complete
- [ ] Rollback plan ready

**Deployment Approved By:** _______________  
**Date:** _______________

