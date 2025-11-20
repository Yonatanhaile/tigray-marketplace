# Render Manual Deployment Instructions

## Quick Manual Deploy (Recommended)

### Step-by-Step:

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com/
   - Log in to your account

2. **Select Your Service**
   - Click on **tigray-marketplace-api** (your backend service)
   - If you don't see it, check the correct team/account in the top-left dropdown

3. **Manual Deploy**
   - Look for the **"Manual Deploy"** button in the top-right corner
   - Click it
   - A dropdown will appear with options:
     - ✅ **"Deploy latest commit"** ← Select this
     - Or select a specific commit (choose the latest one with "Fix VPN/proxy...")
   - Click **"Deploy"**

4. **Monitor Deployment**
   - You'll be redirected to the **Events** tab
   - Watch the build logs in real-time
   - Deployment takes ~3-5 minutes
   - Look for: "Build successful" → "Deploy live"

5. **Repeat for Worker (if applicable)**
   - Go back to dashboard
   - Select **tigray-marketplace-worker**
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Check & Fix Auto-Deploy Settings

### Why Auto-Deploy Might Not Work:

1. **Auto-Deploy is Disabled**
2. **Wrong Branch Selected**
3. **GitHub Integration Issue**
4. **Webhook Not Configured**

### Fix Auto-Deploy:

1. **Go to Service Settings**
   - Dashboard → Select your service → **Settings** tab

2. **Scroll to "Build & Deploy" Section**
   - Look for **"Auto-Deploy"** setting
   - Should be set to: **Yes**
   - If it says **No**, click **Edit** and change it to **Yes**

3. **Check Branch**
   - Look for **"Branch"** setting
   - Should be: **main** (or your default branch)
   - If wrong, click **Edit** and change it to **main**

4. **Verify Root Directory** (Important!)
   - Look for **"Root Directory"** setting
   - For backend service, should be: **server** (or empty if using docker context)
   - Check your render.yaml - it uses `dockerContext: ./server`

5. **Save Changes**
   - Click **Save Changes** if you made any modifications

---

## Enable GitHub Webhook (If Missing)

If auto-deploy still doesn't work, the webhook might be missing:

### Option 1: Reconnect Repository
1. Go to **Settings** → **Build & Deploy**
2. Click **"Disconnect Source"** (if connected)
3. Click **"Connect Repository"**
4. Authorize GitHub
5. Select your repository: **Yonatanhaile/tigray-marketplace**
6. Set branch to **main**
7. Enable **Auto-Deploy**

### Option 2: Check GitHub Webhooks
1. Go to GitHub: https://github.com/Yonatanhaile/tigray-marketplace/settings/hooks
2. Look for Render webhook (should show render.com URL)
3. If missing:
   - Go back to Render dashboard
   - Disconnect and reconnect the repository

---

## Use Deploy Hook (Alternative Method)

If auto-deploy doesn't work, you can trigger deployments via webhook:

### Setup Deploy Hook:

1. **Get Deploy Hook URL**
   - Render Dashboard → Your Service → **Settings**
   - Scroll to **"Deploy Hook"** section
   - Click **"Create Deploy Hook"**
   - Copy the URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`)

2. **Save It as Environment Variable**
   ```powershell
   # In PowerShell
   $env:RENDER_DEPLOY_HOOK="your-deploy-hook-url-here"
   ```

3. **Use the Script**
   ```powershell
   .\trigger-render-deploy.ps1
   ```

### Or Trigger Manually via Browser:
- Just paste the Deploy Hook URL in your browser
- Press Enter
- Deployment will start immediately

---

## Troubleshooting

### "Manual Deploy" Button is Grayed Out
- Wait a few seconds for page to fully load
- Refresh the page
- Check if a deployment is already in progress

### No Services Showing in Dashboard
- Check you're logged into the correct account
- Check the team/account selector in top-left
- Verify the service wasn't deleted

### Deployment Fails
- Check the **Logs** tab for error messages
- Common issues:
  - Environment variables missing
  - Docker build errors
  - Database connection issues

### Still Not Deploying After Push
- Auto-deploy only triggers on **main** branch (check your branch)
- Render may have rate limits (wait 1-2 minutes between pushes)
- Check Render status: https://status.render.com/

---

## Expected Deployment Process

When working correctly:
1. You push to GitHub → `git push origin main`
2. GitHub webhook triggers Render (within 10-30 seconds)
3. Render starts building (shown in Events tab)
4. Build completes (~2-4 minutes)
5. Service deploys and goes live (~30-60 seconds)
6. Status changes to "Live" with green indicator

Total time: **3-5 minutes**

---

## Quick Commands Reference

```powershell
# Check current branch
git branch

# Push to GitHub
git push origin main

# Trigger Render via deploy hook
.\trigger-render-deploy.ps1

# Create empty commit to trigger deploy
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

---

## After Successful Deploy

### Verify Backend is Running:
```
https://your-service-name.onrender.com/health
```
Should return: `{"status":"ok"}`

### Check Logs:
- Render Dashboard → Your Service → **Logs** tab
- Look for: "Server started on port 3000"
- Check for VPN/proxy fix logs: `⚠️ IP geolocation lookup failed - allowing registration`

### Test Registration:
- Go to your frontend
- Try signing up with a new account
- Should work without VPN/proxy errors!

---

## Need Help?

If manual deploy works but auto-deploy doesn't:
1. It's okay to use manual deploy for now
2. Contact Render support about webhook issues
3. Use the deploy hook script as a workaround

The important thing is your fix is deployed and users can register! 🎉

