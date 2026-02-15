# SmartDuka Deployment Guide

## Architecture

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: NestJS API deployed on Render
- **Database**: MongoDB Atlas

---

## 1. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Create a database user with read/write access
4. Whitelist IP addresses (use `0.0.0.0/0` for Render)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment (Render)

### Option A: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render will detect `render.yaml` and create the service

### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `smartduka-api`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### Environment Variables (Render)

Set these in Render Dashboard → Environment:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render default) |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Generate a secure random string |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGINS` | Your Vercel frontend URL (e.g., `https://smartduka.vercel.app`) |
| `MPESA_CONSUMER_KEY` | From Safaricom Developer Portal |
| `MPESA_CONSUMER_SECRET` | From Safaricom Developer Portal |
| `MPESA_PASSKEY` | From Safaricom Developer Portal |
| `MPESA_SHORTCODE` | Your M-Pesa shortcode |
| `MPESA_CALLBACK_URL` | `https://your-render-url.onrender.com/payments/mpesa/callback` |
| `MPESA_ENV` | `sandbox` or `production` |

---

## 3. Frontend Deployment (Vercel)

### Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`

### Environment Variables (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL (e.g., `https://smartduka-api.onrender.com`) |

---

## 4. Post-Deployment Steps

### Seed Super Admin

After deploying the backend, seed the super admin user:

```bash
# SSH into Render or use Render Shell
cd apps/api
npm run seed:super-admin
```

Or set these environment variables and the seed will run on startup:
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

### Verify Health

Check the API health endpoint:
```
https://your-render-url.onrender.com/health
```

### Update CORS

Make sure `CORS_ORIGINS` in Render includes your Vercel URL.

---

## 5. M-Pesa Production Setup

For production M-Pesa:

1. Apply for production credentials at [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Complete the Go-Live process
3. Update environment variables:
   - `MPESA_ENV=production`
   - Use production credentials
   - Update `MPESA_CALLBACK_URL` to your Render URL

---

## 6. Custom Domain (Optional)

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.smartduka.co.ke`)
3. Update DNS records as instructed

### Render (Backend)
1. Go to Service Settings → Custom Domains
2. Add your domain (e.g., `api.smartduka.co.ke`)
3. Update DNS records as instructed

---

## Troubleshooting

### Backend not starting
- Check Render logs for errors
- Verify `MONGODB_URI` is correct
- Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`

### CORS errors
- Add frontend URL to `CORS_ORIGINS`
- Include both `http://` and `https://` if needed

### M-Pesa callbacks not working
- Verify `MPESA_CALLBACK_URL` is publicly accessible
- Check Render logs for incoming requests
- Ensure the callback endpoint is not behind auth

### Build failures
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check for TypeScript errors locally first
