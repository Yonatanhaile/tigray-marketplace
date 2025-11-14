# Environment Variables Setup Guide

## 🔧 Setting Up Your `.env` File

The referral program (and the entire application) requires environment variables to function properly. Follow these steps:

### Step 1: Create `.env` File

Navigate to the `server` directory and create a `.env` file:

```bash
cd server
# Create .env file (Windows PowerShell)
New-Item -Path .env -ItemType File
```

### Step 2: Add Required Variables

Open `server/.env` in your text editor and add the following (minimum required):

```env
# === REQUIRED FOR BASIC FUNCTIONALITY ===

# Database Connection (MongoDB)
MONGO_URI=mongodb://localhost:27017/tigray-marketplace

# JWT Secret (for authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Client URL (Frontend URL - REQUIRED FOR REFERRAL LINKS!)
CLIENT_URL=http://localhost:5173

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

### Step 3: Add Optional Variables

```env
# === OPTIONAL (but recommended) ===

# JWT Token Expiry
JWT_EXPIRES_IN=7d

# Email Configuration (for OTP emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@tigraymarket.com

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_DEV_MODE=true

# Admin Email
ADMIN_EMAIL=admin@tigraymarket.com

# Logging Level
LOG_LEVEL=info
```

### Step 4: Add Image Upload Service (Choose One)

#### Option A: Cloudinary
```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_UPLOAD_PRESET=your_preset
```

#### Option B: AWS S3
```env
USE_S3=true
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
CLOUDFRONT_URL=https://your-cloudfront-url.com
```

---

## 🚀 Quick Fix for Referral Error

If you're getting **"Failed to load referral data"** error, make sure you have:

### 1. CLIENT_URL Variable

In `server/.env`:
```env
CLIENT_URL=http://localhost:5173
```

For production:
```env
CLIENT_URL=https://your-actual-frontend-domain.com
```

### 2. Restart Your Server

After adding/updating `.env`:

```bash
# Stop server (Ctrl+C)
# Then restart:
cd server
npm run dev
```

### 3. Clear Browser Cache

- Open browser DevTools (F12)
- Go to Application tab
- Clear storage
- Refresh page

---

## 🔑 Getting Your Variables

### MongoDB URI

**Option 1: Local MongoDB**
```
mongodb://localhost:27017/tigray-marketplace
```

**Option 2: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/tigray-marketplace
   ```

### JWT Secret

Generate a random secret:

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use any random string generator
# Make it long and complex for security!
```

### Cloudinary

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for free account
3. Get your **CLOUDINARY_URL** from dashboard
4. Create an upload preset (optional but recommended)

### SMTP (Email)

**Using Gmail:**
1. Enable 2FA on your Gmail account
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App Passwords
3. Use that as `SMTP_PASS`

---

## ✅ Verify Setup

After setting up your `.env` file:

### 1. Check Server Starts Without Errors

```bash
cd server
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000 in development mode
```

### 2. Test Referral Dashboard

1. Login to your application
2. Click **"💰 Make Money"** in navbar
3. You should see:
   - Your referral link
   - Stats cards (all showing 0)
   - Payment method form
   - How it works guide

### 3. Test Referral Link

1. Copy your referral link
2. Open in incognito/private window
3. Should show: "🎉 Registering with referral code: XXXXXXXX"
4. Complete registration
5. Go back to referral dashboard - should show 1 referral

---

## 🐛 Troubleshooting

### Error: "Failed to load referral data"

**Cause:** Missing `CLIENT_URL` or server not reading `.env`

**Fix:**
1. Add `CLIENT_URL=http://localhost:5173` to `server/.env`
2. Restart server
3. Clear browser cache

### Error: "Cannot connect to MongoDB"

**Cause:** Wrong `MONGO_URI` or MongoDB not running

**Fix:**
1. Check MongoDB is running: `mongod --version`
2. Verify `MONGO_URI` in `.env`
3. For local: Start MongoDB service
4. For cloud: Check Atlas connection string

### Error: "Invalid token" or Authentication Issues

**Cause:** Missing or wrong `JWT_SECRET`

**Fix:**
1. Add `JWT_SECRET=your-secret-key` to `.env`
2. Make sure it's the same secret if you had users before
3. Restart server
4. Users may need to login again

### Referral Link Shows "localhost" in Production

**Cause:** `CLIENT_URL` still set to localhost

**Fix:**
Update in `server/.env`:
```env
CLIENT_URL=https://your-actual-domain.com
```

---

## 📋 Complete `.env` Template

Here's a complete template you can copy:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/tigray-marketplace

# JWT Authentication
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d

# Client URL (REQUIRED FOR REFERRAL PROGRAM!)
CLIENT_URL=http://localhost:5173

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@tigraymarket.com

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_DEV_MODE=true

# Image Uploads (Cloudinary)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_UPLOAD_PRESET=your_preset

# Admin
ADMIN_EMAIL=admin@tigraymarket.com

# Logging
LOG_LEVEL=info
```

---

## 🎯 Next Steps

After setting up your `.env`:

1. ✅ Restart server
2. ✅ Test referral dashboard access
3. ✅ Test referral link registration
4. ✅ Set up payment method
5. ✅ Start sharing your link!

---

## 📞 Still Having Issues?

Check the browser console (F12) for detailed error messages, and check the server terminal for any startup errors.

Most issues are resolved by:
1. Adding `CLIENT_URL` to `.env`
2. Restarting the server
3. Clearing browser cache

