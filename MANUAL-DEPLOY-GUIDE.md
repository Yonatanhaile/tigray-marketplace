# Manual Deployment Guide

## Render Deployment (Backend & Worker)

### Check Auto-Deploy Status
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on your service: **tigray-marketplace-api**
3. Go to **Settings** tab
4. Scroll to **Build & Deploy** section
5. Check if **Auto-Deploy** is set to **Yes**
6. Ensure **Branch** is set to **main**

### Manual Deploy
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on **tigray-marketplace-api** service
3. Click the **Manual Deploy** button (top right)
4. Select **Deploy latest commit** or choose your commit
5. Click **Deploy**

Repeat for **tigray-marketplace-worker** if you have it.

### Check Deploy Status
- Go to the **Events** tab to see deployment logs
- Look for the commit message: "Fix VPN/proxy false positive blocking legitimate users"
- Wait for deployment to complete (usually 2-5 minutes)

---

## Vercel Deployment (Frontend)

### Option A: Vercel CLI (Fastest)
```bash
cd client
npx vercel --prod
```

### Option B: Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project (tigray-marketplace or similar)
3. Go to **Deployments** tab
4. Click **Redeploy** on the latest deployment
5. Check **Use existing Build Cache** (optional)
6. Click **Redeploy**

### Option C: Trigger from Git
Sometimes Vercel doesn't pick up changes automatically:
1. Make a small change (e.g., add a comment to README)
2. Commit and push
3. Vercel should auto-deploy

### Check Deployment
- Go to **Deployments** tab
- Look for your commit: "Fix VPN/proxy false positive blocking legitimate users"
- Click on it to see logs and status

---

## Quick Deploy via CLI

### Deploy Backend to Render
```bash
# Trigger via Git (already done)
git push origin main

# If still not deploying, check webhook
# Or use Render CLI:
# npm install -g render
# render deploy
```

### Deploy Frontend to Vercel
```bash
cd client
npx vercel --prod
```

---

## Troubleshooting

### Render Not Auto-Deploying
1. **Check webhook**: Settings → Build & Deploy → Webhook URL
2. **Verify branch**: Make sure it's watching `main` branch
3. **Manual trigger**: Use Manual Deploy button
4. **Check logs**: Events tab for any errors

### Vercel Not Auto-Deploying
1. **Check Git integration**: Settings → Git
2. **Verify production branch**: Should be `main`
3. **Check build command**: Should be `npm run build` or `vite build`
4. **Framework preset**: Should be "Vite" or "Other"

### Both Services Not Deploying
- **GitHub webhooks**: Check if webhooks are properly configured
- **Repository access**: Ensure Render/Vercel have access to your repo
- **Branch protection**: Check if branch rules are blocking webhooks

---

## Environment Variables (After Deploy)

### Render
After backend deploys, verify environment variables:
- `FRONTEND_URL` - Your Vercel URL
- `BACKEND_URL` - Your Render service URL
- `MONGO_URI` - Your MongoDB connection
- `REDIS_URL` - Auto-configured

### Vercel
After frontend deploys, verify:
- `VITE_API_URL` - Your Render backend URL

Update these in the dashboards if needed and redeploy.

---

## Expected Deploy Times
- **Vercel (Frontend)**: ~1-2 minutes
- **Render (Backend)**: ~3-5 minutes
- **Render (Worker)**: ~3-5 minutes

## Verification
After deployment:
1. Check backend: `https://your-backend.onrender.com/health`
2. Check frontend: Visit your Vercel URL
3. Test registration: Try signing up with a new account
4. Check logs: Monitor for VPN/proxy warnings (should be reduced)

