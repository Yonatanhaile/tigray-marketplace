# Vercel Manual Fix - Step by Step

## DO THIS NOW - It will fix auto-deployment

### Step 1: Go to Vercel Dashboard
Open: https://vercel.com/dashboard

### Step 2: Find Your Project
Click on your project (tigray-marketplace or whatever it's called)

### Step 3: Click "Settings" Tab
At the top of the page

### Step 4: Click "Git" in the Left Sidebar

### Step 5: Check Repository Connection

**Is your GitHub repository shown?**
- **YES** → Go to Step 6
- **NO** → Do this:
  1. Click "Connect Git Repository"
  2. Choose GitHub
  3. Select "tigray-marketplace" repository
  4. Choose branch: **main**
  5. Click Connect
  6. Go to Step 7

### Step 6: Check Auto-Deploy Setting

Look for option called "Ignored Build Step" or "Production Branch"

**Make sure**:
- Production Branch = **main** ✅
- Ignored Build Step = **Not set** (leave empty) ✅

### Step 7: Update Build Settings

1. Click **"General"** in left sidebar (under Settings)
2. Scroll to **"Build & Development Settings"**
3. Click **"Edit"** or **"Override"**
4. Set these EXACTLY:

```
Framework Preset: Other (or Vite)
Build Command: cd client && npm install && npm run build
Output Directory: client/dist
Install Command: cd client && npm install
```

5. Click **"Save"**

### Step 8: Manual Deploy to Test

1. Click **"Deployments"** tab at top
2. Click **"Redeploy"** button on the latest deployment
3. Click **"Redeploy"** to confirm
4. Wait for deployment to complete (2-5 minutes)

### Step 9: Test Auto-Deploy

After manual deployment succeeds:

1. Open command prompt/terminal
2. Run these commands:

```bash
cd "C:\Users\user\Desktop\Tigray Market new"
git commit --allow-empty -m "test: trigger auto-deploy"
git push origin main
```

3. Go back to Vercel Dashboard → Deployments
4. **Within 1 minute** you should see a new deployment starting

### Step 10: Check GitHub Webhook (If Still Not Working)

1. Go to GitHub: https://github.com/Yonatanhaile/tigray-marketplace/settings/hooks
2. Look for webhook with URL: `https://api.vercel.com/...`
3. Click on it
4. Click **"Redeliver"** on a recent delivery
5. Should see green checkmark ✅

**If webhook doesn't exist:**
- Go back to Vercel
- Settings → Git → Disconnect Repository
- Connect it again (Step 5)

---

## Alternative: Use Vercel CLI

If dashboard doesn't work, use command line:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Go to client folder
cd client

# Deploy
vercel --prod
```

This will deploy immediately and bypass auto-deploy issues.

---

## Common Mistakes to Avoid

❌ **Build Command**: `npm run build` (WRONG - doesn't go to client folder)  
✅ **Build Command**: `cd client && npm run build` (CORRECT)

❌ **Output Directory**: `dist` (WRONG - not finding the files)  
✅ **Output Directory**: `client/dist` (CORRECT)

❌ **Framework**: Selecting "Vite" might cause issues  
✅ **Framework**: Select "Other" or leave blank

---

## What You'll See When It Works

1. Push code to GitHub
2. **Within 30-60 seconds** → New deployment appears in Vercel
3. Status shows: **"Building..."**
4. After 2-5 minutes: **"Ready"**
5. Your site updates automatically ✅

---

## Still Not Working?

Take a screenshot of:
1. Vercel Settings → Git page
2. Vercel Settings → General → Build & Development Settings
3. GitHub → Settings → Webhooks page

This will help diagnose the issue.

---

**Follow these steps exactly and auto-deploy will work!**

