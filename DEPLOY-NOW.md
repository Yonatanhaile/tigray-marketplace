# Deploy to Internet - Step by Step

Complete guide to deploy Tigray Marketplace to production in ~30 minutes.

## 🎯 Overview

We'll deploy:
- **Frontend** → Vercel (free, instant)
- **Backend + Worker** → Render (free tier)
- **Database** → MongoDB Atlas (free 512MB)
- **Redis** → Render Managed Redis (free 25MB)
- **Media** → Cloudinary (free tier)

**Total Cost: $0/month** (with free tier limitations)

---

## 📋 Prerequisites Checklist

Before starting, create accounts at:
- [ ] GitHub account (to push your code)
- [ ] Vercel account (https://vercel.com)
- [ ] Render account (https://render.com)
- [ ] MongoDB Atlas (https://cloud.mongodb.com)
- [ ] Cloudinary (https://cloudinary.com)

---

## Step 1: Push Code to GitHub (10 minutes)

### 1.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `tigray-marketplace`
3. Description: "Regional marketplace web application"
4. Choose **Public** or **Private**
5. **Don't** initialize with README (we already have one)
6. Click **"Create repository"**

### 1.2 Initialize Git and Push

Open PowerShell in your project directory:

```powershell
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Tigray Marketplace"

# Add remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/tigray-marketplace.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Wait for upload to complete. Then refresh your GitHub repository page - you should see all your files!

---

## Step 2: Setup MongoDB Atlas (5 minutes)

### 2.1 Create Cluster

1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Choose **FREE M0 Cluster**
4. Select **AWS** as provider
5. Select region closest to your users (or default)
6. Cluster Name: `tigray-marketplace`
7. Click **"Create"**

Wait 3-5 minutes for cluster creation.

### 2.2 Create Database User

1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `tigray_admin`
5. Click **"Autogenerate Secure Password"** 
6. **COPY AND SAVE THIS PASSWORD!** (you'll need it)
7. Database User Privileges: **Read and write to any database**
8. Click **"Add User"**

### 2.3 Whitelist All IPs (for Render)

1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
4. Click **"Confirm"**

⚠️ Note: For production, you should restrict to specific IPs, but this works for testing.

### 2.4 Get Connection String

1. Click **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Click **"Connect your application"**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://tigray_admin:<password>@tigray-marketplace.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the password you saved in step 2.2
6. Add database name at the end:
   ```
   mongodb+srv://tigray_admin:YOUR_PASSWORD@tigray-marketplace.xxxxx.mongodb.net/tigray_marketplace?retryWrites=true&w=majority
   ```

**SAVE THIS CONNECTION STRING!** We'll use it in Render.

---

## Step 3: Setup Cloudinary (3 minutes)

### 3.1 Create Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up (no credit card needed)
3. Verify your email

### 3.2 Get Credentials

1. Go to Dashboard: https://cloudinary.com/console
2. You'll see:
   - **Cloud name**: (e.g., `dxxxxxxx`)
   - **API Key**: (e.g., `123456789012345`)
   - **API Secret**: Click "eye" icon to reveal

3. Format as:
   ```
   cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ```

   Example:
   ```
   cloudinary://123456789012345:abcdefghijklmnopqrstuv@dxxxxxxx
   ```

**SAVE THIS URL!** We'll use it in Render.

---

## Step 4: Deploy Backend to Render (15 minutes)

### 4.1 Create Render Account

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub**
4. Authorize Render to access your repositories

### 4.2 Create Redis Instance

1. In Render Dashboard, click **"New +"**
2. Select **"Redis"**
3. Name: `tigray-redis`
4. Plan: **Free** (25MB)
5. Click **"Create Redis"**
6. Wait 1-2 minutes for creation
7. Once ready, click on the Redis instance
8. Copy the **"Internal Redis URL"** (looks like: `redis://red-xxxxx:6379`)
9. **SAVE THIS URL!**

### 4.3 Create Backend Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `tigray-marketplace`
3. Configure:
   - **Name**: `tigray-marketplace-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: **Docker**
   - **Plan**: **Free**

4. Click **"Advanced"** to add environment variables:

Click **"Add Environment Variable"** for each:

```
NODE_ENV = production
PORT = 3000
MONGO_URI = [paste your MongoDB Atlas connection string]
REDIS_URL = [paste your Render Redis Internal URL]
JWT_SECRET = [generate random string - see below]
CLOUDINARY_URL = [paste your Cloudinary URL]
FRONTEND_URL = [leave blank for now, we'll add after Vercel]
BACKEND_URL = [leave blank for now]
USE_S3 = false
SMTP_HOST = smtp.mailtrap.io
SMTP_PORT = 2525
SMTP_USER = [optional - for email testing]
SMTP_PASS = [optional - for email testing]
SMTP_FROM = noreply@tigraymarket.com
OTP_DEV_MODE = false
```

**To generate JWT_SECRET**, open PowerShell and run:
```powershell
# Generate random 64-character string
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

5. Click **"Create Web Service"**

Wait 5-10 minutes for deployment. Watch the logs for:
```
✅ MongoDB connected successfully
🚀 Server running on port 3000
```

### 4.4 Get Backend URL

Once deployed:
1. Your backend URL will be: `https://tigray-marketplace-api.onrender.com`
2. Test it: Open `https://tigray-marketplace-api.onrender.com/health` in browser
3. Should show: `{"status":"ok","timestamp":"...","uptime":...}`

**SAVE THIS URL!** We need it for frontend and to update environment variables.

### 4.5 Update Backend Environment Variables

1. Go back to your backend service in Render
2. Click **"Environment"** tab
3. Update these variables:
   - `BACKEND_URL` = `https://tigray-marketplace-api.onrender.com` (your actual URL)
   - `FRONTEND_URL` = (leave blank, we'll update after Vercel)

4. Click **"Save Changes"**

Service will auto-redeploy (takes 2-3 minutes).

### 4.6 Create Worker Service

1. Click **"New +"** → **"Background Worker"**
2. Connect same GitHub repository
3. Configure:
   - **Name**: `tigray-marketplace-worker`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: `worker`
   - **Runtime**: **Docker**
   - **Plan**: **Free**

4. Add **same environment variables as backend** (copy them all)

5. Click **"Create Background Worker"**

Wait 5-10 minutes for deployment.

---

## Step 5: Deploy Frontend to Vercel (5 minutes)

### 5.1 Create Vercel Account

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Sign up with **GitHub**
4. Authorize Vercel

### 5.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Find your GitHub repository: `tigray-marketplace`
3. Click **"Import"**

### 5.3 Configure Project

1. **Framework Preset**: Vite
2. **Root Directory**: Click **"Edit"** → Enter `client`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### 5.4 Add Environment Variables

Click **"Environment Variables"**:

```
VITE_API_URL = https://tigray-marketplace-api.onrender.com
VITE_SOCKET_URL = https://tigray-marketplace-api.onrender.com
```

Replace with your **actual Render backend URL** from Step 4.4!

### 5.5 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Once complete, you'll get a URL like: `https://tigray-marketplace-xxx.vercel.app`

**SAVE THIS URL!**

### 5.6 Test Frontend

1. Open your Vercel URL: `https://tigray-marketplace-xxx.vercel.app`
2. You should see the Tigray Marketplace homepage! 🎉

---

## Step 6: Final Configuration (5 minutes)

### 6.1 Update Backend with Frontend URL

1. Go back to Render dashboard
2. Open your **backend service** (`tigray-marketplace-api`)
3. Go to **"Environment"** tab
4. Update:
   ```
   FRONTEND_URL = https://tigray-marketplace-xxx.vercel.app
   ```
   (your actual Vercel URL)

5. Click **"Save Changes"**
6. Wait for service to redeploy (2-3 minutes)

### 6.2 Update Worker with Frontend URL

1. Open your **worker service** in Render
2. Go to **"Environment"** tab
3. Update `FRONTEND_URL` same as above
4. Click **"Save Changes"**

---

## Step 7: Test Your Live Site! 🚀

### 7.1 Open Your Site

Go to your Vercel URL: `https://tigray-marketplace-xxx.vercel.app`

### 7.2 Create Test Account

1. Click **"Sign Up"**
2. Fill in details:
   - Name: `Test Seller`
   - Email: `seller@test.com`
   - Phone: `+251911234567`
   - Password: `password123`
   - ✅ Check "I want to sell items"
3. Click **"Create Account"**

You should be logged in! ✅

### 7.3 Test Listing Creation

1. Click **"+ Create Listing"**
2. Fill in details
3. Upload an image (Cloudinary!)
4. Click **"Create Listing"**

Success! Your listing should appear! 🎉

### 7.4 Check Socket.io (Real-time)

1. Press **F12** to open browser console
2. You should see: `✅ Socket connected: <socket-id>`

If you see this, real-time features are working! 🔥

### 7.5 Test Order Flow

1. Open an **incognito window**
2. Register as buyer
3. Browse listings
4. Create an order intent
5. Go back to seller window
6. You should see notification! 🔔

---

## 🎉 Congratulations!

Your marketplace is now **LIVE ON THE INTERNET**! 

### Your Live URLs:

- **Frontend**: `https://tigray-marketplace-xxx.vercel.app`
- **Backend**: `https://tigray-marketplace-api.onrender.com`
- **Health Check**: `https://tigray-marketplace-api.onrender.com/health`

### Share Your Site:
- Send the frontend URL to anyone
- They can register, create listings, and use the marketplace!

---

## 🔧 Optional Improvements

### Custom Domain (Optional)

**For Frontend (Vercel):**
1. Buy domain (Namecheap, GoDaddy, etc.)
2. In Vercel → Project Settings → Domains
3. Add your domain
4. Configure DNS as instructed

**For Backend (Render):**
1. In Render → Service → Settings → Custom Domains
2. Add subdomain like `api.yourdomain.com`
3. Configure DNS CNAME

### Create Admin User

1. Go to MongoDB Atlas dashboard
2. Click **"Browse Collections"**
3. Find `users` collection
4. Find your user
5. Click **"Edit"**
6. Update `roles` field to: `["admin", "seller", "buyer"]`
7. Click **"Update"**

Now you have admin access! Go to: `https://your-site.vercel.app/admin`

### Enable Email Notifications

1. Sign up for SendGrid (free tier)
2. Get SMTP credentials
3. Update environment variables in Render:
   - `SMTP_HOST` = `smtp.sendgrid.net`
   - `SMTP_USER` = `apikey`
   - `SMTP_PASS` = your SendGrid API key

---

## 🐛 Troubleshooting

### Frontend loads but shows errors

**Check backend health:**
```
https://your-backend.onrender.com/health
```

Should return JSON. If not, check Render logs.

### Socket.io not connecting

1. Check browser console for errors
2. Verify `VITE_SOCKET_URL` matches backend URL
3. Check `FRONTEND_URL` in Render backend settings
4. Both should use HTTPS (not HTTP)

### Images won't upload

1. Verify Cloudinary URL is correct
2. Check Render backend logs for errors
3. Test Cloudinary credentials directly

### Backend is slow / sleeping

⚠️ **Render free tier sleeps after 15 min of inactivity**

Solutions:
- Upgrade to paid plan ($7/mo)
- Use UptimeRobot to ping every 10 minutes
- Accept 1-2 min delay on first request

### MongoDB connection failed

1. Check connection string format
2. Verify password is correct (no special characters need encoding)
3. Check IP whitelist in MongoDB Atlas
4. Ensure database name is at end of URL

### Worker not processing invoices

1. Check Render worker logs
2. Verify Redis URL is correct
3. Ensure worker is running (not suspended)
4. Check if Chromium installed (should be in Docker)

---

## 📊 Monitor Your Site

### Render Dashboard
- View logs: Render → Service → Logs
- Monitor uptime
- Check deployment status

### Vercel Dashboard
- View deployments
- Check function logs
- Monitor bandwidth

### MongoDB Atlas
- Monitor connections
- Check storage usage
- View slow queries

---

## 💰 Free Tier Limits

| Service | Free Tier | Upgrade Cost |
|---------|-----------|--------------|
| Vercel | 100GB bandwidth/month | $20/mo (Pro) |
| Render Web | Sleeps after 15 min | $7/mo (Starter) |
| Render Worker | Sleeps after 15 min | $7/mo (Starter) |
| Render Redis | 25MB | $10/mo (256MB) |
| MongoDB Atlas | 512MB storage | $9/mo (M10) |
| Cloudinary | 25GB storage, 25GB bandwidth | $89/mo (Plus) |

**Total for production-ready**: ~$40-50/month

---

## 🎯 Next Steps

1. **Test all features**: Registration, listings, orders, messages, disputes
2. **Share with users**: Get feedback
3. **Monitor errors**: Check logs regularly
4. **Set up backups**: MongoDB Atlas automated backups (paid tier)
5. **Configure custom domain**: More professional
6. **Add analytics**: Google Analytics, Mixpanel
7. **Set up monitoring**: Sentry for error tracking

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] MongoDB connection string saved
- [ ] Cloudinary account created
- [ ] Cloudinary URL saved
- [ ] Render Redis created
- [ ] Backend deployed to Render
- [ ] Worker deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Backend URL updated in frontend env vars
- [ ] Frontend URL updated in backend env vars
- [ ] Health check works
- [ ] Can register users
- [ ] Can create listings
- [ ] Can upload images
- [ ] Socket.io connects
- [ ] Can create orders
- [ ] Real-time notifications work
- [ ] Admin user created (optional)

---

**Your site is LIVE!** 🚀🎉

Share it with the world: `https://your-site.vercel.app`

