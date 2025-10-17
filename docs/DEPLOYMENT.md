# Deployment Guide - Tigray Marketplace

Complete step-by-step guide to deploy the Tigray Marketplace to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Cloudinary Setup](#cloudinary-setup)
4. [Render Setup](#render-setup)
5. [Vercel Setup](#vercel-setup)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub account with repository created
- MongoDB Atlas account (free tier available)
- Cloudinary account (free tier available)
- Render account (free tier available)
- Vercel account (free tier available)
- SMTP credentials (Mailtrap for dev, SendGrid/Mailgun for production)

---

## MongoDB Atlas Setup

### Step 1: Create Cluster

1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Choose **FREE M0 Cluster**
4. Select cloud provider and region (choose closest to your users)
5. Cluster Name: `tigray-marketplace`
6. Click **"Create"**

### Step 2: Create Database User

1. In left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Authentication Method: Password
4. Username: `tigray_user`
5. Password: Generate secure password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

### Step 3: Configure Network Access

1. In left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Option A (Recommended for testing): Click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Option B (Production): Add specific Render IP addresses
5. Click **"Confirm"**

### Step 4: Get Connection String

1. Click **"Database"** in left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**
5. Copy the connection string:
   ```
   mongodb+srv://tigray_user:<password>@cluster.mongodb.net/tigray_marketplace?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your database user password
7. Save this as your `MONGO_URI`

---

## Cloudinary Setup

### Step 1: Create Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up for free account
3. Verify email

### Step 2: Get Credentials

1. Go to Dashboard: https://cloudinary.com/console
2. Copy your **Cloud name**, **API Key**, and **API Secret**
3. Format as: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
4. Example: `cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz@your_cloud_name`
5. Save this as your `CLOUDINARY_URL`

### Step 3: Configure Upload Presets (Optional)

1. Go to Settings → Upload
2. Enable **Unsigned uploading** if desired
3. Note the preset name (or leave empty)

---

## Render Setup

### Step 1: Connect GitHub

1. Go to https://render.com
2. Sign up / Log in
3. Click **"New"** → **"Web Service"** or use Blueprint

### Step 2: Deploy Using Blueprint (render.yaml)

**Option A: Automatic Blueprint Deployment**

1. Click **"New"** → **"Blueprint"**
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml`
4. Click **"Apply"**
5. Skip to Step 3 to add environment variables

**Option B: Manual Service Creation**

### Step 2a: Create Backend Web Service

1. Click **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `tigray-marketplace-api`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: **Docker**
   - **Docker Command**: (leave default, uses Dockerfile)
4. Click **"Create Web Service"**

### Step 2b: Create Worker Service

1. Click **"New"** → **"Background Worker"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `tigray-marketplace-worker`
   - **Region**: Same as web service
   - **Branch**: `main`
   - **Root Directory**: `worker`
   - **Runtime**: **Docker**
   - **Docker Command**: (leave default, uses Dockerfile)
4. Click **"Create Background Worker"**

### Step 2c: Create Redis Instance

1. Click **"New"** → **"Redis"**
2. Configure:
   - **Name**: `tigray-redis`
   - **Plan**: **Starter** (free)
3. Click **"Create Redis"**
4. Copy the **Internal Redis URL** (e.g., `redis://:password@red-xxx.render.com:6379`)

### Step 3: Configure Environment Variables

For **Backend Web Service**:

1. Go to service → **Environment**
2. Add variables:

```env
NODE_ENV=production
PORT=3000
MONGO_URI=<your-mongodb-atlas-connection-string>
REDIS_URL=<your-render-redis-internal-url>
JWT_SECRET=<generate-random-string-min-32-chars>
CLOUDINARY_URL=<your-cloudinary-url>
FRONTEND_URL=<will-add-after-vercel-deploy>
BACKEND_URL=<your-render-web-service-url>
USE_S3=false
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-pass>
SMTP_FROM=noreply@tigraymarket.com
OTP_DEV_MODE=false
```

**Generate JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For **Worker**:

1. Go to worker service → **Environment**
2. Add same variables as backend

### Step 4: Get Backend URL

1. After deployment, your backend URL will be:
   ```
   https://tigray-marketplace-api.onrender.com
   ```
2. Update `BACKEND_URL` environment variable with this URL
3. Test health endpoint:
   ```bash
   curl https://tigray-marketplace-api.onrender.com/health
   ```

---

## Vercel Setup

### Step 1: Connect Repository

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your GitHub repository
4. Click **"Import"**

### Step 2: Configure Build

1. **Framework Preset**: Vite
2. **Root Directory**: `client`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

```env
VITE_API_URL=https://tigray-marketplace-api.onrender.com
VITE_SOCKET_URL=https://tigray-marketplace-api.onrender.com
```

Replace with your actual Render backend URL.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your frontend URL will be:
   ```
   https://tigray-marketplace-xxx.vercel.app
   ```

### Step 5: Update Backend FRONTEND_URL

1. Go back to Render dashboard
2. Update both **backend** and **worker** services
3. Set `FRONTEND_URL` to your Vercel URL
4. Services will auto-redeploy

---

## Post-Deployment

### Step 1: Create Admin User

Use MongoDB Compass or Atlas UI to manually create an admin user:

```javascript
// Connect to your database
// Insert into 'users' collection:
{
  "name": "Admin User",
  "email": "admin@tigraymarket.com",
  "phone": "+251911000000",
  "passwordHash": "<hash-of-your-password>",
  "roles": ["admin", "seller", "buyer"],
  "badges": ["verified-seller"],
  "kyc": {
    "status": "approved"
  },
  "isActive": true,
  "createdAt": new Date()
}
```

To hash password:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 12));"
```

Or register normally and use MongoDB to update `roles` field.

### Step 2: Test Core Flows

1. **Register**: Create seller and buyer accounts
2. **Create Listing**: As seller, create a test listing with images
3. **Create Order**: As buyer, create an order intent
4. **Socket.io**: Verify real-time updates work
5. **Messages**: Test messaging between buyer and seller
6. **Invoice**: Request invoice generation
7. **Dispute**: File a test dispute
8. **Admin**: Login as admin, test KYC approval

### Step 3: Run Acceptance Tests

```bash
API_URL=https://tigray-marketplace-api.onrender.com ./scripts/test-flows.sh
```

### Step 4: Monitor Services

**Render Dashboard**:
- Check logs for errors
- Monitor service health
- Set up alerts

**Vercel Dashboard**:
- Check deployment logs
- Monitor function logs
- Review analytics

### Step 5: Set Up Custom Domain (Optional)

**For Backend (Render)**:
1. Go to service settings
2. Click **"Custom Domains"**
3. Add your domain (e.g., `api.yourdomain.com`)
4. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: tigray-marketplace-api.onrender.com
   ```

**For Frontend (Vercel)**:
1. Go to project settings → **Domains**
2. Add your domain
3. Follow DNS configuration instructions

### Step 6: Enable HTTPS

Both Render and Vercel provide automatic HTTPS certificates. Verify:

```bash
curl -I https://tigray-marketplace-api.onrender.com/health
```

Look for: `HTTP/2 200`

---

## Environment Variables Checklist

### Backend & Worker

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `production` | Environment mode |
| `PORT` | Yes | `3000` | Server port |
| `MONGO_URI` | Yes | `mongodb+srv://...` | MongoDB connection string |
| `REDIS_URL` | Yes | `redis://...` | Redis connection string |
| `JWT_SECRET` | Yes | `hex-string-32-bytes` | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `1h` | Token expiration (default: 1h) |
| `CLOUDINARY_URL` | Yes* | `cloudinary://...` | Cloudinary credentials |
| `USE_S3` | No | `false` | Use S3 instead of Cloudinary |
| `AWS_S3_BUCKET` | No | `my-bucket` | S3 bucket name |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | No | `AKIA...` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | No | `secret` | AWS secret key |
| `CLOUDFRONT_URL` | No | `https://...` | CloudFront distribution |
| `FRONTEND_URL` | Yes | `https://...vercel.app` | Frontend URL for CORS |
| `BACKEND_URL` | Yes | `https://...onrender.com` | Backend URL |
| `SMTP_HOST` | Yes | `smtp.sendgrid.net` | SMTP server |
| `SMTP_PORT` | Yes | `587` | SMTP port |
| `SMTP_USER` | Yes | `apikey` | SMTP username |
| `SMTP_PASS` | Yes | `SG.xxx` | SMTP password |
| `SMTP_FROM` | No | `noreply@...` | From email address |
| `OTP_DEV_MODE` | No | `false` | Log OTP to console in production |
| `OTP_EXPIRY_MINUTES` | No | `5` | OTP validity (default: 5 min) |

### Frontend

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `https://api.tigraymarket.com` | Backend API URL |
| `VITE_SOCKET_URL` | Yes | `https://api.tigraymarket.com` | Socket.io server URL |

---

## Troubleshooting

### Backend Won't Start

**Check Render Logs**:
1. Go to Render dashboard → Service → **Logs**
2. Look for error messages

**Common Issues**:
- **MongoDB connection failed**: Check `MONGO_URI`, verify IP whitelist
- **Redis connection failed**: Check `REDIS_URL`, ensure services are in same region
- **Port binding error**: Ensure `PORT=3000` is set

### Frontend Build Fails

**Check Vercel Logs**:
1. Go to Vercel dashboard → Deployment → **Building**
2. Look for error messages

**Common Issues**:
- **Module not found**: Run `npm install` locally, commit `package-lock.json`
- **Environment variables missing**: Add to Vercel dashboard
- **Build timeout**: Check `client/package.json` build script

### Socket.io Not Connecting

**Check Browser Console**:
```
WebSocket connection failed
```

**Solutions**:
1. Verify `VITE_SOCKET_URL` is correct
2. Check CORS: `FRONTEND_URL` must match Vercel URL
3. Test backend Socket.io: Use Socket.io client tool
4. Check backend logs for connection attempts

### Images Not Uploading

**Check Cloudinary**:
1. Verify `CLOUDINARY_URL` format
2. Test upload manually via Cloudinary dashboard
3. Check upload preset configuration

**Check Browser Network Tab**:
- Look for failed requests to `/api/uploads/sign`
- Check file size (max 8MB)
- Verify file type (only images and PDF allowed)

### Worker Not Processing Jobs

**Check Worker Logs**:
1. Go to Render dashboard → Worker service → **Logs**
2. Look for:
   ```
   ✅ Bull queues initialized successfully
   Processing invoice job...
   ```

**Common Issues**:
- **Redis connection failed**: Check `REDIS_URL`
- **Puppeteer errors**: Check Chromium installation in Docker
- **Cloudinary upload fails**: Check credentials

### Orders Not Creating

**Check Backend Logs**:
```
Error creating order: ...
```

**Solutions**:
1. Verify JWT token in browser localStorage
2. Check listing exists and is active
3. Verify payment method is valid for listing
4. Check MongoDB connection

### Health Check Fails

```bash
curl https://your-api.onrender.com/health
```

**Should return**:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "environment": "production"
}
```

**If fails**:
- Service may be sleeping (Render free tier)
- Check service status in Render dashboard
- View logs for startup errors

---

## Performance Optimization

### MongoDB Indexes

Ensure indexes are created:

```javascript
// Connect to MongoDB Atlas and run:
db.listings.createIndex({ sellerId: 1, status: 1 });
db.listings.createIndex({ price: 1 });
db.listings.createIndex({ title: "text", description: "text" });
db.orders.createIndex({ buyerId: 1, status: 1 });
db.orders.createIndex({ sellerId: 1, status: 1 });
db.messages.createIndex({ orderId: 1, createdAt: 1 });
db.disputes.createIndex({ orderId: 1, status: 1 });
```

### Redis Configuration

For production, consider:
- Upgrading to paid plan for better performance
- Enabling persistence
- Setting appropriate maxmemory policy

### Vercel Caching

Enable caching headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Scaling Considerations

### Horizontal Scaling (Multiple Backend Instances)

When traffic grows:

1. **Enable Redis adapter** in `server/src/server.js`:
   ```javascript
   const { createAdapter } = require('@socket.io/redis-adapter');
   const pubClient = new Redis(process.env.REDIS_URL);
   const subClient = pubClient.duplicate();
   io.adapter(createAdapter(pubClient, subClient));
   ```

2. **Scale Render service**: Upgrade to paid plan, increase instances

3. **Load balancer**: Render provides automatic load balancing

### Database Scaling

- Upgrade MongoDB Atlas tier for more resources
- Enable sharding for large datasets
- Add read replicas for read-heavy workloads

### Worker Scaling

- Add more worker instances on Render
- Bull automatically distributes jobs across workers
- Monitor queue length and job processing times

---

## Security Hardening

1. **IP Whitelist MongoDB**: Replace "Allow from anywhere" with specific IPs
2. **Environment Variables**: Use Render's secret management
3. **Rate Limiting**: Already implemented, monitor and adjust as needed
4. **HTTPS Only**: Enforce HTTPS redirects
5. **CSRF Protection**: Consider adding for form submissions
6. **Content Security Policy**: Configure Helmet.js CSP
7. **API Keys Rotation**: Rotate JWT secret, database passwords periodically

---

## Monitoring & Alerts

### Render

1. Go to service → **Settings** → **Alerts**
2. Configure:
   - Deployment failures
   - High error rate
   - Service downtime

### MongoDB Atlas

1. Go to **Alerts**
2. Configure:
   - Connection spikes
   - Storage usage
   - Slow queries

### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- Better Uptime

Monitor:
- `https://your-api.onrender.com/health`
- `https://your-frontend.vercel.app`

