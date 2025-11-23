# Authentication Setup Guide

## 🔐 Google OAuth & Email OTP Verification Setup

This guide will help you set up Google OAuth and Email OTP verification for your Tigray Marketplace application.

---

## 📋 Table of Contents

1. [Google OAuth Setup](#google-oauth-setup)
2. [Email SMTP Setup](#email-smtp-setup)
3. [Environment Variables](#environment-variables)
4. [Testing the Authentication](#testing-the-authentication)
5. [Troubleshooting](#troubleshooting)

---

## 🔵 Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give your project a name (e.g., "Tigray Marketplace")
4. Click **"Create"**

### Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"Google+ API"**
3. Click on it and click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: Tigray Marketplace
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **"Save and Continue"**
5. **Scopes**: Click "Add or Remove Scopes"
   - Add: `userinfo.email`
   - Add: `userinfo.profile`
6. Click **"Save and Continue"**
7. **Test users** (for development):
   - Add your email and any test user emails
8. Click **"Save and Continue"**

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS" > "OAuth client ID"**
3. Application type: **"Web application"**
4. Name: **"Tigray Marketplace Web Client"**
5. **Authorized JavaScript origins**:
   - Development: `http://localhost:3000`
   - Development: `http://localhost:5173`
   - Production: `https://your-production-domain.com`
6. **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/oauth/google/callback`
   - Production: `https://your-api-domain.com/api/oauth/google/callback`
7. Click **"Create"**
8. **IMPORTANT**: Copy your **Client ID** and **Client Secret** - you'll need these!

### Step 5: Update Environment Variables

Add these to your `server/.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

**For Production**, update the `GOOGLE_CALLBACK_URL` to your production API URL:
```env
GOOGLE_CALLBACK_URL=https://your-api-domain.com/api/oauth/google/callback
```

---

## 📧 Email SMTP Setup

You have several options for email service:

### Option 1: Gmail SMTP (Easy for Development)

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **"2-Step Verification"**
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"
5. Copy the 16-character password

Add to your `server/.env`:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Tigray Market" <noreply@tigraymarket.com>
```

### Option 2: SendGrid (Recommended for Production)

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Use the following settings:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="Tigray Market" <noreply@tigraymarket.com>
```

### Option 3: Amazon SES (Great for Scale)

1. Set up [Amazon SES](https://aws.amazon.com/ses/)
2. Verify your domain
3. Get SMTP credentials

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM="Tigray Market" <noreply@your-verified-domain.com>
```

### Option 4: Development/Testing (No Real Emails)

If you don't want to set up SMTP for development, the system will log OTPs to the console instead:

```env
# Leave SMTP variables empty or unset
# OTPs will be logged to console in development mode
```

---

## ⚙️ Environment Variables

### Complete Server Environment Variables

Create/update `server/.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGO_URI=your-mongodb-connection-string

# JWT
JWT_SECRET=your-jwt-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback

# Session
SESSION_SECRET=your-session-secret-key

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Tigray Market" <noreply@tigraymarket.com>

# OTP Settings
OTP_EXPIRY_MINUTES=10

# Frontend URL (for OAuth redirects)
CLIENT_URL=http://localhost:5173
```

### Complete Client Environment Variables

Create/update `client/.env`:

```env
# API URL
VITE_API_URL=http://localhost:3000
```

---

## 🧪 Testing the Authentication

### Test Email OTP Flow

1. Start your server: `cd server && npm run dev`
2. Start your client: `cd client && npm run dev`
3. Navigate to `http://localhost:5173/register`
4. Fill in the registration form
5. Click **"Continue"**
6. Check your email for the OTP code (or check server console in dev mode)
7. Enter the OTP code
8. Complete registration

### Test Google OAuth Flow

1. Navigate to `http://localhost:5173/register` or `http://localhost:5173/login`
2. Click **"Continue with Google"**
3. Select your Google account
4. Authorize the application
5. You should be redirected back and logged in automatically

---

## 🔍 Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Solution: Make sure the redirect URI in Google Cloud Console exactly matches your `GOOGLE_CALLBACK_URL`
- Check for trailing slashes, http vs https, etc.

**Error: "Access blocked: This app's request is invalid"**
- Solution: Make sure you've enabled the Google+ API
- Verify your OAuth consent screen is properly configured

**Error: "The user is not authorized"**
- Solution: If your app is in testing mode, add the user's email to the test users list in OAuth consent screen

### Email OTP Issues

**Emails not being sent**
- Check your SMTP credentials are correct
- For Gmail, make sure you're using an App Password, not your regular password
- Check server logs for detailed error messages
- Verify your email provider allows SMTP access

**OTP expired or invalid**
- Default expiry is 10 minutes - check `OTP_EXPIRY_MINUTES` in your `.env`
- Make sure your server time is correct
- Each OTP can only be used once

### General Issues

**CORS errors in browser console**
- Make sure `CLIENT_URL` in server `.env` matches your frontend URL
- Check the CORS configuration in `server/src/server.js`

**OAuth callback not working**
- Verify the OAuth callback route is added to `App.jsx`
- Check browser console and server logs for errors
- Make sure the `OAuthCallback.jsx` component exists

---

## 🚀 Production Deployment

### Update Environment Variables

1. **Google OAuth**:
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production API callback URL to "Authorized redirect URIs"
   - Update `GOOGLE_CALLBACK_URL` to production URL

2. **Email SMTP**:
   - Use a production email service (SendGrid, SES, etc.)
   - Update `SMTP_FROM` with your verified domain

3. **Session Secret**:
   - Generate a strong random secret for `SESSION_SECRET`
   - Never use the same secret in development and production

4. **Client URL**:
   - Update `CLIENT_URL` to your production frontend URL

### Example Production .env

```env
NODE_ENV=production
PORT=3000

MONGO_URI=your-production-mongodb-uri

JWT_SECRET=your-production-jwt-secret
SESSION_SECRET=your-production-session-secret

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/oauth/google/callback

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="Tigray Market" <noreply@yourdomain.com>

OTP_EXPIRY_MINUTES=10

CLIENT_URL=https://yourdomain.com
```

---

## 🎉 Success!

If everything is set up correctly, users can now:
- ✅ Register with email and receive OTP verification
- ✅ Login with Google OAuth
- ✅ Have their email verified automatically
- ✅ Experience secure, fraud-resistant authentication

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Nodemailer Documentation](https://nodemailer.com/)

---

## 💡 Need Help?

If you encounter any issues:
1. Check the server logs: `server/logs/combined.log`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Make sure all dependencies are installed: `npm install` in both `server` and `client` directories

---

**Last Updated**: November 2024