---

## Backup Strategy

### MongoDB Atlas

1. Go to **Backup**
2. Enable **Cloud Backup** (requires paid cluster)
3. Or use **mongodump** periodically:
   ```bash
   mongodump --uri="mongodb+srv://..." --out=./backup
   ```

### Redis

Redis on Render has automatic persistence, but data is not backed up by default. For critical data, store in MongoDB as source of truth.

---

## CI/CD Setup

### GitHub Actions for Backend

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['server/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

Add `RENDER_DEPLOY_HOOK_URL` to GitHub secrets.

### Auto-deploy on Git Push

Both Render and Vercel support automatic deploys on git push. Enable in respective dashboards.

---

## Costs Estimation (Free Tier)

| Service | Free Tier | Limits | Paid Tier Starts At |
|---------|-----------|--------|---------------------|
| MongoDB Atlas | M0 (512MB) | 512MB storage, shared CPU | $9/mo (M10) |
| Render Web Service | 750 hrs/mo | Sleeps after inactivity | $7/mo |
| Render Worker | 750 hrs/mo | Sleeps after inactivity | $7/mo |
| Render Redis | 25MB | 25MB storage | $10/mo (256MB) |
| Vercel | Unlimited | 100GB bandwidth/mo | $20/mo (Pro) |
| Cloudinary | Free | 25GB storage, 25GB bandwidth | $89/mo (Plus) |

**Total Free**: $0/month (with limitations)

**Recommended Production**: ~$50-70/month for small to medium traffic

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Socket.io Docs**: https://socket.io/docs/v4

---

For any issues, refer to the project README or create a GitHub issue.

